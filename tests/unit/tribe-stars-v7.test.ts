import { describe, expect, it } from "vitest";
import {
  CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
  OBSOLETE_SAVE_STORAGE_KEYS_V7,
  SAVE_STORAGE_KEY_V7,
  TRIBE_STARS_STORAGE_KEY_V7,
  TribeStarsStoreV7,
  cleanupObsoleteRuleset7Saves,
  mergeTribeStarRecordV7,
  parseTribeStarsV7,
  tribeStarResultV7,
  type StorageAdapter,
  type TribeStarResultV7,
} from "../../src/persistence/index";
import {
  GAME_MODE_STORAGE_KEY_V7,
  loadGameModePreferenceV7,
  storeGameModePreferenceV7,
} from "../../src/app/game-mode-preference-v7";
import {
  gameModeLineV7,
  ratingMultipleV7,
  starAwardNewBestV7,
  starRulesV7,
  tribeCardLabelV7,
} from "../../src/render/tribe-stars-presentation-v7";
import { type GameStateV7 } from "../../src/engine/index";
import { Ruleset7BrowserController } from "../../src/app/v7-controller";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  applyOkV7,
  goblinArenaV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";

/**
 * Tribe stars (`pulp_wars-kaw6.4`, docs/product/RULESET_7_SCORE_AND_STARS.md
 * sections 6 to 8, test 7): the records store, never lowered, per mode,
 * failing storage, and what a finished match records.
 */
const AT = "2026-10-08T12:00:00.000Z";
const LATER = "2026-10-09T09:30:00.000Z";

function result(overrides: Partial<TribeStarResultV7> = {}): TribeStarResultV7 {
  return {
    gameMode: "DOMINATION",
    faction: "GOBLIN",
    stars: 2,
    glow: false,
    ratingHundredths: 241,
    ...overrides,
  };
}

