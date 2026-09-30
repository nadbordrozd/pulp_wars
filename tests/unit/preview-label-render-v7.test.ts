import { describe, expect, it } from "vitest";
import type { CommandV7, CoordV7 } from "../../src/engine/index";
import {
  drawBoardV7,
  previewSafeRectV7,
  type BoardRenderPlanEntryV7,
  type BoardRenderPlanV7,
  type LabelSafeAreaV7,
  type MapCommandTargetV7,
} from "../../src/render/canvas/board-renderer-v7";
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import type { CameraState } from "../../src/render/canvas/geometry";
import {
  PREVIEW_EDGE_MARGIN_CSS_PX_V7,
  PREVIEW_TEXT_MIN_FONT_CSS_PX_V7,
  PreviewLabelPlacerV7,
  wrapPreviewTextV7,
} from "../../src/render/canvas/preview-label-layout-v7";

/** Bead pulp_wars-nbl: preview labels stay visible and legible. */

const VIEWPORT = { width: 390, height: 700 } as const;
const LABEL_FILL = "#171722dd";
const NOTE_FILL = "#2a1633ee";
const ABILITY_FILL = "#171722e6";
const LONG_LABEL = "Deal 8 · take 0 · splash 8 to 2";
/** A 6 CSS px-per-character stand-in for canvas text metrics. */
const CHAR_WIDTH = 6;

interface Box {
  readonly fill: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

interface Text {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly font: string;
}

function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly boxes: Box[];
  readonly texts: Text[];
} {
  const boxes: Box[] = [];
  const texts: Text[] = [];
  const state: Record<string | symbol, unknown> = {
    font: "10px system-ui",
    fillStyle: "#000",
  };
  const context = new Proxy(state, {
    get: (target, key) => {
      if (key === "canvas") return undefined;
      if (key === "measureText")
        return (text: string) => ({ width: text.length * CHAR_WIDTH });
      if (key === "fillRect")
        return (left: number, top: number, width: number, height: number) =>
          boxes.push({
            fill: String(target.fillStyle),
            left,
            top,
            width,
            height,
          });
      if (key === "fillText")
        return (text: string, x: number, y: number) =>
          texts.push({ text, x, y, font: String(target.font) });
      if (key in target) return target[key];
      return () => undefined;
    },
    set: (target, key, value) => {
      target[key] = value;
      return true;
    },
  });
  return {
    context: context as unknown as CanvasRenderingContext2D,
    boxes,
    texts,
  };
}

function attack(
  at: CoordV7,
  previewLabel: string,
  previewNote?: string,
): MapCommandTargetV7 {
  return {
    at,
    command: {
      kind: "ATTACK",
      unitId: 1,
      targetUnitId: 2,
    } as unknown as CommandV7,
    family: "ATTACK",
    previewLabel,
    ...(previewNote === undefined ? {} : { previewNote }),
  };
}

function plan(
  targets: readonly MapCommandTargetV7[],
  abilityTargets: readonly { at: CoordV7; label: string }[] = [],
): BoardRenderPlanV7 {
  const entries: BoardRenderPlanEntryV7[] = [
    ...targets.map((target, index): BoardRenderPlanEntryV7 => ({
      key: `target:${index}`,
      layer: 90,
      at: target.at,
      kind: "TARGET",
      target,
    })),
    ...abilityTargets.map((entry, index): BoardRenderPlanEntryV7 => ({
      key: `ability:${index}`,
      layer: 91,
      at: entry.at,
      kind: "ABILITY_TARGET",
      abilityStyle: "WAIL",
      label: entry.label,
    })),
  ];
  return { version: 7, entries, targets };
}

/** Draws a plan with the camera putting cell (0, 0)'s centre at `origin`. */
function draw(input: {
  readonly plan: BoardRenderPlanV7;
  readonly zoom: number;
  readonly origin: { readonly x: number; readonly y: number };
  readonly labelSafeArea?: LabelSafeAreaV7;
}): { readonly boxes: Box[]; readonly texts: Text[] } {
  const { context, boxes, texts } = recordingContext();
  const camera: CameraState = {
    zoom: input.zoom,
    offsetX: input.origin.x,
    offsetY: input.origin.y,
  };
  drawBoardV7({
    context,
    viewport: VIEWPORT,
    devicePixelRatio: 1,
    camera,
    plan: input.plan,
    images: { resolve: () => null },
    ...(input.labelSafeArea === undefined
      ? {}
      : { labelSafeArea: input.labelSafeArea }),
  });
  return { boxes, texts };
}

