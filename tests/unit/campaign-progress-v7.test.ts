import { describe, expect, it } from "vitest";
import type { CampaignChapterV7 } from "../../src/campaign/chapter";
import { CHAPTER_HUMANS_V7 } from "../../src/campaign/chapter-humans";
import {
  campaignFactionChoicesV7,
  campaignMissionCardsV7,
  campaignMissionV7,
  campaignNextMissionV7,
  campaignPlatesV7,
  campaignTagNameV7,
  type CampaignCompletedV7,
} from "../../src/campaign/progress-v7";
import {
  BrowserPersistenceV7,
  CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
  CampaignProgressStoreV7,
  LEGACY_CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
  OBSOLETE_SAVE_STORAGE_KEYS_V7,
  SAVE_STORAGE_KEY_V7,
  campaignCompletionsV7,
  cleanupObsoleteRuleset7Saves,
  parseCampaignProgressV7,
  type StorageAdapter,
} from "../../src/persistence/index";

/**
 * Campaign progress and its derived state (`pulp_wars-68k.5`,
 * docs/product/CAMPAIGN.md sections 4 and 7.2), per campaign since
 * `pulp_wars-hmyk.3` (section 14.4).
 */
const AT = "2026-10-03T12:00:00.000Z";
const won = (bestRounds = 12) => ({ firstWonAt: AT, bestRounds });

/** Version 1, as builds before `pulp_wars-hmyk.3` wrote it. */
function storedV1(completed: CampaignCompletedV7): string {
  return JSON.stringify({
    format: "pulp-wars-campaign-progress",
    version: 1,
    completed,
  });
}

function storedV2(
  campaigns: Readonly<Record<string, CampaignCompletedV7>>,
): string {
  return JSON.stringify({
    format: "pulp-wars-campaign-progress",
    version: 2,
    campaigns: Object.fromEntries(
      Object.entries(campaigns).map(([id, completed]) => [id, { completed }]),
    ),
  });
}

/** The completions of one campaign as last written. */
function written(
  storage: StorageAdapter,
  campaign = "HUMANS",
): Record<string, unknown> {
  return JSON.parse(storage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7) ?? "")
    .campaigns[campaign].completed;
}

