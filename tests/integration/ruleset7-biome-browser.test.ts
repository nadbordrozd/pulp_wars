import { describe, expect, it } from "vitest";
import {
  cleanupObsoleteRuleset7Saves,
  OBSOLETE_SAVE_STORAGE_KEYS_V7,
} from "../../src/persistence/browser-v7";
import { SAVE_STORAGE_KEY_V7 } from "../../src/engine/index";

describe("ruleset-7 revision-4 browser boundary", () => {
  it("owns r4 and removes only the three named development keys", () => {
    const values = new Map<string, string>([
      ...OBSOLETE_SAVE_STORAGE_KEYS_V7.map((key) => [key, "old"] as const),
      [SAVE_STORAGE_KEY_V7, "current"],
      ["pulpWars.save.current", "v6"],
      ["pulpWars.settings.v1", "settings"],
      ["other", "keep"],
    ]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
    };
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r4.current");
    expect(cleanupObsoleteRuleset7Saves(storage).removedKeys).toEqual(
      OBSOLETE_SAVE_STORAGE_KEYS_V7,
    );
    expect([...values.keys()].sort()).toEqual(
      [
        "other",
        "pulpWars.save.current",
        "pulpWars.save.v7r4.current",
        "pulpWars.settings.v1",
      ].sort(),
    );
  });
});
