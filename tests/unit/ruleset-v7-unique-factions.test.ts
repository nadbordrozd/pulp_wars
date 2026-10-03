import { describe, expect, it } from "vitest";
import { Ruleset7BrowserController } from "../../src/app/index";
import {
  FACTION_IDS_V7,
  RULESET_7_ID,
  allowDuplicateFactionsV7,
  createInitialMapStateV7,
  createPlayableGameV7,
  createReplayV7,
  distinctFactionsV7,
  duplicateFactionV7,
  generateInitialMapV7,
  parseGameStateV7,
  parseMatchSetupV7,
  validateMatchSetupV7,
  type FactionIdV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import { runAiBatchV7, runAiMatchV7 } from "../../src/headless/v7";
import {
  SAVE_STORAGE_KEY_V7,
  createSaveEnvelopeV7,
  parseSaveV7,
  type StorageAdapter,
} from "../../src/persistence/index";

// The unique-factions rule (pulp_wars-w5j.1,
// docs/product/RULESET_7_UNIQUE_FACTIONS.md): no two seats may play the same
// faction; headless and test setups may lift it with
// `allowDuplicateFactions: true`, which the browser never accepts.

function setupOf(
  factions: readonly FactionIdV7[],
  mapType: MatchSetupV7["mapType"] = "DRY_LAND",
): MatchSetupV7 {
  const aiCount = (factions.length - 1) as 1 | 2 | 3;
  const size =
    mapType === "SHOWCASE" ? 16 : aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
  return {
    rulesetId: RULESET_7_ID,
    seed: 5,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    mapType,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
  };
}

class MemoryStorage implements StorageAdapter {
  readonly values = new Map<string, string>();
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

describe("ruleset-7 unique factions: engine setup validation", () => {
  it("refuses a repeated faction with DUPLICATE_FACTION on every map type", () => {
    for (const mapType of [
      "DRY_LAND",
      "PANGEA",
      "CONTINENTS",
      "ARCHIPELAGO",
      "LAKES",
      "SHOWCASE",
    ] as const) {
      const setup = setupOf(["UNDEAD", "ORIGINAL", "UNDEAD"], mapType);
      expect(validateMatchSetupV7(setup)).toEqual({
        ok: false,
        error: {
          code: "DUPLICATE_FACTION",
          params: { faction: "UNDEAD", seats: [0, 2] },
        },
      });
      expect(parseMatchSetupV7(setup)).toBeNull();
      expect(generateInitialMapV7(setup)).toMatchObject({
        ok: false,
        error: { code: "DUPLICATE_FACTION" },
      });
      expect(createInitialMapStateV7(setup)).toMatchObject({
        ok: false,
        error: { code: "DUPLICATE_FACTION" },
      });
      expect(createPlayableGameV7(setup)).toMatchObject({
        ok: false,
        error: {
          code: "DUPLICATE_FACTION",
          params: { faction: "UNDEAD", seats: [0, 2] },
        },
      });
      expect(() => createReplayV7(setup)).toThrow("DUPLICATE_FACTION");
    }
  });

  it("reports the first repeated faction in seat order with all its seats", () => {
    expect(
      duplicateFactionV7(["GOBLIN", "MARTIAN", "MARTIAN", "GOBLIN"]),
    ).toEqual({ faction: "GOBLIN", seats: [0, 3] });
    expect(
      validateMatchSetupV7(setupOf(["ICE_FOLK", "ICE_FOLK", "ICE_FOLK"])),
    ).toMatchObject({
      error: {
        code: "DUPLICATE_FACTION",
        params: { faction: "ICE_FOLK", seats: [0, 1, 2] },
      },
    });
    expect(duplicateFactionV7(["ORIGINAL", "UNDEAD"])).toBeNull();
  });

  it("keeps INVALID_SETUP for every other refusal", () => {
    expect(
      validateMatchSetupV7({
        ...setupOf(["ORIGINAL", "ORIGINAL"]),
        factions: ["ORIGINAL", "CANDY"],
      }),
    ).toEqual({ ok: false, error: { code: "INVALID_SETUP", params: {} } });
    expect(
      validateMatchSetupV7({ ...setupOf(["ORIGINAL", "UNDEAD"]), width: 12 }),
    ).toMatchObject({ error: { code: "INVALID_SETUP" } });
  });

  it("accepts distinct factions, the Showcase included, without the option", () => {
    for (const factions of [
      ["ORIGINAL", "UNDEAD"],
      ["MARTIAN", "ICE_FOLK", "DINOSAUR"],
      ["ICE_FOLK", "MARTIAN", "DINOSAUR", "GOBLIN"],
    ] as const) {
      const setup = setupOf(factions);
      expect(validateMatchSetupV7(setup)).toEqual({ ok: true, setup });
      const created = createPlayableGameV7(setup);
      if (!created.ok) throw new Error(created.error.code);
      expect(created.state.setup).not.toHaveProperty("allowDuplicateFactions");
      expect(created.state.players.map((player) => player.faction)).toEqual(
        factions,
      );
    }
    const showcase = setupOf(
      ["DINOSAUR", "ORIGINAL", "UNDEAD", "GOBLIN"],
      "SHOWCASE",
    );
    const created = createPlayableGameV7(showcase);
    expect(created.ok).toBe(true);
    expect(
      createPlayableGameV7(
        setupOf(["DINOSAUR", "ORIGINAL", "ORIGINAL", "ORIGINAL"], "SHOWCASE"),
      ),
    ).toMatchObject({
      ok: false,
      error: {
        code: "DUPLICATE_FACTION",
        params: { faction: "ORIGINAL", seats: [1, 2, 3] },
      },
    });
  });
});

describe("ruleset-7 unique factions: the headless and test mirror option", () => {
  it("lifts the rule only with allowDuplicateFactions: true, kept in state", () => {
    const mirror = allowDuplicateFactionsV7(setupOf(["ORIGINAL", "ORIGINAL"]));
    expect(mirror.allowDuplicateFactions).toBe(true);
    expect(parseMatchSetupV7(mirror)).toEqual(mirror);
    for (const value of [false, "true", 1, null])
      expect(
        validateMatchSetupV7({ ...mirror, allowDuplicateFactions: value }),
      ).toMatchObject({ error: { code: "INVALID_SETUP" } });
    const created = createPlayableGameV7(mirror);
    if (!created.ok) throw new Error(created.error.code);
    expect(created.state.setup.allowDuplicateFactions).toBe(true);
    expect(parseGameStateV7(created.state)).not.toBeNull();
    // The same state without the option no longer parses.
    const { allowDuplicateFactions, ...plain } = created.state.setup;
    expect(allowDuplicateFactions).toBe(true);
    expect(parseGameStateV7({ ...created.state, setup: plain })).toBeNull();
    // A distinct setup with the option plays exactly as without it.
    const distinct = setupOf(["ORIGINAL", "UNDEAD"]);
    const withOption = createPlayableGameV7(allowDuplicateFactionsV7(distinct));
    const without = createPlayableGameV7(distinct);
    if (!withOption.ok || !without.ok) throw new Error("create failed");
    expect({
      ...withOption.state,
      setup: without.state.setup,
    }).toEqual(without.state);
  });

  it("runs mirror matches headless only through the option", () => {
    expect(() =>
      runAiMatchV7(setupOf(["UNDEAD", "UNDEAD"]), { maxCommands: 3 }),
    ).toThrow("CREATE_REJECTED:DUPLICATE_FACTION");
    expect(
      runAiMatchV7(allowDuplicateFactionsV7(setupOf(["UNDEAD", "UNDEAD"])), {
        maxCommands: 3,
      }).acceptedCommands,
    ).toBe(3);
  });

  it("defaults a headless batch to distinct factions and gates mirrors", async () => {
    const batch = await runAiBatchV7({
      seeds: [0],
      aiCounts: [1, 3],
      maxCommands: 1,
    });
    expect(batch.entries.map((entry) => entry.factions)).toEqual([
      ["ORIGINAL", "UNDEAD"],
      ["ORIGINAL", "UNDEAD", "GOBLIN", "DINOSAUR"],
    ]);
    await expect(
      runAiBatchV7({
        seeds: [0],
        aiCounts: [1],
        factions: ["GOBLIN", "GOBLIN"],
        maxCommands: 1,
      }),
    ).rejects.toThrow("CREATE_REJECTED:DUPLICATE_FACTION");
    const mirror = await runAiBatchV7({
      seeds: [0],
      aiCounts: [1],
      factions: ["GOBLIN", "GOBLIN"],
      allowDuplicateFactions: true,
      maxCommands: 1,
    });
    expect(mirror.entries[0]?.factions).toEqual(["GOBLIN", "GOBLIN"]);
    expect(mirror.entries[0]?.commands).toBe(1);
  });

  it("assigns distinct factions deterministically for 2 to 4 seats", () => {
    expect(distinctFactionsV7(2)).toEqual(["ORIGINAL", "UNDEAD"]);
    expect(distinctFactionsV7(4)).toEqual([
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
    ]);
    expect(
      distinctFactionsV7(4, ["GOBLIN", "GOBLIN", undefined, "ORIGINAL"]),
    ).toEqual(["GOBLIN", "ORIGINAL", "UNDEAD", "DINOSAUR"]);
    // Every preference list for every seat count has a legal assignment.
    for (const seats of [2, 3, 4])
      for (const preferred of FACTION_IDS_V7) {
        const assigned = distinctFactionsV7(
          seats,
          Array.from({ length: seats }, () => preferred),
        );
        expect(duplicateFactionV7(assigned)).toBeNull();
        expect(assigned[0]).toBe(preferred);
      }
    expect(() => distinctFactionsV7(FACTION_IDS_V7.length + 1)).toThrow(
      RangeError,
    );
  });
});

describe("ruleset-7 unique factions: the browser never runs a mirror match", () => {
  it("refuses a launch that repeats a faction or carries the option", async () => {
    const controller = new Ruleset7BrowserController();
    expect(
      await controller.launch(setupOf(["MARTIAN", "MARTIAN"])),
    ).toMatchObject({
      ok: false,
      code: "DUPLICATE_FACTION",
      diagnostic: "Every player must play a different faction.",
    });
    expect(
      await controller.launch(
        allowDuplicateFactionsV7(setupOf(["ORIGINAL", "UNDEAD"])),
      ),
    ).toMatchObject({ ok: false, code: "INVALID_SETUP" });
    expect(
      await controller.launch(setupOf(["MARTIAN", "ORIGINAL"])),
    ).toMatchObject({ ok: true });
    controller.destroy();
  });

  it("refuses to resume a save that carries the option", () => {
    const setup = allowDuplicateFactionsV7(setupOf(["ORIGINAL", "ORIGINAL"]));
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const save = createSaveEnvelopeV7(
      { state: created.state, replay: createReplayV7(setup) },
      "2026-10-03T12:00:00.000Z",
    );
    // The save format itself is a test and headless tool.
    expect(parseSaveV7(JSON.stringify(save)).kind).toBe("VALID");
    const storage = new MemoryStorage();
    storage.setItem(SAVE_STORAGE_KEY_V7, JSON.stringify(save));
    const controller = new Ruleset7BrowserController({ storage });
    expect(controller.snapshot()).toMatchObject({
      phase: "RECOVERY",
      recovery: {
        kind: "CORRUPT",
        diagnostic:
          "Saved match repeats a faction; every player must play a different faction.",
      },
    });
    controller.destroy();
  });
});
