import { describe, expect, it } from "vitest";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import { chibiAssetProblemsV7 } from "../../src/assets/chibi-art-v7";
import { viewForV7 } from "../../src/engine/index";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import { riftPieceV7 } from "../../src/render/canvas/rift-presentation-v7";
import {
  RIFT_KEEP_DARK_LUMA_V7,
  terrainKeepDarkV7,
  terrainPivotV7,
  tonePixelsV7,
} from "../../src/render/canvas/visual-direction-v7";
import { RIFT_HELP_TIP_V7 } from "../../src/render/dom/app-view-v7";
import { RIFT_UI_V7, riftUiFixtureV7 } from "../fixtures/v7-rift-ui";

// The Rift's presentation (bead pulp_wars-9s0.5,
// docs/product/RULESET_7_RIFT.md section 8).

const key = (at: { readonly x: number; readonly y: number }) =>
  `${at.x},${at.y}`;

/** `riftAt` over explicit Rift, open, and fogged cells. */
function board(
  rift: readonly string[],
  fog: readonly string[] = [],
): (at: { readonly x: number; readonly y: number }) => boolean | null {
  return (at) => (fog.includes(key(at)) ? null : rift.includes(key(at)));
}

describe("the Rift piece of a cell", () => {
  it("reads a horizontal and a vertical Rift with every neighbour explored", () => {
    const horizontal = board(["1,1", "2,1", "3,1"]);
    expect(
      [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ].map((at) => riftPieceV7(at, horizontal)),
    ).toEqual(["H_WEST", "H_MIDDLE", "H_EAST"]);
    const vertical = board(["4,2", "4,3", "4,4"]);
    expect(
      [
        { x: 4, y: 2 },
        { x: 4, y: 3 },
        { x: 4, y: 4 },
      ].map((at) => riftPieceV7(at, vertical)),
    ).toEqual(["V_NORTH", "V_MIDDLE", "V_SOUTH"]);
  });

  it("never reads fog: an unexplored neighbour continues the crack", () => {
    // The east end with its west neighbours in fog: open cells above and
    // below rule out a vertical Rift, and the open east makes it the end.
    expect(riftPieceV7({ x: 3, y: 1 }, board(["3,1"], ["2,1", "1,1"]))).toBe(
      "H_EAST",
    );
    // A lone explored Rift cell between fog and an open cell above and
    // below: vertical is ruled out, so it is horizontal.
    expect(riftPieceV7({ x: 5, y: 5 }, board(["5,5"], ["4,5", "6,5"]))).toBe(
      "H_MIDDLE",
    );
    // Both sides open: vertical, and the open north makes it the top.
    expect(riftPieceV7({ x: 5, y: 5 }, board(["5,5"], ["5,6", "5,7"]))).toBe(
      "V_NORTH",
    );
    // The middle of a horizontal Rift with the west end in fog.
    expect(riftPieceV7({ x: 2, y: 1 }, board(["2,1", "3,1"], ["1,1"]))).toBe(
      "H_MIDDLE",
    );
    // Nothing known at all.
    expect(
      riftPieceV7({ x: 5, y: 5 }, board(["5,5"], ["4,5", "6,5", "5,4", "5,6"])),
    ).toBe("H_MIDDLE");
  });
});

describe("the board plan", () => {
  it("plans each Rift cell with its piece, its CHIBI subject, and Grass for LEGACY", () => {
    const state = riftUiFixtureV7();
    const plan = buildBoardRenderPlanV7(
      viewForV7(state, state.humanPlayerId),
      [],
      { selection: null, selectedUnitId: null, selectedAchievement: null },
    );
    const rift = plan.entries
      .filter((entry) => entry.kind === "TERRAIN" && entry.riftPiece)
      .map((entry) => [key(entry.at), entry.riftPiece, entry.artSubject]);
    expect(rift).toEqual([
      ["8,1", "V_NORTH", "TERRAIN:RIFT_V_NORTH"],
      ["3,2", "H_WEST", "TERRAIN:RIFT_H_WEST"],
      ["4,2", "H_MIDDLE", "TERRAIN:RIFT_H_MIDDLE"],
      ["5,2", "H_EAST", "TERRAIN:RIFT_H_EAST"],
      ["8,2", "V_MIDDLE", "TERRAIN:RIFT_V_MIDDLE"],
      ["8,3", "V_SOUTH", "TERRAIN:RIFT_V_SOUTH"],
    ]);
    for (const entry of plan.entries)
      if (entry.riftPiece !== undefined)
        expect(entry.assetId).toMatch(/^terrain-ruleset7-original-grass-\d$/);
    // A flyer stands on the Rift and is planned like any unit.
    expect(
      plan.entries.some(
        (entry) =>
          entry.kind === "UNIT" && key(entry.at) === key(RIFT_UI_V7.saucer),
      ),
    ).toBe(true);
  });
});

describe("the Rift art", () => {
  it("registers six 80 x 80 terrain pieces that pass the CHIBI contract", () => {
    const pieces = CHIBI_ART_ASSETS_V7.filter((asset) =>
      asset.subject.startsWith("TERRAIN:RIFT_"),
    );
    expect(pieces.map((asset) => asset.subject).sort()).toEqual([
      "TERRAIN:RIFT_H_EAST",
      "TERRAIN:RIFT_H_MIDDLE",
      "TERRAIN:RIFT_H_WEST",
      "TERRAIN:RIFT_V_MIDDLE",
      "TERRAIN:RIFT_V_NORTH",
      "TERRAIN:RIFT_V_SOUTH",
    ]);
    for (const asset of pieces) {
      expect([asset.width, asset.height, asset.assetClass]).toEqual([
        80,
        80,
        "TERRAIN",
      ]);
      expect(chibiAssetProblemsV7(asset)).toEqual([]);
    }
  });

  it("the default look keeps the chasm dark and tones its Grass like any Grass", () => {
    const subject = "TERRAIN:RIFT_H_MIDDLE" as const;
    expect(terrainPivotV7(subject)).toEqual(terrainPivotV7("TERRAIN:GRASS"));
    expect(terrainKeepDarkV7(subject)).toBe(RIFT_KEEP_DARK_LUMA_V7);
    expect(terrainKeepDarkV7("TERRAIN:GRASS")).toBeUndefined();
    const tone = {
      saturation: 100,
      contrast: 65,
      lightness: 0,
      outline: 60,
      scale: 100,
    };
    // A black chasm pixel, a brown rim pixel, and two Grass pixels.
    const pixels = new Uint8ClampedArray([
      14, 10, 12, 255, 91, 58, 38, 255, 137, 183, 91, 255, 110, 150, 70, 255,
    ]);
    const pivot = terrainPivotV7(subject);
    const plain = tonePixelsV7(pixels, 2, 2, tone, 1, pivot);
    const rift = tonePixelsV7(
      pixels,
      2,
      2,
      tone,
      1,
      pivot,
      RIFT_KEEP_DARK_LUMA_V7,
    );
    expect([...rift.slice(0, 4)]).toEqual([14, 10, 12, 255]);
    expect([...plain.slice(0, 4)]).not.toEqual([14, 10, 12, 255]);
    // Grass (luma 102 and up) is toned exactly as without the Rift rule.
    expect([...rift.slice(8)]).toEqual([...plain.slice(8)]);
  });

  it("Help names the Rift once the viewer has seen one", () => {
    expect(RIFT_HELP_TIP_V7).toContain("Only flying units");
  });
});
