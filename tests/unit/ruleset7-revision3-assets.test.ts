import { describe, expect, it } from "vitest";
import {
  RULESET7_REVISION3_HORSE_ARCHER_ID,
  RULESET7_REVISION3_HORSE_ARCHER_PORTRAIT_ID,
  assertRuleset7Revision3ArtOrder,
  resolveRepairStyleReferenceHash,
} from "../../scripts/art/ruleset7-revision3-art-order";

describe("Ruleset 7 revision-3 art assets", () => {
  it("enforces individual generation and the world sprite before its portrait", () => {
    expect(() =>
      assertRuleset7Revision3ArtOrder(
        [{ id: RULESET7_REVISION3_HORSE_ARCHER_ID }],
        { records: {} },
      ),
    ).not.toThrow();
    expect(() =>
      assertRuleset7Revision3ArtOrder(
        [{ id: RULESET7_REVISION3_HORSE_ARCHER_PORTRAIT_ID }],
        { records: {} },
      ),
    ).toThrow("before deriving its portrait");
    expect(() =>
      assertRuleset7Revision3ArtOrder(
        [{ id: RULESET7_REVISION3_HORSE_ARCHER_PORTRAIT_ID }],
        {
          records: {
            [RULESET7_REVISION3_HORSE_ARCHER_ID]: { status: "ACCEPTED" },
          },
        },
      ),
    ).not.toThrow();
    expect(() =>
      assertRuleset7Revision3ArtOrder(
        [
          { id: RULESET7_REVISION3_HORSE_ARCHER_ID },
          { id: RULESET7_REVISION3_HORSE_ARCHER_PORTRAIT_ID },
        ],
        { records: {} },
      ),
    ).toThrow("one revision-3 asset per call");
    expect(() =>
      assertRuleset7Revision3ArtOrder(
        [{ id: RULESET7_REVISION3_HORSE_ARCHER_ID }, { id: "unit-warrior" }],
        { records: {} },
      ),
    ).toThrow("unrelated generation families");
  });

  it("does not retain a stale reference hash when a repair recipe changes reference ID", () => {
    expect(
      resolveRepairStyleReferenceHash(
        "mountain-current",
        { id: "mountain-current", sha256: "accepted-old-hash" },
        "generated-current-hash",
      ),
    ).toBe("accepted-old-hash");
    expect(
      resolveRepairStyleReferenceHash(
        "mountain-current",
        { id: "mountain-wrong", sha256: "stale-wrong-hash" },
        "generated-current-hash",
      ),
    ).toBe("generated-current-hash");
  });
});
