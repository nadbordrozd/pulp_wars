import { describe, expect, it } from "vitest";
import { CHAPTER_ONE_V7 } from "../../src/campaign/chapter-1";
import {
  campaignFactionChoicesV7,
  campaignMissionCardsV7,
  campaignMissionV7,
  campaignNewlyUnlockedV7,
  campaignNextMissionV7,
  campaignTagNameV7,
  campaignUnlockedFactionsV7,
  type CampaignCompletedV7,
} from "../../src/campaign/progress-v7";
import {
  BrowserPersistenceV7,
  CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
  CampaignProgressStoreV7,
  OBSOLETE_SAVE_STORAGE_KEYS_V7,
  SAVE_STORAGE_KEY_V7,
  cleanupObsoleteRuleset7Saves,
  parseCampaignProgressV7,
  type StorageAdapter,
} from "../../src/persistence/index";

/**
 * Campaign progress and its derived state (`pulp_wars-68k.5`,
 * docs/product/CAMPAIGN.md sections 4 and 7.2).
 */
const AT = "2026-10-03T12:00:00.000Z";
const won = (bestRounds = 12) => ({ firstWonAt: AT, bestRounds });

function stored(completed: CampaignCompletedV7): string {
  return JSON.stringify({
    format: "pulp-wars-campaign-progress",
    version: 1,
    completed,
  });
}

