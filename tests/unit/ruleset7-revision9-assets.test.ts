import { describe, expect, it } from "vitest";
import {
  RULESET7_REVISION9_SOURCE_IDS,
  assertRuleset7Revision9ArtOrder,
} from "../../scripts/art/ruleset7-revision9-art-order";

// The Shipyard, the three action icons and the two portraits of this family
// are retired (bead pulp_wars-67q.15); the Captain and Knight sprites stay.
describe("Ruleset 7 revision-9 art assets", () => {
  it("enforces the serial Captain-then-Knight source gates", () => {
    const accepted = (ids: readonly string[]) => ({
      records: Object.fromEntries(
        ids.map((id) => [id, { status: "ACCEPTED" }]),
      ),
    });
    expect(() =>
      assertRuleset7Revision9ArtOrder(
        [{ id: "unit-original-knight" }],
        accepted([]),
      ),
    ).toThrow("unit-original-captain");
    expect(() =>
      assertRuleset7Revision9ArtOrder(
        [{ id: "unit-original-knight" }],
        accepted(["unit-original-captain"]),
      ),
    ).not.toThrow();
    expect(() =>
      assertRuleset7Revision9ArtOrder(
        RULESET7_REVISION9_SOURCE_IDS.map((id) => ({ id })),
        accepted([]),
      ),
    ).toThrow("separate individual gates");
    expect(() =>
      assertRuleset7Revision9ArtOrder(
        [{ id: "unit-original-captain" }, { id: "unit-warrior" }],
        accepted([]),
      ),
    ).toThrow("Do not mix");
    expect(() =>
      assertRuleset7Revision9ArtOrder([{ id: "unit-warrior" }], accepted([])),
    ).not.toThrow();
  });
});
