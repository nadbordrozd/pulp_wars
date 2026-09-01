import { describe, expect, it } from "vitest";
import { unitId, type CommandV6 } from "../../src/engine/index";
import { readyUnitIdsFromOfferedMovesV6 } from "../../src/render/dom/readiness-v6";

describe("ruleset-6 readiness presentation boundary", () => {
  it("derives a stable unique unit set from exact offered MOVE commands only", () => {
    const commands: readonly CommandV6[] = [
      { kind: "WAIT", unitId: unitId(8) },
      { kind: "MOVE", unitId: unitId(9), path: [{ x: 2, y: 1 }] },
      {
        kind: "ATTACK",
        unitId: unitId(7),
        target: { kind: "UNIT", unitId: unitId(8) },
      },
      { kind: "MOVE", unitId: unitId(3), path: [{ x: 1, y: 1 }] },
      { kind: "MOVE", unitId: unitId(9), path: [{ x: 3, y: 1 }] },
    ];

    const ready = readyUnitIdsFromOfferedMovesV6(commands);
    expect(ready).toEqual([unitId(3), unitId(9)]);
    expect(Object.isFrozen(ready)).toBe(true);
    expect(readyUnitIdsFromOfferedMovesV6([])).toEqual([]);
  });
});