class MemoryStorage implements StorageAdapter {
  readonly values = new Map<string, string>();
  writes = 0;
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.writes += 1;
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const blocked: StorageAdapter = {
  getItem: () => {
    throw new Error("denied");
  },
  setItem: () => {
    throw new Error("denied");
  },
  removeItem: () => {
    throw new Error("denied");
  },
};

describe("tribe stars store", () => {
  it("owns its own key, which is never a save key", () => {
    expect(TRIBE_STARS_STORAGE_KEY_V7).toBe("pulpWars.stars.v1");
    expect(
      (OBSOLETE_SAVE_STORAGE_KEYS_V7 as readonly string[]).includes(
        TRIBE_STARS_STORAGE_KEY_V7,
      ),
    ).toBe(false);
    expect([
      SAVE_STORAGE_KEY_V7,
      CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
    ]).not.toContain(TRIBE_STARS_STORAGE_KEY_V7);
  });

  it("survives the obsolete-save cleanup that runs on every start", () => {
    const storage = new MemoryStorage();
    new TribeStarsStoreV7(storage, { now: () => AT }).record(result());
    for (const key of OBSOLETE_SAVE_STORAGE_KEYS_V7) storage.setItem(key, "x");
    const source = storage.getItem(TRIBE_STARS_STORAGE_KEY_V7);
    cleanupObsoleteRuleset7Saves(storage);
    expect(storage.getItem(TRIBE_STARS_STORAGE_KEY_V7)).toBe(source);
  });

  it("starts empty, records a first win in the spec's shape, and parses what it wrote", () => {
    const storage = new MemoryStorage();
    const store = new TribeStarsStoreV7(storage, { now: () => AT });
    const empty = store.load();
    expect(empty).toEqual({
      kind: "VALID",
      stars: {
        format: "pulp-wars-tribe-stars",
        version: 1,
        modes: { DOMINATION: {}, PERFECTION: {} },
      },
    });
    const recorded = store.record(result());
    expect(recorded).toMatchObject({ ok: true, improved: true, before: null });
    const source = storage.getItem(TRIBE_STARS_STORAGE_KEY_V7) ?? "";
    expect(JSON.parse(source)).toEqual({
      format: "pulp-wars-tribe-stars",
      version: 1,
      modes: {
        DOMINATION: {
          GOBLIN: {
            stars: 2,
            glow: false,
            bestRating: 2.41,
            firstAt: AT,
            updatedAt: AT,
          },
        },
        PERFECTION: {},
      },
    });
    expect(parseTribeStarsV7(source)).toEqual(store.load());
  });

  it("never lowers a record: stars and rating take the larger, the glow either", () => {
    const storage = new MemoryStorage();
    let now = AT;
    const store = new TribeStarsStoreV7(storage, { now: () => now });
    store.record(result({ stars: 3, glow: true, ratingHundredths: 210 }));
    now = LATER;
    const worse = store.record(result({ stars: 1, ratingHundredths: 120 }));
    expect(worse).toMatchObject({ ok: true, improved: false });
    const kept = store.load();
    if (kept.kind !== "VALID") throw new Error("unreadable");
    expect(kept.stars.modes.DOMINATION?.GOBLIN).toEqual({
      stars: 3,
      glow: true,
      bestRating: 2.1,
      firstAt: AT,
      updatedAt: AT,
    });
    // A better rating alone improves the record and moves updatedAt only.
    const better = store.record(result({ stars: 2, ratingHundredths: 305 }));
    expect(better).toMatchObject({
      ok: true,
      improved: true,
      before: { stars: 3, bestRating: 2.1 },
      record: {
        stars: 3,
        glow: true,
        bestRating: 3.05,
        firstAt: AT,
        updatedAt: LATER,
      },
    });
  });

  it("is idempotent: recording the same result twice writes once", () => {
    const storage = new MemoryStorage();
    const store = new TribeStarsStoreV7(storage, { now: () => AT });
    store.record(result());
    const source = storage.getItem(TRIBE_STARS_STORAGE_KEY_V7);
    const writes = storage.writes;
    expect(store.record(result())).toMatchObject({ ok: true, improved: false });
    expect(storage.writes).toBe(writes);
    expect(storage.getItem(TRIBE_STARS_STORAGE_KEY_V7)).toBe(source);
  });

  it("keeps each mode's records apart", () => {
    const store = new TribeStarsStoreV7(new MemoryStorage(), { now: () => AT });
    store.record(result({ gameMode: "DOMINATION", stars: 1 }));
    store.record(result({ gameMode: "PERFECTION", stars: 3, glow: true }));
    const loaded = store.load();
    if (loaded.kind !== "VALID") throw new Error("unreadable");
    expect(loaded.stars.modes.DOMINATION?.GOBLIN).toMatchObject({
      stars: 1,
      glow: false,
    });
    expect(loaded.stars.modes.PERFECTION?.GOBLIN).toMatchObject({
      stars: 3,
      glow: true,
    });
    expect(loaded.stars.modes.DOMINATION?.UNDEAD).toBeUndefined();
  });

  it("keeps unknown modes and tribes through a write", () => {
    const storage = new MemoryStorage();
    const future = {
      stars: 2,
      glow: false,
      bestRating: 1.9,
      firstAt: AT,
      updatedAt: AT,
    };
    storage.setItem(
      TRIBE_STARS_STORAGE_KEY_V7,
      JSON.stringify({
        format: "pulp-wars-tribe-stars",
        version: 1,
        modes: {
          DOMINATION: { CULTIST: future },
          BLITZ: { GOBLIN: future },
        },
      }),
    );
    const store = new TribeStarsStoreV7(storage, { now: () => LATER });
    expect(store.record(result())).toMatchObject({ ok: true });
    const written = JSON.parse(
      storage.getItem(TRIBE_STARS_STORAGE_KEY_V7) ?? "",
    ) as { modes: Record<string, Record<string, unknown>> };
    expect(written.modes.DOMINATION?.CULTIST).toEqual(future);
    expect(written.modes.BLITZ?.GOBLIN).toEqual(future);
    expect(written.modes.DOMINATION?.GOBLIN).toMatchObject({ stars: 2 });
  });

  it("records nothing while records are unreadable, and reset clears them", () => {
    for (const source of [
      "{ not json",
      JSON.stringify({ format: "other", version: 1, modes: {} }),
      JSON.stringify({
        format: "pulp-wars-tribe-stars",
        version: 2,
        modes: {},
      }),
      JSON.stringify({
        format: "pulp-wars-tribe-stars",
        version: 1,
        modes: { DOMINATION: { GOBLIN: { stars: 4 } } },
      }),
      JSON.stringify({
        format: "pulp-wars-tribe-stars",
        version: 1,
        modes: {
          DOMINATION: {
            GOBLIN: {
              stars: 0,
              glow: false,
              bestRating: 1,
              firstAt: AT,
              updatedAt: AT,
            },
          },
        },
      }),
    ]) {
      const storage = new MemoryStorage();
      storage.setItem(TRIBE_STARS_STORAGE_KEY_V7, source);
      const store = new TribeStarsStoreV7(storage, { now: () => AT });
      expect(store.load().kind, source).toBe("UNREADABLE");
      expect(store.record(result())).toMatchObject({
        ok: false,
        kind: "UNREADABLE",
      });
      expect(storage.getItem(TRIBE_STARS_STORAGE_KEY_V7)).toBe(source);
      expect(store.reset()).toEqual({ ok: true });
      expect(storage.getItem(TRIBE_STARS_STORAGE_KEY_V7)).toBeNull();
      expect(store.record(result())).toMatchObject({
        ok: true,
        improved: true,
      });
    }
  });

  it("survives blocked storage: every access fails softly and never throws", () => {
    const store = new TribeStarsStoreV7(blocked, { now: () => AT });
    expect(store.load()).toMatchObject({ kind: "STORAGE_ERROR" });
    expect(store.record(result())).toMatchObject({
      ok: false,
      kind: "STORAGE_ERROR",
    });
    expect(store.reset()).toMatchObject({ ok: false });
    // Reads that work but writes that fail report the write.
    const readOnly: StorageAdapter = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => undefined,
    };
    expect(
      new TribeStarsStoreV7(readOnly, { now: () => AT }).record(result()),
    ).toMatchObject({ ok: false, kind: "STORAGE_ERROR" });
    // No storage at all keeps nothing and fails nothing.
    const none = new TribeStarsStoreV7(null, { now: () => AT });
    expect(none.record(result())).toMatchObject({ ok: true, improved: true });
    expect(none.load()).toMatchObject({ kind: "VALID" });
  });

  it("merges a record purely", () => {
    const first = mergeTribeStarRecordV7(
      null,
      { stars: 1, glow: false, ratingHundredths: 99 },
      AT,
    );
    expect(first).toEqual({
      stars: 1,
      glow: false,
      bestRating: 0.99,
      firstAt: AT,
      updatedAt: AT,
    });
    expect(
      mergeTribeStarRecordV7(
        first,
        { stars: 1, glow: false, ratingHundredths: 50 },
        LATER,
      ),
    ).toEqual(first);
  });
});