describe("campaign progress store", () => {
  it("owns its own keys, which are never save keys", () => {
    expect(CAMPAIGN_PROGRESS_STORAGE_KEY_V7).toBe("pulpWars.campaign.v2");
    expect(LEGACY_CAMPAIGN_PROGRESS_STORAGE_KEY_V7).toBe(
      "pulpWars.campaign.v1",
    );
    for (const key of [
      CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
      LEGACY_CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
    ]) {
      expect(
        (OBSOLETE_SAVE_STORAGE_KEYS_V7 as readonly string[]).includes(key),
      ).toBe(false);
      expect(SAVE_STORAGE_KEY_V7).not.toBe(key);
    }
  });

  it("starts empty, records a win under its campaign, and parses what it wrote", () => {
    const storage = new MemoryStorage();
    const store = new CampaignProgressStoreV7(storage, { now: () => AT });
    expect(store.load()).toEqual({
      kind: "VALID",
      progress: {
        format: "pulp-wars-campaign-progress",
        version: 2,
        campaigns: {},
      },
    });
    const recorded = store.recordWin("HUMANS", "HUMAN_1", 14);
    expect(recorded).toMatchObject({ ok: true, firstWin: true });
    store.recordWin("UNDEAD", "UNDEAD_1", 9, 2);
    const source = storage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7);
    expect(JSON.parse(source ?? "")).toEqual({
      format: "pulp-wars-campaign-progress",
      version: 2,
      campaigns: {
        HUMANS: {
          completed: { HUMAN_1: { firstWonAt: AT, bestRounds: 14, stars: 1 } },
        },
        UNDEAD: {
          completed: { UNDEAD_1: { firstWonAt: AT, bestRounds: 9, stars: 2 } },
        },
      },
    });
    expect(parseCampaignProgressV7(source ?? "")).toEqual(store.load());
    const loaded = store.load();
    if (loaded.kind !== "VALID") throw new Error(loaded.kind);
    // Every campaign's completions in one record, for the derived state.
    expect(campaignCompletionsV7(loaded.progress)).toEqual({
      HUMAN_1: { firstWonAt: AT, bestRounds: 14, stars: 1 },
      UNDEAD_1: { firstWonAt: AT, bestRounds: 9, stars: 2 },
    });
    expect(storage.getItem(LEGACY_CAMPAIGN_PROGRESS_STORAGE_KEY_V7)).toBeNull();
  });

  it("migrates version 1 into the retired prologue without losing a win, and leaves the old key alone", () => {
    const storage = new MemoryStorage();
    const legacy = storedV1({
      FRONTIER_1: { ...won(14), stars: 3 },
      FRONTIER_2: won(20),
    });
    storage.setItem(LEGACY_CAMPAIGN_PROGRESS_STORAGE_KEY_V7, legacy);
    const store = new CampaignProgressStoreV7(storage, {
      now: () => "2026-10-19T08:00:00.000Z",
    });
    // Read as version 2, with nothing written on load.
    storage.writes = 0;
    expect(store.load()).toEqual({
      kind: "VALID",
      progress: {
        format: "pulp-wars-campaign-progress",
        version: 2,
        campaigns: {
          FRONTIER: {
            completed: {
              FRONTIER_1: { firstWonAt: AT, bestRounds: 14, stars: 3 },
              FRONTIER_2: { firstWonAt: AT, bestRounds: 20 },
            },
          },
        },
      },
    });
    expect(storage.writes).toBe(0);
    // The prologue is retired (pulp_wars-hmyk.22): its wins open nothing
    // and lock nothing on the map.
    const migrated = store.load();
    if (migrated.kind !== "VALID") throw new Error(migrated.kind);
    expect(campaignPlatesV7(campaignCompletionsV7(migrated.progress))).toEqual(
      campaignPlatesV7({}),
    );
    // The next win, in a faction campaign, writes version 2 with every
    // earlier win in it: the Frontier's are kept beside it.
    store.recordWin("HUMANS", "HUMAN_1", 17, 2);
    expect(written(storage, "FRONTIER")).toEqual({
      FRONTIER_1: { firstWonAt: AT, bestRounds: 14, stars: 3 },
      FRONTIER_2: { firstWonAt: AT, bestRounds: 20 },
    });
    expect(written(storage)).toEqual({
      HUMAN_1: {
        firstWonAt: "2026-10-19T08:00:00.000Z",
        bestRounds: 17,
        stars: 2,
      },
    });
    // An older build still reads the old key as it was.
    expect(storage.getItem(LEGACY_CAMPAIGN_PROGRESS_STORAGE_KEY_V7)).toBe(
      legacy,
    );
    // Version 2 wins over version 1 from then on.
    storage.setItem(
      LEGACY_CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
      storedV1({ FRONTIER_9: won() }),
    );
    const loaded = store.load();
    if (loaded.kind !== "VALID") throw new Error(loaded.kind);
    expect(Object.keys(campaignCompletionsV7(loaded.progress))).toEqual([
      "FRONTIER_1",
      "FRONTIER_2",
      "HUMAN_1",
    ]);
    // Empty version 1 progress migrates to no campaigns at all.
    expect(parseCampaignProgressV7(storedV1({}))).toEqual({
      kind: "VALID",
      progress: {
        format: "pulp-wars-campaign-progress",
        version: 2,
        campaigns: {},
      },
    });
  });

  it("keeps the most stars of any win, and reads progress written before stars as one star", () => {
    const storage = new MemoryStorage();
    // What a build before stars wrote: still valid, never rewritten on load.
    storage.setItem(
      CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
      storedV2({ HUMANS: { HUMAN_1: won(14) } }),
    );
    const store = new CampaignProgressStoreV7(storage, { now: () => AT });
    expect(store.load()).toMatchObject({
      kind: "VALID",
      progress: {
        campaigns: {
          HUMANS: { completed: { HUMAN_1: { bestRounds: 14 } } },
        },
      },
    });
    const best = (): unknown => written(storage).HUMAN_1;
    expect(
      campaignMissionCardsV7(CHAPTER_HUMANS_V7, { HUMAN_1: won(14) })[0],
    ).toMatchObject({ stars: 1, maxStars: 3 });
    // A slower win with more stars raises the stars and keeps the rounds.
    store.recordWin("HUMANS", "HUMAN_1", 20, 3);
    expect(best()).toEqual({ firstWonAt: AT, bestRounds: 14, stars: 3 });
    // A faster win with fewer stars lowers the rounds and keeps the stars.
    store.recordWin("HUMANS", "HUMAN_1", 9, 2);
    expect(best()).toEqual({ firstWonAt: AT, bestRounds: 9, stars: 3 });
    storage.writes = 0;
    store.recordWin("HUMANS", "HUMAN_1", 12, 1);
    expect(storage.writes).toBe(0);
    expect(() => store.recordWin("HUMANS", "HUMAN_1", 12, 4)).toThrow(
      RangeError,
    );
    expect(() => store.recordWin("HUMANS", "HUMAN_1", 12, 0)).toThrow(
      RangeError,
    );
    expect(() => store.recordWin("humans", "HUMAN_1", 12)).toThrow(RangeError);
    const loaded = store.load();
    if (loaded.kind !== "VALID") throw new Error(loaded.kind);
    expect(
      campaignMissionCardsV7(
        CHAPTER_HUMANS_V7,
        campaignCompletionsV7(loaded.progress),
      )[0],
    ).toMatchObject({ status: "DONE", stars: 3, maxStars: 3, bestRounds: 9 });
  });

  it("is idempotent: a replayed win keeps the first date and only lowers the best", () => {
    const storage = new MemoryStorage();
    let now = AT;
    const store = new CampaignProgressStoreV7(storage, { now: () => now });
    store.recordWin("HUMANS", "HUMAN_1", 14);
    now = "2026-10-05T09:30:00.000Z";
    const slower = store.recordWin("HUMANS", "HUMAN_1", 20);
    expect(slower).toMatchObject({ ok: true, firstWin: false });
    expect(written(storage).HUMAN_1).toEqual({
      firstWonAt: AT,
      bestRounds: 14,
      stars: 1,
    });
    // Recording the same win again writes nothing new.
    storage.writes = 0;
    store.recordWin("HUMANS", "HUMAN_1", 14);
    expect(storage.writes).toBe(0);
    store.recordWin("HUMANS", "HUMAN_1", 9);
    expect(written(storage).HUMAN_1).toEqual({
      firstWonAt: AT,
      bestRounds: 9,
      stars: 1,
    });
    // A mission's wins stay with the campaign that first filed it.
    store.recordWin("UNDEAD", "HUMAN_1", 8);
    expect(written(storage).HUMAN_1).toMatchObject({ bestRounds: 8 });
    expect(
      JSON.parse(storage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7) ?? "")
        .campaigns.UNDEAD,
    ).toBeUndefined();
  });

  it("keeps unknown mission and campaign IDs (removed from a later build)", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
      storedV2({
        HUMANS: { GONE_MISSION: won(7) },
        GONE_CAMPAIGN: { GONE_TOO: won(5) },
        // The retired prologue (pulp_wars-hmyk.22), all ten won.
        FRONTIER: Object.fromEntries(
          Array.from({ length: 10 }, (_, index) => [
            `FRONTIER_${String(index + 1)}`,
            { ...won(12), stars: 3 },
          ]),
        ),
      }),
    );
    const store = new CampaignProgressStoreV7(storage, { now: () => AT });
    store.recordWin("HUMANS", "HUMAN_1", 11);
    expect(Object.keys(written(storage))).toEqual(["GONE_MISSION", "HUMAN_1"]);
    expect(Object.keys(written(storage, "GONE_CAMPAIGN"))).toEqual([
      "GONE_TOO",
    ]);
    expect(Object.keys(written(storage, "FRONTIER"))).toHaveLength(10);
    // Nothing derived reads them: the map is as if only HUMAN_1 was won.
    const loaded = store.load();
    if (loaded.kind !== "VALID") throw new Error(loaded.kind);
    expect(campaignPlatesV7(campaignCompletionsV7(loaded.progress))).toEqual(
      campaignPlatesV7({ HUMAN_1: { ...won(11), stars: 1 } }),
    );
  });

  it("reports corrupt progress as unreadable and records nothing until reset", () => {
    for (const source of [
      "{ not json",
      "[]",
      JSON.stringify({ format: "other", version: 1, completed: {} }),
      JSON.stringify({ format: "other", version: 2, campaigns: {} }),
      JSON.stringify({
        format: "pulp-wars-campaign-progress",
        version: 2,
        completed: {},
      }),
      JSON.stringify({
        format: "pulp-wars-campaign-progress",
        version: 3,
        campaigns: {},
      }),
      JSON.stringify({
        format: "pulp-wars-campaign-progress",
        version: 1,
        completed: {},
        extra: true,
      }),
      JSON.stringify({
        format: "pulp-wars-campaign-progress",
        version: 2,
        campaigns: { FRONTIER: { completed: {}, extra: true } },
      }),
      storedV2({ frontier: { FRONTIER_1: won() } }),
      storedV2({
        FRONTIER: { FRONTIER_1: won() },
        HUMANS: { FRONTIER_1: won() },
      }),
      storedV1({ FRONTIER_1: { firstWonAt: AT, bestRounds: 0 } }),
      storedV2({ FRONTIER: { FRONTIER_1: { firstWonAt: AT, bestRounds: 0 } } }),
      storedV1({ FRONTIER_1: { firstWonAt: "yesterday", bestRounds: 3 } }),
      storedV1({
        FRONTIER_1: { firstWonAt: AT, bestRounds: 3, stars: 4 },
      }),
      storedV1({
        FRONTIER_1: { firstWonAt: AT, bestRounds: 3, stars: 0 },
      }),
      storedV1({
        FRONTIER_1: { firstWonAt: AT, bestRounds: 3, glow: true },
      } as never),
      storedV1({ "frontier one": won() }),
      storedV1({ ["__proto__"]: won() }),
    ]) {
      for (const key of [
        CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
        LEGACY_CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
      ]) {
        const storage = new MemoryStorage();
        storage.setItem(key, source);
        const store = new CampaignProgressStoreV7(storage);
        expect(store.load().kind, source).toBe("UNREADABLE");
        expect(store.recordWin("FRONTIER", "FRONTIER_1", 5)).toMatchObject({
          ok: false,
          kind: "UNREADABLE",
        });
        expect(storage.getItem(key)).toBe(source);
        expect(store.reset()).toEqual({ ok: true });
        expect(storage.getItem(key)).toBeNull();
        expect(store.load().kind).toBe("VALID");
      }
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
    expect(store.recordWin("FRONTIER", "FRONTIER_1", 5)).toMatchObject({
      ok: false,
      kind: "STORAGE_ERROR",
    });
    expect(store.reset()).toMatchObject({ ok: false });
    const readOnly = new MemoryStorage();
    readOnly.setItem = () => {
      throw new Error("quota");
    };
    expect(
      new CampaignProgressStoreV7(readOnly).recordWin(
        "FRONTIER",
        "FRONTIER_1",
        5,
      ),
    ).toMatchObject({ ok: false, kind: "STORAGE_ERROR" });
    // No storage at all: an empty campaign that keeps nothing.
    const none = new CampaignProgressStoreV7(null);
    expect(none.load().kind).toBe("VALID");
    expect(none.recordWin("FRONTIER", "FRONTIER_1", 5)).toMatchObject({
      ok: true,
    });
    expect(none.reset()).toEqual({ ok: true });
  });

  it("survives save deletion and obsolete-save cleanup", () => {
    const storage = new MemoryStorage();
    const progress = storedV2({ FRONTIER: { FRONTIER_1: won() } });
    const legacy = storedV1({ FRONTIER_1: won() });
    storage.setItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7, progress);
    storage.setItem(LEGACY_CAMPAIGN_PROGRESS_STORAGE_KEY_V7, legacy);
    storage.setItem(SAVE_STORAGE_KEY_V7, "save");
    for (const key of OBSOLETE_SAVE_STORAGE_KEYS_V7)
      storage.setItem(key, "old");
    cleanupObsoleteRuleset7Saves(storage);
    expect(new BrowserPersistenceV7(storage).deleteSave()).toEqual({
      ok: true,
    });
    expect(storage.getItem(SAVE_STORAGE_KEY_V7)).toBeNull();
    expect(storage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7)).toBe(progress);
    expect(storage.getItem(LEGACY_CAMPAIGN_PROGRESS_STORAGE_KEY_V7)).toBe(
      legacy,
    );
  });
});

