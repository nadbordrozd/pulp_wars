import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
  LEGACY_UNIT_READER_FILES_V7,
  UNIT_READER_CLASSES_V7,
} from "../fixtures/v7-unit-reader-classes";
import { unitListReadersV7 } from "../fixtures/v7-unit-readers";

/**
 * The Dwarf revision (docs/product/RULESET_7_DWARVES.md section 5.2 and
 * section 18, helper refactor 2): every read of a unit list in `src` is
 * classified as board-only or all-units, keyed by file and function, so no
 * reader silently starts or stops including burrowed units.
 */
const ROOT = join(__dirname, "..", "..");
const readers = unitListReadersV7(ROOT);

function functionText(file: string, scope: string): string {
  const text = readFileSync(join(ROOT, file), "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const [owner, member] = scope.includes(".")
    ? (scope.split(".") as [string, string])
    : [null, scope];
  let found: string | null = null;
  const visit = (node: ts.Node): void => {
    if (found !== null) return;
    if (
      owner === null &&
      ts.isFunctionDeclaration(node) &&
      node.name?.text === member
    )
      found = node.getText(source);
    else if (
      owner === null &&
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === member
    )
      found = node.getText(source);
    else if (
      owner !== null &&
      ts.isClassDeclaration(node) &&
      node.name?.text === owner
    )
      for (const element of node.members)
        if (
          (member === "constructor" && ts.isConstructorDeclaration(element)) ||
          (element.name !== undefined &&
            ts.isIdentifier(element.name) &&
            element.name.text === member)
        )
          found = element.getText(source);
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (found === null) throw new Error(`${file}::${scope} not found`);
  return found;
}

describe("Ruleset 7 Dwarf revision: unit-list reader classification", () => {
  it("finds the unit-list readers of src", () => {
    // About 227 reads of `state.units` and 367 of `view.units` when the
    // contract was written, plus the other receivers.
    expect(readers.length).toBeGreaterThan(600);
  });

  it("classifies every reader as board-only or all-units", () => {
    const unclassified = [
      ...new Set(
        readers
          .filter(
            (reader) => !LEGACY_UNIT_READER_FILES_V7.includes(reader.file),
          )
          .map((reader) => `${reader.file}::${reader.scope}`)
          .filter((key) => !(key in UNIT_READER_CLASSES_V7)),
      ),
    ];
    expect(unclassified).toEqual([]);
  });

  it("has no class for a function that no longer reads a unit list", () => {
    const present = new Set(
      readers.map((reader) => `${reader.file}::${reader.scope}`),
    );
    expect(
      Object.keys(UNIT_READER_CLASSES_V7).filter((key) => !present.has(key)),
    ).toEqual([]);
    const files = new Set(readers.map((reader) => reader.file));
    expect(
      LEGACY_UNIT_READER_FILES_V7.filter((file) => !files.has(file)),
    ).toEqual([]);
  });

  it("keeps the legacy list to Ruleset 5 and 6 code", () => {
    for (const file of LEGACY_UNIT_READER_FILES_V7)
      expect(file, file).not.toMatch(/v7|ruleset-v7/);
  });

  it("makes every all-units reader read the burrowed list", () => {
    for (const [key, kind] of Object.entries(UNIT_READER_CLASSES_V7)) {
      if (kind !== "ALL") continue;
      const [file, scope] = key.split("::") as [string, string];
      const text = functionText(file, scope);
      expect(
        text.includes("burrowed") || text.includes("allOwnedUnitsV7"),
        key,
      ).toBe(true);
    }
  });

  it("classifies the readers the contract names", () => {
    const expected: Readonly<Record<string, "BOARD" | "ALL">> = {
      // Capacity, orphaning, and elimination; state parsing and entity IDs;
      // the leaderboard; headless metrics.
      "src/engine/v7/reducer.ts::applyCapture": "ALL",
      "src/engine/v7/state-schema.ts::validateCrossReferences": "ALL",
      "src/engine/v7/view.ts::viewForV7": "ALL",
      "src/engine/v7/query.ts::appendPublicCityCommandsV7": "ALL",
      "src/headless/v7.ts::recordEventsV7": "ALL",
      // Combat, movement, zone of control, siege, the Start Turn steps,
      // Muster, the public command query, and the threat map.
      "src/engine/v7/combat.ts::calculateCombatPreviewV7": "BOARD",
      "src/engine/v7/movement.ts::inHostileZoc": "BOARD",
      "src/engine/v7/economy.ts::isCityBesiegedV7": "BOARD",
      "src/engine/v7/reducer.ts::resetTurnUnits": "BOARD",
      "src/engine/v7/reducer.ts::evaluateAchievementsV7": "BOARD",
      "src/engine/v7/query.ts::appendPublicUnitCommandsV7": "BOARD",
      "src/engine/v7/query.ts::queryThreatenedTilesV7": "BOARD",
      "src/engine/v7/plague.ts::resolveStartTurnPlagueV7": "BOARD",
      "src/engine/v7/economy.ts::resolveWindmillHealingV7": "BOARD",
    };
    for (const [key, kind] of Object.entries(expected))
      expect(UNIT_READER_CLASSES_V7[key], key).toBe(kind);
  });
});
