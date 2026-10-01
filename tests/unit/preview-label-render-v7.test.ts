import { describe, expect, it } from "vitest";
import {
  GOBLIN_ROLE_MECHANICS_V7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
  previewSafeRectV7,
  type BoardRenderPlanEntryV7,
  type BoardRenderPlanV7,
  type LabelSafeAreaV7,
  type MapCommandTargetV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  CHIBI_ZOOM_STEPS,
  chibiCameraZoom,
} from "../../src/render/canvas/chibi-geometry-v7";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  type CameraState,
} from "../../src/render/canvas/geometry";
import {
  PREVIEW_EDGE_MARGIN_CSS_PX_V7,
  PREVIEW_TEXT_MIN_FONT_CSS_PX_V7,
  PreviewLabelPlacerV7,
  previewLabelVariantsV7,
  wrapPreviewTextV7,
} from "../../src/render/canvas/preview-label-layout-v7";
import {
  GOBLIN_ATTACK_CHAIN_V7,
  GOBLIN_SHOWCASE_V7,
  goblinAttackChainFixtureV7,
  goblinShowcaseFixtureV7,
} from "../fixtures/v7-goblin-ui";

/** Bead pulp_wars-nbl: preview labels stay visible and legible. */

const VIEWPORT = { width: 390, height: 700 } as const;
const LABEL_FILL = "#171722dd";
const NOTE_FILL = "#2a1633ee";
const ABILITY_FILL = "#171722e6";
/** A warning box and a friendly-fire hit label. */
const WARNING_FILL = "#4d3500f2";
const LETHAL_FILL = "#8f1f22ee";
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

function recordingContext(
  /** Text width per character for a font; 6 CSS px by default. */
  charWidth: (font: string) => number = () => CHAR_WIDTH,
): {
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
        return (text: string) => ({
          width: text.length * charWidth(String(target.font)),
        });
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
      placer.placeFirst([{ left: -20, top: 40, width: 80, height: 18 }], {
        left: -30,
        top: 0,
        right: 30,
        bottom: 60,
      }),
    ).toEqual({ left: -20, top: 40, variant: 0 });
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

/**
 * Bead pulp_wars-0ao.12: the dense Goblin review fixtures (the attack-chain
 * death blasts, the armed Kaboom! and the friendly bomb splash) never draw
 * one preview label over another, at every zoom, on desktop and phone.
 */