describe("derived campaign state", () => {
  const statuses = (completed: CampaignCompletedV7) =>
    campaignMissionCardsV7(CHAPTER_HUMANS_V7, completed).map(
      (card) => card.status,
    );

  it("opens missions in order and keeps completed ones playable", () => {
    expect(statuses({})).toEqual([
      "OPEN",
      "LOCKED",
      "LOCKED",
      "LOCKED",
      "LOCKED",
      "LOCKED",
    ]);
    expect(statuses({ HUMAN_1: won() })).toEqual([
      "DONE",
      "OPEN",
      "LOCKED",
      "LOCKED",
      "LOCKED",
      "LOCKED",
    ]);
    expect(
      statuses({
        HUMAN_1: won(),
        HUMAN_2: won(),
        HUMAN_3: won(),
        HUMAN_4: won(),
      }),
    ).toEqual(["DONE", "DONE", "DONE", "DONE", "OPEN", "LOCKED"]);
    expect(
      campaignMissionCardsV7(CHAPTER_HUMANS_V7, {}).map((card) => card.built),
    ).toEqual([true, true, true, true, true, true]);
  });

  it("describes each card from the mission definitions", () => {
    const cards = campaignMissionCardsV7(CHAPTER_HUMANS_V7, {
      HUMAN_1: won(17),
    });
    expect(
      cards.map((card) => ({
        id: card.entry.missionId,
        leads: card.leads,
        opponents: card.opponents,
        allies: card.allies,
        size: card.size,
        best: card.bestRounds,
      })),
    ).toEqual([
      {
        id: "HUMAN_1",
        leads: ["ORIGINAL"],
        opponents: ["UNDEAD"],
        allies: [],
        size: 11,
        best: 17,
      },
      {
        id: "HUMAN_2",
        leads: ["ORIGINAL"],
        opponents: ["GOBLIN"],
        allies: [],
        size: 14,
        best: null,
      },
      {
        id: "HUMAN_3",
        leads: ["ORIGINAL"],
        opponents: ["GOBLIN", "DINOSAUR"],
        allies: [],
        size: 16,
        best: null,
      },
      {
        id: "HUMAN_4",
        leads: ["ORIGINAL"],
        opponents: ["CULT", "ICE_FOLK"],
        allies: ["UNDEAD"],
        size: 16,
        best: null,
      },
      {
        id: "HUMAN_5",
        leads: ["ORIGINAL"],
        opponents: ["GOBLIN"],
        allies: [],
        size: 16,
        best: null,
      },
      {
        id: "HUMAN_6",
        leads: ["ORIGINAL"],
        opponents: ["GOBLIN", "DINOSAUR", "CULT"],
        allies: [],
        size: 20,
        best: null,
      },
    ]);
    expect(cards.map((card) => [card.stars, card.maxStars])).toEqual([
      [1, 3],
      [0, 3],
      [0, 3],
      [0, 3],
      [0, 3],
      [0, 3],
    ]);
  });

  it("puts an allied AI seat of a mission with teams among the allies", () => {
    // The capture fixture: seat 1 is on your team, seat 2 is the enemy.
    const fixture = {
      ...CHAPTER_HUMANS_V7,
      missions: [
        { ...CHAPTER_HUMANS_V7.missions[0], missionId: "TEST_CAPTURE" },
      ],
    } as typeof CHAPTER_HUMANS_V7;
    const [card] = campaignMissionCardsV7(fixture, {});
    expect(card?.allies).toHaveLength(1);
    expect(card?.opponents).toHaveLength(1);
    expect(card?.maxStars).toBe(2);
  });

  it("shows a designed mission that is not built as coming soon, and refuses an unplanned one", () => {
    const first = CHAPTER_HUMANS_V7.missions[0];
    if (first === undefined) throw new Error("no first mission");
    const planned: CampaignChapterV7 = {
      ...CHAPTER_HUMANS_V7,
      missions: [
        {
          ...first,
          missionId: "NOT_BUILT_YET",
          planned: { leads: ["GOBLIN"], opponents: ["DWARF"], size: 14 },
        },
      ],
    };
    expect(campaignMissionCardsV7(planned, {})[0]).toMatchObject({
      built: false,
      leads: ["GOBLIN"],
      opponents: ["DWARF"],
      allies: [],
      size: 14,
      stars: 0,
      maxStars: 3,
    });
    const unplanned: CampaignChapterV7 = {
      ...CHAPTER_HUMANS_V7,
      missions: [{ ...first, missionId: "NOT_BUILT_YET" }],
    };
    expect(() => campaignMissionCardsV7(unplanned, {})).toThrow(
      /not registered/,
    );
  });

  it("offers a choice mission's whole list and a fixed seat's one faction: nothing is locked", () => {
    // pulp_wars-hmyk.22: the faction unlocks were the retired prologue's;
    // whatever was won, every faction of a seat's choice is offered.
    expect(campaignFactionChoicesV7("TEST_GROUNDS")).toEqual([
      "ORIGINAL",
      "GOBLIN",
    ]);
    expect(campaignFactionChoicesV7("HUMAN_1")).toEqual(["ORIGINAL"]);
    expect(campaignFactionChoicesV7("UNDEAD_1")).toEqual(["UNDEAD"]);
    expect(campaignFactionChoicesV7("NOT_A_MISSION")).toEqual([]);
    expect(campaignFactionChoicesV7("FRONTIER_4")).toEqual([]);
  });

  it("finds chapter missions and the next one; hidden fixtures belong to none", () => {
    expect(campaignMissionV7("HUMAN_2")?.entry.number).toBe(2);
    expect(campaignMissionV7("TEST_GROUNDS")).toBeNull();
    expect(campaignMissionV7("FRONTIER_2")).toBeNull();
    expect(campaignNextMissionV7("HUMAN_1")?.missionId).toBe("HUMAN_2");
    expect(campaignNextMissionV7("HUMAN_5")?.missionId).toBe("HUMAN_6");
    // After a campaign's last mission there is nothing to go on to.
    expect(campaignNextMissionV7("HUMAN_6")).toBeNull();
    expect(campaignNextMissionV7("FRONTIER_1")).toBeNull();
    expect(campaignTagNameV7("HUMAN_5", "GOLDEN_GOOSE")).toBe(
      "the Golden Goose",
    );
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