function previewBoxes(boxes: readonly Box[]): Box[] {
  return boxes.filter((box) =>
    [LABEL_FILL, NOTE_FILL, ABILITY_FILL].includes(box.fill),
  );
}

function fontPx(font: string): number {
  const match = /(\d+(?:\.\d+)?)px/.exec(font);
  if (match?.[1] === undefined) throw new Error(`No font size in ${font}`);
  return Number(match[1]);
}

function overlaps(a: Box, b: Box): boolean {
  return (
    a.left < b.left + b.width &&
    b.left < a.left + a.width &&
    a.top < b.top + b.height &&
    b.top < a.top + a.height
  );
}

const MARGIN = PREVIEW_EDGE_MARGIN_CSS_PX_V7;
/** CHIBI zoom step 0.75, the smallest zoom (60 CSS px cells). */
const SMALLEST_CHIBI_ZOOM = chibiCameraZoom(0.75);

describe("board preview label layout (pulp_wars-nbl)", () => {
  it("clamps a label and its note inside the left viewport edge", () => {
    // The target's centre sits 10 px from the left edge, as on a phone
    // where the board is panned to its first column.
    const { boxes } = draw({
      plan: plan([attack({ x: 0, y: 3 }, LONG_LABEL, "Plagues 2 targets")]),
      zoom: SMALLEST_CHIBI_ZOOM,
      origin: { x: 10, y: 40 },
    });
    const drawn = previewBoxes(boxes);
    expect(drawn.map((box) => box.fill)).toEqual([LABEL_FILL, NOTE_FILL]);
    for (const box of drawn) {
      expect(box.left).toBeGreaterThanOrEqual(MARGIN);
      expect(box.left + box.width).toBeLessThanOrEqual(VIEWPORT.width);
    }
    // The stack moves as one: the label and note stay centred together.
    const [label, note] = drawn as [Box, Box];
    expect(label.left + label.width / 2).toBeCloseTo(
      note.left + note.width / 2,
    );
    expect(note.top).toBeCloseTo(label.top + label.height);
  });

  it("clamps a label inside the right viewport edge", () => {
    const zoom = SMALLEST_CHIBI_ZOOM;
    const { boxes, texts } = draw({
      plan: plan([attack({ x: 0, y: 3 }, LONG_LABEL, "Plagues 2 targets")]),
      zoom,
      origin: { x: VIEWPORT.width - 5, y: 40 },
    });
    for (const box of previewBoxes(boxes)) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.left + box.width).toBeLessThanOrEqual(
        VIEWPORT.width - MARGIN + 1e-9,
      );
    }
    // Every line's text stays inside its box.
    for (const text of texts) {
      const half = (text.text.length * CHAR_WIDTH) / 2;
      expect(text.x - half).toBeGreaterThanOrEqual(0);
      expect(text.x + half).toBeLessThanOrEqual(VIEWPORT.width);
    }
  });

  it("clamps labels below the HUD band top and above the dock", () => {
    const safe = { top: 105, bottom: 520 };
    // An ability label at the top of a cell just under the HUD, and an
    // attack stack in a cell whose lower half the dock covers.
    const { boxes } = draw({
      plan: plan(
        [attack({ x: 2, y: 8 }, LONG_LABEL, "Plagues 2 targets")],
        [{ at: { x: 2, y: 1 }, label: "−3" }],
      ),
      zoom: SMALLEST_CHIBI_ZOOM,
      origin: { x: 60, y: 60 },
      labelSafeArea: safe,
    });
    const drawn = previewBoxes(boxes);
    expect(drawn).toHaveLength(3);
    for (const box of drawn) {
      expect(box.top).toBeGreaterThanOrEqual(safe.top + MARGIN - 1e-9);
      expect(box.top + box.height).toBeLessThanOrEqual(
        safe.bottom - MARGIN + 1e-9,
      );
    }
  });

  it("clamps a label inside the top edge without a HUD", () => {
    const { boxes } = draw({
      plan: plan([], [{ at: { x: 1, y: 0 }, label: "−4 · Plague" }]),
      zoom: SMALLEST_CHIBI_ZOOM,
      origin: { x: 60, y: 8 },
    });
    const [label] = previewBoxes(boxes);
    expect(label?.top).toBeGreaterThanOrEqual(MARGIN);
  });

  it("keeps preview text at least 10 CSS px at zoom 0.75 and wraps it", () => {
    const { texts, boxes } = draw({
      plan: plan([attack({ x: 2, y: 3 }, LONG_LABEL, "Plagues 2 targets")]),
      zoom: SMALLEST_CHIBI_ZOOM,
      origin: { x: 60, y: 40 },
    });
    expect(PREVIEW_TEXT_MIN_FONT_CSS_PX_V7).toBe(10);
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts)
      expect(fontPx(text.font)).toBeGreaterThanOrEqual(
        PREVIEW_TEXT_MIN_FONT_CSS_PX_V7,
      );
    // The long attack label wraps at a separator rather than shrinking.
    expect(texts.map((text) => text.text)).toEqual([
      "Deal 8 · take 0",
      "splash 8 to 2",
      "Plagues 2 targets",
    ]);
    const [label] = previewBoxes(boxes);
    expect(label?.height).toBeCloseTo(10 * 1.8 + 10 * 1.2);
  });

  it("leaves an interior label at zoom 1 where it always was", () => {
    const zoom = 1;
    const origin = { x: 40, y: 40 };
    const at = { x: 1, y: 2 };
    const { boxes, texts } = draw({
      plan: plan([attack(at, "Deal 3", "Heal +2")]),
      zoom,
      origin,
    });
    const x = origin.x + at.x * 128;
    const y = origin.y + at.y * 128;
    const [label, note] = previewBoxes(boxes) as [Box, Box];
    expect(label).toEqual({
      fill: LABEL_FILL,
      left: x - 45,
      top: y + 39,
      width: 90,
      height: 18,
    });
    expect(note).toEqual({
      fill: NOTE_FILL,
      left: x - 45,
      top: y + 57,
      width: 90,
      height: 16,
    });
    expect(texts).toEqual([
      { text: "Deal 3", x, y: y + 52, font: "700 10px system-ui" },
      { text: "Heal +2", x, y: y + 69, font: "700 10px system-ui" },
    ]);
  });

  it("nudges neighbouring targets' labels apart", () => {
    const { boxes } = draw({
      plan: plan(
        [
          attack({ x: 2, y: 3 }, LONG_LABEL, "Plagues 2 targets"),
          attack({ x: 3, y: 3 }, LONG_LABEL, "Plagues 2 targets"),
          attack({ x: 3, y: 4 }, "Deal 10 · take 0 · splash 10 to 2"),
        ],
        [{ at: { x: 3, y: 4 }, label: "−4 · Plague" }],
      ),
      zoom: chibiCameraZoom(1),
      origin: { x: 40, y: 40 },
    });
    // Each target's label and note form one stack; stacks and the ability
    // label never overlap each other.
    const drawn = previewBoxes(boxes);
    expect(drawn).toHaveLength(6);
    const stacks: Box[] = [];
    for (let index = 0; index < drawn.length; index += 1) {
      const box = drawn[index] as Box;
      const next = drawn[index + 1];
      if (box.fill === LABEL_FILL && next?.fill === NOTE_FILL) {
        stacks.push({
          fill: "stack",
          left: Math.min(box.left, next.left),
          top: box.top,
          width: Math.max(box.width, next.width),
          height: box.height + next.height,
        });
        index += 1;
      } else stacks.push(box);
    }
    for (const [index, box] of stacks.entries())
      for (const other of stacks.slice(index + 1))
        expect(overlaps(box, other), JSON.stringify([box, other])).toBe(false);
  });
});

