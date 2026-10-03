import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  KIND_READER_CLASSES_V7,
  LEGACY_KIND_READER_FILES_V7,
} from "../fixtures/v7-kind-reader-classes";
import {
  kindReaderScopeTextV7,
  kindReadersV7,
} from "../fixtures/v7-kind-readers";

/**
 * The Mind Control revision (docs/product/RULESET_7_MIND_CONTROL.md section
 * 2.2): every raw faction read of the engine, the Normal AI, the
 * presentation, and the headless runner is classified as the unit's kind or
 * the seat's faction, keyed by file and function, so no reader silently
 * reads a mind-controlled unit's owner as its kind (the `ruleset-v7-dwarf-
 * unit-readers` precedent).
 */
const ROOT = join(__dirname, "..", "..");
const readers = kindReadersV7(ROOT);
const KIND_HELPERS =
  /\b(unitFactionV7|unitCapabilitiesV7|unitRoleRuleV7|unitRoleMechanicsV7|kindOf|kindOwner)\b/;

describe("Mind Control revision: kind-reader classification", () => {
  it("finds the raw faction readers", () => {
    expect(readers.length).toBeGreaterThan(400);
  });

  it("classifies every reader as KIND, KIND_RESOLVED, or SEAT", () => {
    const unclassified = [
      ...new Set(
        readers
          .filter(
            (reader) => !LEGACY_KIND_READER_FILES_V7.includes(reader.file),
          )
          .map((reader) => `${reader.file}::${reader.scope}`)
          .filter((key) => !(key in KIND_READER_CLASSES_V7)),
      ),
    ];
    expect(unclassified).toEqual([]);
  });

  it("has no class for a function that no longer reads a faction", () => {
    const present = new Set(
      readers.map((reader) => `${reader.file}::${reader.scope}`),
    );
    expect(
      Object.keys(KIND_READER_CLASSES_V7).filter((key) => !present.has(key)),
    ).toEqual([]);
    const files = new Set(readers.map((reader) => reader.file));
    expect(
      LEGACY_KIND_READER_FILES_V7.filter((file) => !files.has(file)),
    ).toEqual([]);
  });

  it("keeps the legacy list to Ruleset 5 and 6 code", () => {
    for (const file of LEGACY_KIND_READER_FILES_V7)
      expect(file, file).not.toMatch(/v7/);
  });

  it("makes every KIND reader go through the kind helpers", () => {
    for (const [key, kind] of Object.entries(KIND_READER_CLASSES_V7)) {
      if (kind !== "KIND") continue;
      const [file, scope] = key.split("::") as [string, string];
      expect(kindReaderScopeTextV7(ROOT, file, scope), key).toMatch(
        KIND_HELPERS,
      );
    }
  });

  it("classifies the readers the contract names", () => {
    const expected: Readonly<
      Record<string, "KIND" | "KIND_RESOLVED" | "SEAT">
    > = {
      // The resolvers themselves and the state parser.
      "src/engine/rules/ruleset-v7.ts::unitFactionV7": "KIND",
      "src/engine/rules/ruleset-v7.ts::unitRoleRuleV7": "KIND",
      "src/engine/rules/ruleset-v7.ts::unitCapabilitiesV7": "KIND",
      "src/engine/v7/state-schema.ts::parseUnit": "KIND",
      "src/engine/v7/state-schema.ts::validateCrossReferences": "KIND",
      // Seat-level: training, research, Plunder, and capacity.
      "src/engine/rules/ruleset-v7.ts::seatRoleRuleV7": "SEAT",
      "src/engine/v7/reducer.ts::applyTrain": "SEAT",
      "src/engine/v7/reducer.ts::plunderAwardsV7": "SEAT",
      "src/engine/v7/economy.ts::cityUnitCapacityV7": "SEAT",
      "src/engine/v7/query.ts::appendPublicCityCommandsV7": "SEAT",
      // The board plan resolves the kind once; drawing reads it.
      "src/render/canvas/board-renderer-v7.ts::drawBoardV7": "KIND_RESOLVED",
    };
    for (const [key, kind] of Object.entries(expected))
      expect(KIND_READER_CLASSES_V7[key], key).toBe(kind);
  });

  it("reads the public unit stats' faction blocks through the kind resolver", () => {
    // The `frenzied`, `goblin`, `dinosaur`, `martian`, and Dwarf branches of
    // `publicUnitStatsV7` follow the unit's kind: no raw read remains there.
    expect(
      readers.filter(
        (reader) =>
          reader.file === "src/engine/v7/unit-stats.ts" &&
          reader.scope === "publicUnitStatsV7",
      ),
    ).toEqual([]);
    expect(
      kindReaderScopeTextV7(
        ROOT,
        "src/engine/v7/unit-stats.ts",
        "publicUnitStatsV7",
      ),
    ).toMatch(/unitFactionV7\(state, unit\)/);
  });
});