describe("dense Goblin preview labels never overlap (pulp_wars-0ao.12)", () => {
  /** Fills of every board preview label and stack box. */
  const PREVIEW_FILLS = new Set([
    LABEL_FILL,
    NOTE_FILL,
    ABILITY_FILL,
    WARNING_FILL,
    LETHAL_FILL,
  ]);
  /** Bold system-ui is about 0.62 em per character. */
  const charWidth = (font: string): number => fontPx(font) * 0.62;
  const NO_INTERACTION = {
    selection: null,
    selectedUnitId: null,
    selectedAchievement: null,
  } as const;

  interface Scene {
    readonly name: string;
    readonly plan: BoardRenderPlanV7;
    readonly focus: CoordV7;
    /** Hit labels the preview draws. */
    readonly hitLabels: readonly string[];
  }

  function scenes(): readonly Scene[] {
    const chainState = goblinAttackChainFixtureV7();
    const chainView = viewForV7(chainState, chainState.humanPlayerId);
    const attacker = unitAt(chainView, GOBLIN_ATTACK_CHAIN_V7.attacker);
    const chainPlan = buildBoardRenderPlanV7(
      chainView,
      queryPlayerCommandsV7(chainView),
      {
        ...NO_INTERACTION,
        selection: { kind: "UNIT", unitId: attacker.id },
        selectedUnitId: attacker.id,
      },
    );
    const showcaseState = goblinShowcaseFixtureV7();
    const showcase = viewForV7(showcaseState, showcaseState.humanPlayerId);
    const kaboom = unitAt(showcase, GOBLIN_SHOWCASE_V7.kaboom);
    const kaboomPlan = buildBoardRenderPlanV7(
      showcase,
      queryPlayerCommandsV7(showcase),
      {
        ...NO_INTERACTION,
        selection: { kind: "UNIT", unitId: kaboom.id },
        selectedUnitId: kaboom.id,
        kaboomPreviewUnitId: kaboom.id,
      },
    );
    const chucker = unitAt(showcase, GOBLIN_SHOWCASE_V7.bombChucker);
    const bombPlan = buildBoardRenderPlanV7(
      showcase,
      queryPlayerCommandsV7(showcase),
      {
        ...NO_INTERACTION,
        selection: { kind: "UNIT", unitId: chucker.id },
        selectedUnitId: chucker.id,
      },
    );
    const chainTarget = chainPlan.targets.find(
      (target) => target.blast !== undefined,
    );
    return [
      {
        name: "attack-chain",
        plan: chainPlan,
        focus: GOBLIN_ATTACK_CHAIN_V7.bombChucker,
        hitLabels: (chainTarget?.blast?.cells ?? []).map((cell) => cell.label),
      },
      {
        name: "kaboom-armed",
        plan: kaboomPlan,
        focus: GOBLIN_SHOWCASE_V7.kaboom,
        hitLabels: kaboomPlan.entries.flatMap((entry) =>
          entry.kind === "ABILITY_TARGET" ? [entry.label ?? ""] : [],
        ),
      },
      {
        name: "bomb-splash",
        plan: bombPlan,
        focus: GOBLIN_SHOWCASE_V7.bombTarget,
        hitLabels: ["Yours −4"],
      },
    ];
  }

  const SIZES = [
    {
      name: "phone",
      viewport: { width: 390, height: 844 },
      // The HUD row above, the selection dock (with the Kaboom! panel) below.
      safe: { top: 60, bottom: 520 },
    },
    {
      name: "desktop",
      viewport: { width: 1440, height: 1000 },
      safe: { top: 64, bottom: 850 },
    },
  ] as const;
  const ZOOMS = [
    ...CHIBI_ZOOM_STEPS.map((step) => chibiCameraZoom(step)),
    MIN_ZOOM,
    1,
    MAX_ZOOM,
  ];

  function drawScene(
    scene: Scene,
    size: (typeof SIZES)[number],
    zoom: number,
    screen: { readonly x: number; readonly y: number },
  ): { readonly boxes: Box[]; readonly texts: Text[] } {
    const { context, boxes, texts } = recordingContext(charWidth);
    const cell = 128 * zoom;
    drawBoardV7({
      context,
      viewport: size.viewport,
      devicePixelRatio: 1,
      camera: {
        zoom,
        offsetX: screen.x - scene.focus.x * cell,
        offsetY: screen.y - scene.focus.y * cell,
      },
      plan: scene.plan,
      images: { resolve: () => null },
      previewFocus: scene.focus,
      labelSafeArea: size.safe,
    });
    return {
      boxes: boxes.filter((box) => PREVIEW_FILLS.has(box.fill)),
      texts,
    };
  }

  it("places every label clear of every other label", () => {
    let checked = 0;
    for (const scene of scenes())
      for (const size of SIZES)
        for (const zoom of ZOOMS) {
          const cell = 128 * zoom;
          const middle = (size.safe.top + size.safe.bottom) / 2;
          const centre = { x: size.viewport.width / 2, y: middle };
          // The cluster centred, and pushed against each edge of the band.
          for (const screen of [
            centre,
            { x: cell * 0.6, y: middle },
            { x: size.viewport.width - cell * 0.6, y: middle },
            { x: centre.x, y: size.safe.top + cell * 0.6 },
            { x: centre.x, y: size.safe.bottom - cell * 0.6 },
          ]) {
            const { boxes, texts } = drawScene(scene, size, zoom, screen);
            const where = `${scene.name} ${size.name} zoom ${zoom.toFixed(3)} at ${screen.x.toFixed(0)},${screen.y.toFixed(0)}`;
            expect(boxes.length, where).toBeGreaterThan(0);
            for (const [index, box] of boxes.entries())
              for (const other of boxes.slice(index + 1))
                expect(
                  overlaps(box, other),
                  `${where}: ${JSON.stringify([box, other])}`,
                ).toBe(false);
            // With the cluster centred every hit keeps a label: the full
            // text or, in a crowd, its shorter form.
            if (screen === centre) {
              const drawn = texts.map((text) => text.text);
              for (const label of scene.hitLabels)
                expect(
                  previewLabelVariantsV7(label).some((variant) =>
                    drawn.includes(variant),
                  ),
                  `${where}: ${label} in ${JSON.stringify(drawn)}`,
                ).toBe(true);
            }
            checked += 1;
          }
        }
    expect(checked).toBe(3 * 2 * ZOOMS.length * 5);
  });

  it("shortens the attack-chain warnings to their summary on a phone", () => {
    const chain = scenes()[0];
    if (chain === undefined) throw new Error("attack-chain scene missing");
    const { texts } = drawScene(chain, SIZES[0], chibiCameraZoom(0.75), {
      x: 195,
      y: 290,
    });
    const drawn = texts.map((text) => text.text);
    // The blasts follow the Goblin registry (tuned by `pulp_wars-0ao.7`):
    // the Bomb Chucker's death blast hits the Guard and the attacker, the
    // Rocket Cart's (2 HP, wave 2) the attacker and the Marksman.
    const chucker = GOBLIN_ROLE_MECHANICS_V7.MARKSMAN.deathBlastDamage ?? 0;
    const cart = GOBLIN_ROLE_MECHANICS_V7.CATAPULT.deathBlastDamage ?? 0;
    // The hit labels keep their cells; the attack keeps its damage line
    // (wrapped at the phone zoom) and the long warnings collapse into the
    // short summary.
    expect(drawn).toEqual(
      expect.arrayContaining([
        `Yours −${chucker}`,
        `Attacker −${chucker + cart}`,
        `−${Math.min(chucker, 2)} · Wave 2`,
        `Yours −${cart}`,
        "Deal 2",
        "take 0",
        "Chain: 2 blasts",
        "3 yours hit",
      ]),
    );
    expect(drawn.some((text) => text.startsWith("Enemy Bomb Chucker"))).toBe(
      false,
    );
  });
});