describe("preview label placer and wrapping", () => {
  const measure = (line: string): number => line.length * CHAR_WIDTH;

  it("wraps only at separators and only when too wide", () => {
    expect(wrapPreviewTextV7("Heal +2", 20, measure)).toEqual(["Heal +2"]);
    expect(wrapPreviewTextV7(LONG_LABEL, 500, measure)).toEqual([LONG_LABEL]);
    expect(
      wrapPreviewTextV7("Heal +2 · Rises as Zombie · Bites", 120, measure),
    ).toEqual(["Heal +2", "Rises as Zombie · Bites"]);
  });

  it("keeps a hidden target's label where it is", () => {
    const placer = new PreviewLabelPlacerV7({
      left: 4,
      top: 104,
      right: 386,
      bottom: 516,
    });
    // The target cell lies wholly under the HUD band.
    expect(
      placer.place(
        { left: -20, top: 40, width: 80, height: 18 },
        { left: -30, top: 0, right: 30, bottom: 60 },
      ),
    ).toEqual({ left: -20, top: 40 });
  });

  it("falls back to the whole viewport for a degenerate band", () => {
    expect(previewSafeRectV7(VIEWPORT, { top: 600, bottom: 580 })).toEqual({
      left: MARGIN,
      top: MARGIN,
      right: VIEWPORT.width - MARGIN,
      bottom: VIEWPORT.height - MARGIN,
    });
  });
});
