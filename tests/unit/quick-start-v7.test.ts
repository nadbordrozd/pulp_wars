import { describe, expect, it } from "vitest";
import {
  AI_HEAD_START_COINS_V7,
  OFFERED_FACTION_IDS_V7,
  allowedBoardSizesV7,
  crowdedBoardV7,
  landTileCountV7,
  type MapTypeV7,
} from "../../src/engine/index";
import {
  QUICK_DEFAULT_DIFFICULTY_V7,
  QUICK_DIFFICULTIES_V7,
  QUICK_DIFFICULTY_LABELS_V7,
  QUICK_MAP_CYCLE_V7,
  QUICK_MAX_BOARD_SIZE_V7,
  nextQuickMapTypeV7,
  quickBoardSizeV7,
  quickHeadStartCoinsV7,
  randomOpponentFactionsV7,
} from "../../src/render/quick-start-v7";
import {
  QUICK_DIFFICULTY_STORAGE_KEY_V7,
  QUICK_LAST_MAP_STORAGE_KEY_V7,
  loadQuickDifficultyPreferenceV7,
  loadQuickLastMapPreferenceV7,
  storeQuickDifficultyPreferenceV7,
  storeQuickLastMapPreferenceV7,
} from "../../src/app/quick-start-preference-v7";
import { setupOpponentCountsV7 } from "../../src/render/setup-options-v7";

/**
 * Quick start (bead `pulp_wars-2yc.54`, docs/ui/QUICK_START.md): the pure
 * heuristics behind the new-game screen's defaults and the two remembered
 * choices. No board is generated and no match is played.
 */
const OPPONENTS = setupOpponentCountsV7();
const GENERATED: readonly MapTypeV7[] = [
  "DRY_LAND",
  "PANGEA",
  "CONTINENTS",
  "ARCHIPELAGO",
  "LAKES",
];