describe("campaign progress store", () => {
  it("owns its own key, which is never a save key", () => {
    expect(CAMPAIGN_PROGRESS_STORAGE_KEY_V7).toBe("pulpWars.campaign.v1");
    expect(
      (OBSOLETE_SAVE_STORAGE_KEYS_V7 as readonly string[]).includes(
        CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
      ),
    ).toBe(false);
    expect(SAVE_STORAGE_KEY_V7).not.toBe(CAMPAIGN_PROGRESS_STORAGE_KEY_V7);
  });

  it("starts empty, records a win, and parses what it wrote", () => {
    const storage = new MemoryStorage();
    const store = new CampaignProgressStoreV7(storage, { now: () => AT });
    expect(store.load()).toEqual({
      kind: "VALID",
      progress: {
        format: "pulp-wars-campaign-progress",
        version: 1,
        completed: {},
      },
    });
    const recorded = store.recordWin("FRONTIER_1", 14);
    expect(recorded).toMatchObject({ ok: true, firstWin: true });
    const source = storage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7);
    expect(JSON.parse(source ?? "")).toEqual({
      format: "pulp-wars-campaign-progress",
      version: 1,
      completed: { FRONTIER_1: { firstWonAt: AT, bestRounds: 14, stars: 1 } },
    });
    expect(parseCampaignProgressV7(source ?? "")).toEqual(store.load());
  });

  it("keeps the most stars of any win, and reads progress written before stars as one star", () => {
    const storage = new MemoryStorage();
    // What a build before stars wrote: still valid, never rewritten on load.
    storage.setItem(
      CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
      stored({ FRONTIER_1: won(14) }),
    );
    const store = new CampaignProgressStoreV7(storage, { now: () => AT });
    expect(store.load()).toMatchObject({
      kind: "VALID",
      progress: { completed: { FRONTIER_1: { bestRounds: 14 } } },
    });
    const best = (): unknown =>
      JSON.parse(storage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7) ?? "")
        .completed.FRONTIER_1;
    expect(
      campaignMissionCardsV7(CHAPTER_ONE_V7, { FRONTIER_1: won(14) })[0],
    ).toMatchObject({ stars: 1, maxStars: 3 });
    // A slower win with more stars raises the stars and keeps the rounds.
    store.recordWin("FRONTIER_1", 20, 3);
    expect(best()).toEqual({ firstWonAt: AT, bestRounds: 14, stars: 3 });
    // A faster win with fewer stars lowers the rounds and keeps the stars.
    store.recordWin("FRONTIER_1", 9, 2);
    expect(best()).toEqual({ firstWonAt: AT, bestRounds: 9, stars: 3 });
    storage.writes = 0;
    store.recordWin("FRONTIER_1", 12, 1);
    expect(storage.writes).toBe(0);
    expect(() => store.recordWin("FRONTIER_1", 12, 4)).toThrow(RangeError);
    expect(() => store.recordWin("FRONTIER_1", 12, 0)).toThrow(RangeError);
    const loaded = store.load();
    if (loaded.kind !== "VALID") throw new Error(loaded.kind);
    expect(
      campaignMissionCardsV7(CHAPTER_ONE_V7, loaded.progress.completed)[0],
    ).toMatchObject({ status: "DONE", stars: 3, maxStars: 3, bestRounds: 9 });
  });

  it("is idempotent: a replayed win keeps the first date and only lowers the best", () => {
    const storage = new MemoryStorage();
    let now = AT;
    const store = new CampaignProgressStoreV7(storage, { now: () => now });
    store.recordWin("FRONTIER_1", 14);
    now = "2026-10-05T09:30:00.000Z";
    const slower = store.recordWin("FRONTIER_1", 20);
    expect(slower).toMatchObject({ ok: true, firstWin: false });
    const before = storage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7);
    expect(JSON.parse(before ?? "").completed.FRONTIER_1).toEqual({
      firstWonAt: AT,
      bestRounds: 14,
      stars: 1,
    });
    // Recording the same win again writes nothing new.
    storage.writes = 0;
    store.recordWin("FRONTIER_1", 14);
    expect(storage.writes).toBe(0);
    store.recordWin("FRONTIER_1", 9);
    expect(
      JSON.parse(storage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7) ?? "")
        .completed.FRONTIER_1,
    ).toEqual({ firstWonAt: AT, bestRounds: 9, stars: 1 });
  });

  it("keeps unknown mission IDs (a mission removed from a later build)", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
      stored({ GONE_MISSION: won(7) }),
    );
    const store = new CampaignProgressStoreV7(storage, { now: () => AT });
    store.recordWin("FRONTIER_1", 11);
    expect(
      Object.keys(
        JSON.parse(storage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7) ?? "")
          .completed,
      ),
    ).toEqual(["FRONTIER_1", "GONE_MISSION"]);
    expect(campaignUnlockedFactionsV7({ GONE_MISSION: won() })).toEqual([
      "ORIGINAL",
    ]);
  });

  it("reports corrupt progress as unreadable and records nothing until reset", () => {
    for (const source of [
      "{ not json",
      "[]",
      JSON.stringify({ format: "other", version: 1, completed: {} }),
      JSON.stringify({
        format: "pulp-wars-campaign-progress",
        version: 2,
        completed: {},
      }),
      JSON.stringify({
        format: "pulp-wars-campaign-progress",
        version: 1,
        completed: {},
        extra: true,
      }),
      stored({ FRONTIER_1: { firstWonAt: AT, bestRounds: 0 } }),
      stored({ FRONTIER_1: { firstWonAt: "yesterday", bestRounds: 3 } }),
      stored({
        FRONTIER_1: { firstWonAt: AT, bestRounds: 3, stars: 4 },
      }),
      stored({
        FRONTIER_1: { firstWonAt: AT, bestRounds: 3, stars: 0 },
      }),
      stored({
        FRONTIER_1: { firstWonAt: AT, bestRounds: 3, glow: true },
      } as never),
      stored({ "frontier one": won() }),
      stored({ ["__proto__"]: won() }),
    ]) {
      const storage = new MemoryStorage();
      storage.setItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7, source);
      const store = new CampaignProgressStoreV7(storage);
      expect(store.load().kind, source).toBe("UNREADABLE");
      expect(store.recordWin("FRONTIER_1", 5)).toMatchObject({
        ok: false,
        kind: "UNREADABLE",
      });
      expect(storage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7)).toBe(source);
      expect(store.reset()).toEqual({ ok: true });
      expect(store.load().kind).toBe("VALID");
    }
  });

  it("guards every storage access", () => {
    const failing: StorageAdapter = {
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
    const store = new CampaignProgressStoreV7(failing);
    expect(store.load()).toMatchObject({ kind: "STORAGE_ERROR" });
    expect(store.recordWin("FRONTIER_1", 5)).toMatchObject({
      ok: false,
      kind: "STORAGE_ERROR",
    });
    expect(store.reset()).toMatchObject({ ok: false });
    const readOnly = new MemoryStorage();
    readOnly.setItem = () => {
      throw new Error("quota");
    };
    expect(
      new CampaignProgressStoreV7(readOnly).recordWin("FRONTIER_1", 5),
    ).toMatchObject({ ok: false, kind: "STORAGE_ERROR" });
    // No storage at all: an empty campaign that keeps nothing.
    const none = new CampaignProgressStoreV7(null);
    expect(none.load().kind).toBe("VALID");
    expect(none.recordWin("FRONTIER_1", 5)).toMatchObject({ ok: true });
    expect(none.reset()).toEqual({ ok: true });
  });

  it("survives save deletion and obsolete-save cleanup", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
      stored({ FRONTIER_1: won() }),
    );
    storage.setItem(SAVE_STORAGE_KEY_V7, "save");
    for (const key of OBSOLETE_SAVE_STORAGE_KEYS_V7)
      storage.setItem(key, "old");
    cleanupObsoleteRuleset7Saves(storage);
    expect(new BrowserPersistenceV7(storage).deleteSave()).toEqual({
      ok: true,
    });
    expect(storage.getItem(SAVE_STORAGE_KEY_V7)).toBeNull();
    expect(storage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7)).toBe(
      stored({ FRONTIER_1: won() }),
    );
  });
});

