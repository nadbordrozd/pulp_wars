import { describe, expect, it } from "vitest";
import {
  NAVAL_WATERLINE_GHOST_ALPHA_V7,
  NAVAL_WATERLINE_SPECS_V7,
  drawNavalWaterlineSpriteV7,
  navalWaterlineGeometryV7,
  navalWaterlineOfV7,
} from "../../src/render/canvas/naval-waterline-v7";
import { LIVE_DIRECTION_V7 } from "../../src/render/canvas/visual-direction-v7";

/**
 * Bead pulp_wars-oiu5: ships sit in the water, sunk to their keel row, the
 * hull under it a ghost (the live look) or cut.
 */

/** A 10 x 12 hull: rows 4-9 opaque, columns 2-7 wide, the keel 3-6. */
function hullAlpha(x: number, y: number): number {
  if (y < 4 || y > 9) return 0;
  if (y === 9) return x >= 3 && x <= 6 ? 255 : 0;
  return x >= 2 && x <= 7 ? 255 : 0;
}

interface Call {
  readonly name: string;
  readonly args: readonly unknown[];
  readonly alpha: number;
  readonly clipped: boolean;
}

function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly calls: Call[];
} {
  const calls: Call[] = [];
  const stack: { alpha: number; clipped: boolean }[] = [];
  let state = { alpha: 1, clipped: false };
  const record =
    (name: string) =>
    (...args: unknown[]): void => {
      calls.push({ name, args, alpha: state.alpha, clipped: state.clipped });
    };
  const context = {
    get globalAlpha() {
      return state.alpha;
    },
    set globalAlpha(value: number) {
      state.alpha = value;
    },
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    save: () => stack.push({ ...state }),
    restore: () => {
      state = stack.pop() ?? { alpha: 1, clipped: false };
    },
    clip: () => {
      state.clipped = true;
    },
    beginPath: () => undefined,
    rect: record("rect"),
    drawImage: record("drawImage"),
    fillRect: record("fillRect"),
    ellipse: record("ellipse"),
    stroke: record("stroke"),
  };
  return { context: context as unknown as CanvasRenderingContext2D, calls };
}

describe("ships in the water (naval-waterline-v7)", () => {
  it("finds the keel and the hull row that lands on it", () => {
    expect(
      navalWaterlineGeometryV7(10, 12, hullAlpha, { sinkRows: 2 }),
    ).toEqual({ sinkRows: 2, keel: 9, left: 2, right: 7 });
    // The narrow keel row itself when nothing sinks.
    expect(
      navalWaterlineGeometryV7(10, 12, hullAlpha, { sinkRows: 0 }),
    ).toEqual({ sinkRows: 0, keel: 9, left: 3, right: 6 });
    // Sunk past the top of the sprite, or an empty sprite: drawn whole.
    expect(
      navalWaterlineGeometryV7(10, 12, hullAlpha, { sinkRows: 7 }),
    ).toBeNull();
    expect(
      navalWaterlineGeometryV7(10, 12, () => 0, { sinkRows: 1 }),
    ).toBeNull();
  });

  it("sinks the sprite, ghosts the hull under the keel and draws the foam", () => {
    const { context, calls } = recordingContext();
    const image = {} as CanvasImageSource;
    // Master 10 x 12 drawn at 2 canvas px per master px.
    const rect = { x: 100, y: 50, width: 20, height: 24 };
    const geometry = { sinkRows: 2, keel: 9, left: 2, right: 7 };
    const sunk = drawNavalWaterlineSpriteV7(
      context,
      image,
      rect,
      12,
      geometry,
      "GHOST",
    );
    expect(sunk).toEqual({ x: 100, y: 54, width: 20, height: 24 });
    const draws = calls.filter((call) => call.name === "drawImage");
    expect(draws).toHaveLength(2);
    // Above the water, whole; under it, a ghost; both clipped and sunk.
    expect(draws.map((call) => call.alpha)).toEqual([
      1,
      NAVAL_WATERLINE_GHOST_ALPHA_V7,
    ]);
    expect(draws.every((call) => call.clipped)).toBe(true);
    expect(draws.every((call) => call.args[2] === 54)).toBe(true);
    // The clips meet under the keel row: y = 50 + (9 + 1) * 2 = 70.
    const clips = calls.filter((call) => call.name === "rect");
    expect(clips[0]?.args[1]).toBeLessThan(50);
    expect(Number(clips[0]?.args[1]) + Number(clips[0]?.args[3])).toBeCloseTo(
      70,
    );
    expect(clips[1]?.args[1]).toBe(70);
    // The foam: the keel row from one pixel left of the hull to one right.
    const foam = calls.filter((call) => call.name === "fillRect");
    expect(foam[0]?.args).toEqual([100 + 1 * 2, 50 + 9 * 2, 8 * 2, 2]);
    // The ring round the hull: its far half, then its near half.
    expect(calls.filter((call) => call.name === "ellipse")).toHaveLength(2);
  });

  it("draws no hull under the water in the CUT style", () => {
    const { context, calls } = recordingContext();
    drawNavalWaterlineSpriteV7(
      context,
      {} as CanvasImageSource,
      { x: 0, y: 0, width: 10, height: 12 },
      12,
      { sinkRows: 2, keel: 9, left: 2, right: 7 },
      "CUT",
    );
    expect(calls.filter((call) => call.name === "drawImage")).toHaveLength(1);
  });

  it("lists every faction's ships, not the Submarines, and is on in the live look", () => {
    const factions = [
      "human",
      "undead",
      "goblin",
      "dinosaur",
      "martian",
      "ice-folk",
      "dwarf",
      "candy",
      "cult",
    ];
    expect(Object.keys(NAVAL_WATERLINE_SPECS_V7).sort()).toEqual(
      factions
        .flatMap((faction) =>
          ["patrol-boat", "battleship", "transport"].map(
            (ship) => `chibi-naval-${faction}-${ship}`,
          ),
        )
        .sort(),
    );
    // A shallow sink: the deck, guns, oars and crew stay above the water.
    for (const spec of Object.values(NAVAL_WATERLINE_SPECS_V7)) {
      expect(spec.sinkRows).toBeGreaterThanOrEqual(2);
      expect(spec.sinkRows).toBeLessThanOrEqual(8);
    }
    for (const id of [
      "chibi-naval-goblin-submarine",
      "chibi-naval-goblin-submarine-submerged",
    ])
      expect(
        navalWaterlineOfV7(id, {} as HTMLImageElement, {
          width: 72,
          height: 88,
        }),
      ).toBeNull();
    expect(LIVE_DIRECTION_V7.navalWaterline).toBe("GHOST");
  });
});