class MemoryStorage {
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
const blocked = {
  getItem: (): string | null => {
    throw new Error("blocked");
  },
  setItem: (): void => {
    throw new Error("blocked");
  },
  removeItem: (): void => undefined,
};

describe("quick start: the map cycle", () => {
  it("cycles Continents, Lakes, Pangea and starts on Continents", () => {
    expect(QUICK_MAP_CYCLE_V7).toEqual(["CONTINENTS", "LAKES", "PANGEA"]);
    expect(nextQuickMapTypeV7(null)).toBe("CONTINENTS");
    expect(nextQuickMapTypeV7("CONTINENTS")).toBe("LAKES");
    expect(nextQuickMapTypeV7("LAKES")).toBe("PANGEA");
    expect(nextQuickMapTypeV7("PANGEA")).toBe("CONTINENTS");
    // A map outside the cycle starts it again.
    expect(nextQuickMapTypeV7("ARCHIPELAGO")).toBe("CONTINENTS");
  });
});

describe("quick start: the board size", () => {
  it("is always legal, never above 20 x 20, and grows with the opponents", () => {
    for (const mapType of GENERATED) {
      let previous = 0;
      for (const opponents of OPPONENTS) {
        const size = quickBoardSizeV7(mapType, opponents);
        expect(allowedBoardSizesV7(mapType, opponents + 1)).toContain(size);
        expect(size).toBeLessThanOrEqual(QUICK_MAX_BOARD_SIZE_V7);
        expect(size, `${mapType} ${opponents}`).toBeGreaterThanOrEqual(
          previous,
        );
        previous = size;
      }
    }
  });

  it("stays at 20 x 20 at the most opponents, where 25 x 25 is also legal", () => {
    const most = OPPONENTS.at(-1) ?? 1;
    for (const mapType of QUICK_MAP_CYCLE_V7) {
      expect(allowedBoardSizesV7(mapType, most + 1)).toContain(25);
      expect(quickBoardSizeV7(mapType, most)).toBe(20);
    }
  });

  it("gives every player at least 34 land tiles on an uncrowded board below the cap", () => {
    for (const mapType of QUICK_MAP_CYCLE_V7)
      for (const opponents of OPPONENTS) {
        const size = quickBoardSizeV7(mapType, opponents);
        if (size === QUICK_MAX_BOARD_SIZE_V7) continue;
        const seats = opponents + 1;
        expect(
          landTileCountV7(size, mapType as "PANGEA") / seats,
        ).toBeGreaterThanOrEqual(34);
        expect(crowdedBoardV7(size, mapType as "PANGEA", seats)).toBe(false);
      }
  });

  it("keeps the long-standing 11 x 11 for one opponent on Continents", () => {
    expect(quickBoardSizeV7("CONTINENTS", 1)).toBe(11);
    expect(quickBoardSizeV7("PANGEA", 1)).toBe(11);
    expect(quickBoardSizeV7("LAKES", 1)).toBe(11);
  });

  it("gives the Showcase its one board", () => {
    expect(quickBoardSizeV7("SHOWCASE", 1)).toBe(16);
  });
});

describe("quick start: the difficulty", () => {
  it("offers four levels in few words, Normal first and by default", () => {
    expect(QUICK_DIFFICULTIES_V7).toEqual([
      "NORMAL",
      "HARD",
      "HARDER",
      "BRUTAL",
    ]);
    expect(QUICK_DEFAULT_DIFFICULTY_V7).toBe("NORMAL");
    expect(Object.values(QUICK_DIFFICULTY_LABELS_V7)).toEqual([
      "Normal",
      "Hard",
      "Harder",
      "Brutal",
    ]);
  });

  it("gives Normal no head start anywhere, and every harder level one the engine offers", () => {
    for (const mapType of GENERATED)
      for (const opponents of OPPONENTS)
        for (const size of allowedBoardSizesV7(mapType, opponents + 1)) {
          expect(
            quickHeadStartCoinsV7("NORMAL", mapType, size, opponents),
          ).toBe(0);
          for (const level of QUICK_DIFFICULTIES_V7.slice(1))
            expect(AI_HEAD_START_COINS_V7).toContain(
              quickHeadStartCoinsV7(level, mapType, size, opponents),
            );
        }
  });

  it("never gives a harder level less than an easier one on the same board", () => {
    for (const mapType of GENERATED)
      for (const opponents of OPPONENTS)
        for (const size of allowedBoardSizesV7(mapType, opponents + 1)) {
          const coins = QUICK_DIFFICULTIES_V7.map((level) =>
            quickHeadStartCoinsV7(level, mapType, size, opponents),
          );
          expect(coins).toEqual([...coins].sort((a, b) => a - b));
        }
  });

  it("gives the reference levels on the quick boards: +5, +10, +20", () => {
    expect(
      QUICK_DIFFICULTIES_V7.map((level) =>
        quickHeadStartCoinsV7(level, "CONTINENTS", 11, 1),
      ),
    ).toEqual([0, 5, 10, 20]);
    expect(
      QUICK_DIFFICULTIES_V7.map((level) =>
        quickHeadStartCoinsV7(level, "PANGEA", 14, 2),
      ),
    ).toEqual([0, 5, 10, 20]);
  });

  it("gives a smaller head start where players are crowded and a larger one where they are spread out", () => {
    // Nine players on Continents 20 x 20: 25 land tiles each.
    expect(quickHeadStartCoinsV7("HARDER", "CONTINENTS", 20, 8)).toBe(5);
    expect(quickHeadStartCoinsV7("BRUTAL", "CONTINENTS", 20, 8)).toBe(10);
    // One opponent on Pangea 20 x 20: 144 land tiles each.
    expect(quickHeadStartCoinsV7("HARD", "PANGEA", 20, 1)).toBe(20);
    // For every level, more land per player never means less head start.
    for (const level of QUICK_DIFFICULTIES_V7) {
      const byLand = [11, 14, 16, 20, 25].map((size) => ({
        land: landTileCountV7(size, "PANGEA") / 2,
        coins: quickHeadStartCoinsV7(level, "PANGEA", size as 11, 1),
      }));
      for (let index = 1; index < byLand.length; index += 1)
        expect(byLand[index]?.coins ?? 0).toBeGreaterThanOrEqual(
          byLand[index - 1]?.coins ?? 0,
        );
    }
  });
});

describe("quick start: the opponents' factions", () => {
  it("are every faction but the player's, each once", () => {
    let draws = 0;
    const random = (): number => (draws += 7919);
    for (const own of OFFERED_FACTION_IDS_V7) {
      const others = randomOpponentFactionsV7(
        OFFERED_FACTION_IDS_V7,
        own,
        random,
      );
      expect(others).toHaveLength(OFFERED_FACTION_IDS_V7.length - 1);
      expect(others).not.toContain(own);
      expect(new Set(others).size).toBe(others.length);
    }
  });

  it("keep the registration order with a source that always draws 0, and shuffle otherwise", () => {
    expect(
      randomOpponentFactionsV7(OFFERED_FACTION_IDS_V7, "ORIGINAL", () => 0),
    ).toEqual(OFFERED_FACTION_IDS_V7.slice(1));
    expect(
      randomOpponentFactionsV7(OFFERED_FACTION_IDS_V7, "ORIGINAL", () => 1),
    ).not.toEqual(OFFERED_FACTION_IDS_V7.slice(1));
  });

  it("put every faction in the first seat for some draw", () => {
    const first = new Set(
      Array.from(
        { length: 64 },
        (_, seed) =>
          randomOpponentFactionsV7(
            OFFERED_FACTION_IDS_V7,
            "ORIGINAL",
            () => seed,
          )[0],
      ),
    );
    expect(first.size).toBe(OFFERED_FACTION_IDS_V7.length - 1);
  });
});

describe("quick start: what the browser remembers", () => {
  it("remembers the difficulty and reads anything else as Normal", () => {
    const storage = new MemoryStorage();
    expect(loadQuickDifficultyPreferenceV7(storage)).toBe("NORMAL");
    expect(loadQuickDifficultyPreferenceV7(null)).toBe("NORMAL");
    for (const level of QUICK_DIFFICULTIES_V7) {
      expect(storeQuickDifficultyPreferenceV7(storage, level)).toBe(true);
      expect(storage.getItem(QUICK_DIFFICULTY_STORAGE_KEY_V7)).toBe(level);
      expect(loadQuickDifficultyPreferenceV7(storage)).toBe(level);
    }
    storage.setItem(QUICK_DIFFICULTY_STORAGE_KEY_V7, "EASY");
    expect(loadQuickDifficultyPreferenceV7(storage)).toBe("NORMAL");
    expect(loadQuickDifficultyPreferenceV7(blocked)).toBe("NORMAL");
    expect(storeQuickDifficultyPreferenceV7(blocked, "HARD")).toBe(false);
  });

  it("remembers the last map of the cycle and nothing else", () => {
    const storage = new MemoryStorage();
    expect(loadQuickLastMapPreferenceV7(storage)).toBeNull();
    for (const mapType of QUICK_MAP_CYCLE_V7) {
      expect(storeQuickLastMapPreferenceV7(storage, mapType)).toBe(true);
      expect(storage.getItem(QUICK_LAST_MAP_STORAGE_KEY_V7)).toBe(mapType);
      expect(loadQuickLastMapPreferenceV7(storage)).toBe(mapType);
    }
    storage.setItem(QUICK_LAST_MAP_STORAGE_KEY_V7, "ARCHIPELAGO");
    expect(loadQuickLastMapPreferenceV7(storage)).toBeNull();
    expect(loadQuickLastMapPreferenceV7(blocked)).toBeNull();
    expect(storeQuickLastMapPreferenceV7(blocked, "LAKES")).toBe(false);
  });
});