describe("derived campaign state", () => {
  const statuses = (completed: CampaignCompletedV7) =>
    campaignMissionCardsV7(CHAPTER_ONE_V7, completed).map(
      (card) => card.status,
    );

  it("opens missions in order and keeps completed ones playable", () => {
    const rest = ["LOCKED", "LOCKED", "LOCKED", "LOCKED", "LOCKED", "LOCKED"];
    expect(statuses({})).toEqual([
      "OPEN",
      "LOCKED",
      "LOCKED",
      "LOCKED",
      ...rest,
    ]);
    expect(statuses({ FRONTIER_1: won() })).toEqual([
      "DONE",
      "OPEN",
      "LOCKED",
      "LOCKED",
      ...rest,
    ]);
    expect(
      statuses({
        FRONTIER_1: won(),
        FRONTIER_2: won(),
        FRONTIER_3: won(),
        FRONTIER_4: won(),
      }),
    ).toEqual(["DONE", "DONE", "DONE", "DONE", "OPEN", ...rest.slice(1)]);
    // Every mission of part one is built (missions 5 and 6 by
    // `pulp_wars-v642.2`, 7 and 8 by `.3`, 9 and 10 by `.4`).
    expect(
      campaignMissionCardsV7(CHAPTER_ONE_V7, {}).map((card) => card.built),
    ).toEqual([true, true, true, true, true, true, true, true, true, true]);
  });

  it("describes each card from the mission definitions", () => {
    const cards = campaignMissionCardsV7(CHAPTER_ONE_V7, {
      FRONTIER_1: won(17),
    });
    expect(
      cards.slice(0, 4).map((card) => ({
        id: card.entry.missionId,
        leads: card.leads,
        opponents: card.opponents,
        size: card.size,
        best: card.bestRounds,
      })),
    ).toEqual([
      {
        id: "FRONTIER_1",
        leads: ["ORIGINAL"],
        opponents: ["GOBLIN"],
        size: 11,
        best: 17,
      },
      {
        id: "FRONTIER_2",
        leads: ["ORIGINAL"],
        opponents: ["GOBLIN"],
        size: 14,
        best: null,
      },
      {
        id: "FRONTIER_3",
        leads: ["GOBLIN"],
        opponents: ["UNDEAD"],
        size: 16,
        best: null,
      },
      {
        id: "FRONTIER_4",
        leads: ["ORIGINAL", "GOBLIN"],
        opponents: ["UNDEAD"],
        size: 16,
        best: null,
      },
    ]);
    expect(
      cards.slice(0, 4).map((card) => [card.stars, card.maxStars]),
    ).toEqual([
      [1, 3],
      [0, 3],
      [0, 3],
      [0, 3],
    ]);
    expect(cards.slice(0, 4).every((card) => card.allies.length === 0)).toBe(
      true,
    );
    // A designed mission's card comes from its plan; missions 9 and 10
    // are built, and their cards read the same from their definitions.
    expect(
      cards.slice(4).map((card) => ({
        id: card.entry.missionId,
        leads: card.leads,
        opponents: card.opponents,
        allies: card.allies,
        size: card.size,
      })),
    ).toEqual([
      {
        id: "FRONTIER_5",
        leads: ["UNDEAD"],
        opponents: ["ORIGINAL", "ICE_FOLK"],
        allies: [],
        size: 16,
      },
      {
        id: "FRONTIER_6",
        leads: ["DWARF"],
        opponents: ["ICE_FOLK", "ORIGINAL"],
        allies: [],
        size: 14,
      },
      {
        id: "FRONTIER_7",
        leads: ["ICE_FOLK"],
        opponents: ["DINOSAUR", "ORIGINAL"],
        allies: [],
        size: 20,
      },
      {
        id: "FRONTIER_8",
        leads: ["DINOSAUR"],
        opponents: ["MARTIAN", "ORIGINAL"],
        allies: [],
        size: 16,
      },
      {
        id: "FRONTIER_9",
        leads: ["MARTIAN"],
        opponents: ["UNDEAD", "GOBLIN"],
        allies: ["CANDY"],
        size: 16,
      },
      {
        id: "FRONTIER_10",
        leads: ["ORIGINAL"],
        opponents: ["CULT", "UNDEAD"],
        allies: ["GOBLIN"],
        size: 20,
      },
    ]);
  });

  it("puts an allied AI seat of a mission with teams among the allies", () => {
    // The capture fixture: seat 1 is on your team, seat 2 is the enemy.
    const fixture = {
      ...CHAPTER_ONE_V7,
      missions: [{ ...CHAPTER_ONE_V7.missions[0], missionId: "TEST_CAPTURE" }],
    } as typeof CHAPTER_ONE_V7;
    const [card] = campaignMissionCardsV7(fixture, {});
    expect(card?.allies).toHaveLength(1);
    expect(card?.opponents).toHaveLength(1);
    expect(card?.maxStars).toBe(2);
  });

  it("derives unlocks from completions: Human always, Goblin after 2, Undead after 4", () => {
    expect(campaignUnlockedFactionsV7({})).toEqual(["ORIGINAL"]);
    expect(campaignUnlockedFactionsV7({ FRONTIER_1: won() })).toEqual([
      "ORIGINAL",
    ]);
    expect(
      campaignUnlockedFactionsV7({ FRONTIER_1: won(), FRONTIER_2: won() }),
    ).toEqual(["ORIGINAL", "GOBLIN"]);
    expect(
      campaignUnlockedFactionsV7({
        FRONTIER_1: won(),
        FRONTIER_2: won(),
        FRONTIER_3: won(),
        FRONTIER_4: won(),
      }),
    ).toEqual(["ORIGINAL", "GOBLIN", "UNDEAD"]);
    expect(
      campaignNewlyUnlockedV7(
        { FRONTIER_1: won() },
        { FRONTIER_1: won(), FRONTIER_2: won() },
      ),
    ).toEqual(["GOBLIN"]);
    expect(
      campaignNewlyUnlockedV7(
        { FRONTIER_1: won(), FRONTIER_2: won() },
        { FRONTIER_1: won(), FRONTIER_2: won(9) },
      ),
    ).toEqual([]);
  });

  it("filters a choice mission to unlocked factions; fixed seats need no unlock", () => {
    expect(
      campaignFactionChoicesV7("FRONTIER_4", {
        FRONTIER_1: won(),
        FRONTIER_2: won(),
        FRONTIER_3: won(),
      }),
    ).toEqual(["ORIGINAL", "GOBLIN"]);
    // Goblin not unlocked (mission 2 not won): only Human is offered.
    expect(
      campaignFactionChoicesV7("FRONTIER_4", {
        FRONTIER_1: won(),
        FRONTIER_3: won(),
      }),
    ).toEqual(["ORIGINAL"]);
    // Mission 3 is played as the Goblins whatever is unlocked.
    expect(campaignFactionChoicesV7("FRONTIER_3", {})).toEqual(["GOBLIN"]);
    expect(campaignFactionChoicesV7("NOT_A_MISSION", {})).toEqual([]);
  });

  it("finds chapter missions and the next one; hidden fixtures belong to none", () => {
    expect(campaignMissionV7("FRONTIER_2")?.entry.number).toBe(2);
    expect(campaignMissionV7("TEST_GROUNDS")).toBeNull();
    expect(campaignNextMissionV7("FRONTIER_1")?.missionId).toBe("FRONTIER_2");
    expect(campaignNextMissionV7("FRONTIER_4")?.missionId).toBe("FRONTIER_5");
    expect(campaignNextMissionV7("FRONTIER_5")?.missionId).toBe("FRONTIER_6");
    expect(campaignNextMissionV7("FRONTIER_6")?.missionId).toBe("FRONTIER_7");
    // Missions 9 and 10 are built (`pulp_wars-v642.4`); after the last
    // there is nothing to go on to.
    expect(campaignNextMissionV7("FRONTIER_8")?.missionId).toBe("FRONTIER_9");
    expect(campaignNextMissionV7("FRONTIER_9")?.missionId).toBe("FRONTIER_10");
    expect(campaignNextMissionV7("FRONTIER_10")).toBeNull();
    expect(campaignTagNameV7("FRONTIER_2", "WARRENS")).toBe("the Warrens");
    expect(campaignTagNameV7("TEST_ESCORT", "SOME_PLACE")).toBe("some place");
    expect(campaignNextMissionV7("TEST_GROUNDS")).toBeNull();
  });
});

class MemoryStorage implements StorageAdapter {
  readonly #values = new Map<string, string>();
  writes = 0;

  getItem(key: string): string | null {
    return this.#values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.writes += 1;
    this.#values.set(key, value);
  }

  removeItem(key: string): void {
    this.#values.delete(key);
  }
}
