import { describe, expect, it } from "vitest";
import { assertRuleset7BuildingEconomyOrder } from "../../scripts/art/ruleset7-building-economy-order";

// The Pillage and Disband icons of this family are retired (bead
// pulp_wars-67q.15): the two world buildings stay.

describe("Ruleset 7 Barracks and Monument art", () => {
  it("enforces two serial world requests", () => {
    expect(() =>
      assertRuleset7BuildingEconomyOrder([{ id: "building-square-barracks" }], {
        records: {},
      }),
    ).not.toThrow();
    expect(() =>
      assertRuleset7BuildingEconomyOrder([{ id: "building-square-monument" }], {
        records: {},
      }),
    ).toThrow("Barracks request");
    expect(() =>
      assertRuleset7BuildingEconomyOrder(
        [
          { id: "building-square-barracks" },
          { id: "building-square-monument" },
        ],
        { records: {} },
      ),
    ).toThrow("exactly one");
    expect(() =>
      assertRuleset7BuildingEconomyOrder(
        [{ id: "building-square-barracks" }, { id: "ui-action-heal" }],
        { records: {} },
      ),
    ).toThrow("exactly one");
    expect(() =>
      assertRuleset7BuildingEconomyOrder([{ id: "building-square-monument" }], {
        records: { "building-square-barracks": { status: "CANDIDATE" } },
      }),
    ).not.toThrow();
    expect(() =>
      assertRuleset7BuildingEconomyOrder([{ id: "ui-action-heal" }], {
        records: {},
      }),
    ).not.toThrow();
  });
});