describe("tribe stars: what a finished game records (section 6)", () => {
  const at = (x: number, y: number) => ({ x, y });

  /** A hand-built two-seat match the human wins with one capture. */
  function won(
    options: {
      readonly rivalPeak?: number;
      readonly flawless?: boolean;
      readonly mapType?: "SHOWCASE";
    } = {},
  ): GameStateV7 {
    const base = goblinArenaV7(
      ["GOBLIN", "UNDEAD"],
      [{ seat: 0, role: "FIGHTER", at: at(2, 8), captureEligible: true }],
      { techs: { 1: [] } },
    );
    const human = seatIdV7(base, 0);
    const rival = seatIdV7(base, 1);
    const state = checkedV7({
      ...base,
      round: 12,
      scoreLedger: base.scoreLedger.map((entry) =>
        entry.playerId === rival
          ? { ...entry, peakScore: options.rivalPeak ?? 77 }
          : { ...entry, flawless: options.flawless ?? true },
      ),
    });
    const after = applyOkV7(state, human, {
      kind: "CAPTURE",
      unitId: unitAtV7(state, at(2, 8)).id,
    }).state;
    return options.mapType === undefined
      ? after
      : { ...after, setup: { ...after.setup, mapType: options.mapType } };
  }

  it("records the human's tribe, the mode, and the grade of a win", () => {
    const state = won({ flawless: false, rivalPeak: 10_000 });
    expect(state.outcome?.kind).toBe("VICTORY");
    expect(tribeStarResultV7(state)).toEqual({
      gameMode: "DOMINATION",
      faction: "GOBLIN",
      stars: 1,
      glow: false,
      ratingHundredths: expect.any(Number) as number,
    });
    const flawless = tribeStarResultV7(won({ rivalPeak: 20 }));
    expect(flawless).toMatchObject({ stars: 3, glow: true });
  });

  it("records nothing for a defeat or the Showcase", () => {
    const state = won();
    const human = state.humanPlayerId;
    const rival = state.players.find((player) => player.id !== human)?.id;
    if (rival === undefined) throw new Error("no rival");
    expect(
      tribeStarResultV7({
        ...state,
        outcome: { kind: "DEFEAT", humanId: human, defeatedByPlayerId: rival },
      }),
    ).toBeNull();
    expect(tribeStarResultV7(won({ mapType: "SHOWCASE" }))).toBeNull();
  });
});

