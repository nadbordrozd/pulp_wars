import { describe, expect, it } from "vitest";
import type { CityId, CommandV7, UnitId } from "../../src/engine/index";
import {
  nothingUsefulLeftV7,
  usefulCommandV7,
} from "../../src/render/end-turn-glow-v7";

/**
 * Bead pulp_wars-2yc.82 (UI review V10): End Turn glows when no offered
 * command is useful, read from the offered commands alone and
 * conservatively (every unit ability and city action counts).
 */

const unit = 7 as UnitId;
const city = 3 as CityId;
const at = { x: 2, y: 4 };
const END: CommandV7 = { kind: "END_TURN" };

describe("the End Turn glow rule", () => {
  it("glows when End Turn is all that is left", () => {
    expect(nothingUsefulLeftV7([END])).toBe(true);
  });

  it("never glows when End Turn is not offered (another seat's turn)", () => {
    expect(nothingUsefulLeftV7([])).toBe(false);
  });

  it("ignores Wait, Disband and Recover, which End Turn makes needless", () => {
    expect(
      nothingUsefulLeftV7([
        END,
        { kind: "WAIT", unitId: unit },
        { kind: "DISBAND", unitId: unit },
        { kind: "RECOVER", unitId: unit },
      ]),
    ).toBe(true);
  });

  it("stays dark while a unit can move, attack, capture or use any ability", () => {
    const unitCommands: CommandV7[] = [
      { kind: "MOVE", unitId: unit, path: [at] },
      { kind: "ATTACK", unitId: unit, targetUnitId: 9 as UnitId },
      { kind: "CAPTURE", unitId: unit },
      { kind: "KABOOM", unitId: unit },
      { kind: "WAIL", unitId: unit },
      { kind: "RAISE_DEAD", unitId: unit },
      { kind: "DISEMBARK", unitId: unit, at },
    ] as CommandV7[];
    for (const command of unitCommands) {
      expect(usefulCommandV7(command)).toBe(true);
      expect(nothingUsefulLeftV7([END, command])).toBe(false);
    }
  });

  it("stays dark while a city can train or act, or a technology is affordable", () => {
    const commands: CommandV7[] = [
      { kind: "TRAIN", cityId: city, role: "WARRIOR" },
      { kind: "LAND_GRANT", cityId: city },
      { kind: "OFFERING", cityId: city },
      { kind: "RESEARCH", tech: "GATHERING" },
    ] as CommandV7[];
    for (const command of commands)
      expect(nothingUsefulLeftV7([END, command])).toBe(false);
  });

  it("counts the coach's harvests and basic buildings, not standing investments", () => {
    for (const kind of [
      "HARVEST_FRUIT",
      "HUNT_GAME",
      "HARVEST_FISH",
      "GATHER_PEARLS",
      "BUILD_FARM",
      "BUILD_LUMBER_CAMP",
      "BUILD_MINE",
    ] as const)
      expect(nothingUsefulLeftV7([END, { kind, at }])).toBe(false);
    for (const kind of [
      "BUILD_ROAD",
      "CLEAR_FOREST",
      "REPLANT_FOREST",
      "CULTIVATE_FOREST",
      "BLAST_MOUNTAIN",
      "REDEVELOP",
      "BUILD_WINDMILL",
      "BUILD_PORT",
    ] as const)
      expect(nothingUsefulLeftV7([END, { kind, at }])).toBe(true);
  });
});