describe("preview label variants (pulp_wars-0ao.12)", () => {
  it("shortens a hit label to its first part, then its amount", () => {
    expect(previewLabelVariantsV7("Yours −3 · Wave 2")).toEqual([
      "Yours −3 · Wave 2",
      "Yours −3",
      "−3",
    ]);
    expect(previewLabelVariantsV7("Attacker −8")).toEqual([
      "Attacker −8",
      "−8",
    ]);
    expect(previewLabelVariantsV7("−4")).toEqual(["−4"]);
    expect(previewLabelVariantsV7("Kaboom!")).toEqual(["Kaboom!"]);
  });

  it("never places two boxes over each other and falls back in order", () => {
    const placer = new PreviewLabelPlacerV7({
      left: 0,
      top: 30,
      right: 200,
      bottom: 130,
    });
    const anchor = { left: 50, top: 50, right: 110, bottom: 110 };
    const wide = { left: 0, top: 60, width: 200, height: 40 };
    const narrow = { left: 70, top: 60, width: 20, height: 12 };
    expect(placer.placeFirst([wide], anchor)).toEqual({
      left: 0,
      top: 60,
      variant: 0,
    });
    // The wide variant cannot move clear within a cell; the narrow one can.
    expect(placer.placeFirst([wide, narrow], anchor)?.variant).toBe(1);
    // A pseudo-random crowd: every accepted box is clear of the others.
    let seed = 7;
    const random = (): number => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
      return seed / 2_147_483_648;
    };
    for (let index = 0; index < 300; index += 1) {
      const x = random() * 200;
      const y = random() * 200;
      placer.placeFirst(
        [
          { left: x - 40, top: y, width: 80, height: 18 },
          { left: x - 12, top: y, width: 24, height: 14 },
        ],
        { left: x - 30, top: y - 30, right: x + 30, bottom: y + 30 },
      );
    }
    const placed = placer.placed;
    expect(placed.length).toBeGreaterThan(10);
    for (const [index, box] of placed.entries())
      for (const other of placed.slice(index + 1))
        expect(
          box.left < other.right &&
            other.left < box.right &&
            box.top < other.bottom &&
            other.top < box.bottom,
        ).toBe(false);
  });
});

function unitAt(
  view: PlayerViewV7,
  at: CoordV7,
): PlayerViewV7["units"][number] {
  const unit = view.units.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined) throw new Error(`no unit at ${at.x},${at.y}`);
  return unit;
}