describe("browser controller tribe stars", () => {
  it("reads the records, reports unreadable and blocked storage, and resets", async () => {
    const storage = new MemoryStorage();
    new TribeStarsStoreV7(storage, { now: () => AT }).record(result());
    const controller = new Ruleset7BrowserController({ storage });
    expect(controller.tribeStars()).toMatchObject({
      status: "OK",
      records: { DOMINATION: { GOBLIN: { stars: 2 } }, PERFECTION: {} },
      lastAward: null,
      diagnostic: null,
    });
    // "Delete save" never touches the records.
    await controller.deleteStoredSave();
    expect(storage.getItem(TRIBE_STARS_STORAGE_KEY_V7)).not.toBeNull();
    storage.setItem(TRIBE_STARS_STORAGE_KEY_V7, "{ not json");
    expect(controller.tribeStars()).toMatchObject({
      status: "UNREADABLE",
      records: { DOMINATION: {}, PERFECTION: {} },
    });
    expect(controller.resetTribeStars()).toBe(true);
    expect(storage.getItem(TRIBE_STARS_STORAGE_KEY_V7)).toBeNull();
    expect(controller.tribeStars().status).toBe("OK");
    controller.destroy();
    const restricted = new Ruleset7BrowserController({ storage: blocked });
    expect(restricted.tribeStars().status).toBe("UNAVAILABLE");
    expect(restricted.resetTribeStars()).toBe(false);
    restricted.destroy();
  });
});

describe("game mode preference", () => {
  it("remembers the mode and defaults to Domination, even without storage", () => {
    const storage = new MemoryStorage();
    expect(loadGameModePreferenceV7(storage)).toBe("DOMINATION");
    expect(storeGameModePreferenceV7(storage, "PERFECTION")).toBe(true);
    expect(storage.getItem(GAME_MODE_STORAGE_KEY_V7)).toBe("PERFECTION");
    expect(loadGameModePreferenceV7(storage)).toBe("PERFECTION");
    storage.setItem(GAME_MODE_STORAGE_KEY_V7, "SOMETHING");
    expect(loadGameModePreferenceV7(storage)).toBe("DOMINATION");
    expect(loadGameModePreferenceV7(blocked)).toBe("DOMINATION");
    expect(storeGameModePreferenceV7(blocked, "PERFECTION")).toBe(false);
    expect(loadGameModePreferenceV7(null)).toBe("DOMINATION");
  });
});

describe("tribe stars text (sections 7 and 8)", () => {
  it("labels cards, modes and the star rules", () => {
    expect(tribeCardLabelV7("DWARF", 2, false, "DOMINATION")).toBe(
      "Dwarf, 2 of 3 stars in Domination",
    );
    expect(tribeCardLabelV7("ICE_FOLK", 3, true, "PERFECTION")).toBe(
      "Ice Folk, 3 of 3 stars in Perfection, flawless",
    );
    expect(gameModeLineV7("DOMINATION")).toBe(
      "Win by taking every rival's last city.",
    );
    expect(gameModeLineV7("PERFECTION")).toBe(
      "30 rounds. The highest score wins.",
    );
    expect(ratingMultipleV7(150)).toBe("1.5");
    expect(ratingMultipleV7(175)).toBe("1.75");
    expect(ratingMultipleV7(200)).toBe("2");
    expect(starRulesV7(3)).toEqual([
      "★ Win.",
      "★★ Win with 1.5 times the best rival's score.",
      "★★★ Win with 2 times the best rival's score on the hardest difficulty, and in Domination take every rival's last city yourself.",
    ]);
    expect(starRulesV7(1)[2]).toContain("3 times");
    expect(starRulesV7(2)[1]).toContain("1.75 times");
    expect(starAwardNewBestV7("GOBLIN", "DOMINATION")).toBe(
      "New best for the Goblins in Domination",
    );
  });
});
