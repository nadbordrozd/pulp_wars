import { describe, expect, it } from "vitest";
import {
  assertRuleset7OriginalUnitOrder,
  RULESET7_ORIGINAL_PORTRAIT_IDS,
  RULESET7_ORIGINAL_WORLD_IDS,
} from "../../scripts/art/ruleset7-original-unit-order";

function requiredItem<T>(values: readonly T[], index: number): T {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`Missing test fixture at index ${index}`);
  }
  return value;
}

describe("ruleset-7 Original Envoy, Lancer, and Saboteur art", () => {
  it("enforces the executable first-trio and targeted-retry order guards", () => {
    const recipes = RULESET7_ORIGINAL_WORLD_IDS.map((id) => ({ id }));
    expect(() =>
      assertRuleset7OriginalUnitOrder(recipes, { records: {} }),
    ).not.toThrow();
    expect(() =>
      assertRuleset7OriginalUnitOrder([requiredItem(recipes, 0)], {
        records: {},
      }),
    ).toThrow("first Ruleset 7 Original sample call");
    expect(() =>
      assertRuleset7OriginalUnitOrder([...recipes, { id: "unit-warrior" }], {
        records: {},
      }),
    ).toThrow("unrelated generation families");

    const recordedWorlds = Object.fromEntries(
      RULESET7_ORIGINAL_WORLD_IDS.map((id) => [id, { status: "CANDIDATE" }]),
    );
    expect(() =>
      assertRuleset7OriginalUnitOrder([requiredItem(recipes, 1)], {
        records: recordedWorlds,
      }),
    ).not.toThrow();

    const portraitRecipes = RULESET7_ORIGINAL_PORTRAIT_IDS.map((id) => ({
      id,
    }));
    expect(() =>
      assertRuleset7OriginalUnitOrder(portraitRecipes, {
        records: recordedWorlds,
      }),
    ).toThrow("before deriving portraits");
    const acceptedWorlds = Object.fromEntries(
      RULESET7_ORIGINAL_WORLD_IDS.map((id) => [id, { status: "ACCEPTED" }]),
    );
    expect(() =>
      assertRuleset7OriginalUnitOrder([requiredItem(portraitRecipes, 0)], {
        records: acceptedWorlds,
      }),
    ).toThrow("first Ruleset 7 Original portrait call");
    expect(() =>
      assertRuleset7OriginalUnitOrder(portraitRecipes, {
        records: acceptedWorlds,
      }),
    ).not.toThrow();
    const recordedPortraits = Object.fromEntries(
      RULESET7_ORIGINAL_PORTRAIT_IDS.map((id) => [id, { status: "CANDIDATE" }]),
    );
    expect(() =>
      assertRuleset7OriginalUnitOrder([requiredItem(portraitRecipes, 2)], {
        records: { ...acceptedWorlds, ...recordedPortraits },
      }),
    ).not.toThrow();
  });
});
