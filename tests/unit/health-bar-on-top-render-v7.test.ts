import { describe, expect, it } from "vitest";
import {
  CULT_FROG_UNIT_SUBJECT_V7,
  type ArtSubjectV7,
} from "../../src/assets/chibi-art-v7";
import {
  CHIBI_OVERLAY_FRAME_V7,
  drawBoardV7,
  type BoardRenderPlanEntryV7,
  type BoardRenderPlanV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  CULT_PIP_ROW_BOTTOM_V7,
  cultPipRowPlateV7,
  drawCultControlPipsV7,
} from "../../src/render/canvas/cult-channel-canvas-v7";
import { drawCultTrickUnitMarkersV7 } from "../../src/render/canvas/cult-ritual-canvas-v7";
import {
  DIRECTED_BASE_HP_BAR_TOP_V7,
  LIVE_DIRECTION_V7,
  drawDirectedHpBarV7,
  drawDirectedPieceChromeV7,
} from "../../src/render/canvas/visual-direction-v7";
import { readyBoardArtV7 } from "../fixtures/v7-board-art";

// Bead pulp_wars-2yc.71: a unit's HP bar is drawn over every status mark on
// it (Sticky Toffee, frost, a frog's badge, afflictions, the Cult's strands
// and pips), and a summon shows its Control pips and its HP bar together.

type LogEntry = readonly unknown[];

function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly log: LogEntry[];
} {
  const log: LogEntry[] = [];
  const context = new Proxy(
    {},
    {
      get: (target, key) =>
        key === "canvas"
          ? undefined
          : key === "measureText"
            ? (text: string) => ({ width: text.length * 6 })
            : key === "createLinearGradient" || key === "createRadialGradient"
              ? () => ({ addColorStop: () => undefined })
              : key in target
                ? Reflect.get(target, key)
                : (...args: unknown[]) => {
                    log.push([String(key), ...args]);
                  },
      set: (target, key, value) => {
        log.push(["set", String(key), value]);
        return Reflect.set(target, key, value);
      },
    },
  );
  return { context: context as CanvasRenderingContext2D, log };
}

const CORAL = "#f06762";
const TEAL = "#28b7a4";

function unit(
  id: number,
  x: number,
  y: number,
  artSubject: ArtSubjectV7,
  extra: Partial<BoardRenderPlanEntryV7> = {},
): BoardRenderPlanEntryV7 {
  return {
    key: `unit:${id}`,
    kind: "UNIT",
    layer: 5,
    at: { x, y },
    assetId: `asset:${artSubject}`,
    artSubject,
    ownerColor: CORAL,
    ownerSeat: 0,
    hp: 4,
    maxHp: 10,
    ...extra,
  };
}

/** Five wounded units, each wearing status art over its feet or its base. */
const UNITS: readonly BoardRenderPlanEntryV7[] = [
  // Sticky Toffee round the feet, a Toothache tooth and a Bite.
  unit(1, 0, 0, "UNIT:FIGHTER", {
    candy: {
      rushed: false,
      crashed: false,
      splatted: false,
      home: false,
      stuck: true,
      toothache: true,
    },
    afflictions: ["BITTEN", "PLAGUE"],
  }),
  // Frozen, Berserk and terrified.
  unit(2, 1, 0, "UNIT:GUARD", {
    ownerColor: TEAL,
    ownerSeat: 1,
    iceFolk: { frozen: { turnsLeft: 2 }, shatterWindow: null, witch: false },
    berserk: true,
    terror: true,
  }),
  // A frog, with the badge of what it was over its base's left end.
  unit(3, 2, 0, CULT_FROG_UNIT_SUBJECT_V7, {
    ownerColor: TEAL,
    ownerSeat: 1,
    hp: 2,
    cult: {
      frog: {
        subject: CULT_FROG_UNIT_SUBJECT_V7,
        original: "Knight",
        portraitSubject: "PORTRAIT:KNIGHT",
        artSubject: "UNIT:KNIGHT",
        afloat: false,
      },
      eye: true,
    },
  }),
  // A bound Horror held by fewer strands than its Control.
  unit(4, 0, 1, "UNIT:CULT:HORROR", {
    hp: 5,
    cult: { control: { control: 3, strands: 2 }, candle: true },
  }),
  // An Unbound Herald being bound, Furious (neutral: no owner).
  neutral(
    unit(5, 1, 1, "UNIT:CULT:HERALD_UNBOUND", {
      hp: 7,
      maxHp: 12,
      cult: {
        unbound: true,
        furious: true,
        control: { control: 3, strands: 1, binding: true },
      },
    }),
  ),
];

function neutral(entry: BoardRenderPlanEntryV7): BoardRenderPlanEntryV7 {
  return Object.fromEntries(
    Object.entries(entry).filter(
      ([key]) => key !== "ownerColor" && key !== "ownerSeat",
    ),
  ) as unknown as BoardRenderPlanEntryV7;
}

const PLAN: BoardRenderPlanV7 = {
  entries: [
    ...[0, 1, 2].flatMap((x) =>
      [0, 1].map((y): BoardRenderPlanEntryV7 => ({
        key: `terrain:${x},${y}`,
        kind: "TERRAIN",
        layer: 1,
        at: { x, y },
        assetId: "v7-terrain-grass-1",
        artSubject: "TERRAIN:GRASS",
      })),
    ),
    // A strand from the Hexer-less channeller cell to the Horror, over the
    // Horror's base.
    {
      key: "link:strand",
      kind: "LINK",
      layer: 6,
      at: { x: 0, y: 1 },
      linkTo: { x: 2, y: 1 },
      label: "CULT_LINK",
      cultLink: { kind: "STRAND", holds: true },
    },
    ...UNITS,
  ],
  targets: [],
} as unknown as BoardRenderPlanV7;

const ZOOM = 1;
const OFFSET = 100;
const centre = (at: { readonly x: number; readonly y: number }) => ({
  x: OFFSET + at.x * 128 * ZOOM,
  y: OFFSET + at.y * 128 * ZOOM,
});

function draw(live: boolean): LogEntry[] {
  const { context, log } = recordingContext();
  const art = readyBoardArtV7();
  drawBoardV7({
    context,
    viewport: { width: 800, height: 600 },
    devicePixelRatio: 1,
    camera: { zoom: ZOOM, offsetX: OFFSET, offsetY: OFFSET },
    plan: PLAN,
    chibiArt: art,
    reducedMotion: true,
    ...(live ? { direction: { spec: LIVE_DIRECTION_V7, art } } : {}),
  });
  return log;
}

const PAINTS = new Set([
  "fill",
  "stroke",
  "fillRect",
  "strokeRect",
  "drawImage",
  "fillText",
  "strokeText",
]);

/** Index in `log` of the dark track of each unit's HP bar. */
function hpTrackIndices(log: readonly LogEntry[], live: boolean): number[] {
  return UNITS.map((entry) => {
    const { x, y } = centre(entry.at);
    const track = live
      ? ["fillRect", x - 27, y + DIRECTED_BASE_HP_BAR_TOP_V7, 54, 8]
      : [
          "fillRect",
          x + CHIBI_OVERLAY_FRAME_V7.hpBar.left,
          y + CHIBI_OVERLAY_FRAME_V7.hpBar.top,
          CHIBI_OVERLAY_FRAME_V7.hpBar.width,
          CHIBI_OVERLAY_FRAME_V7.hpBar.height,
        ];
    const index = log.findIndex(
      (call) => JSON.stringify(call) === JSON.stringify(track),
    );
    expect(index, `HP bar of ${entry.key}`).toBeGreaterThanOrEqual(0);
    return index;
  });
}

describe("the HP bar over every status mark (bead pulp_wars-2yc.71)", () => {
  for (const live of [true, false])
    it(`${live ? "live look" : "classic look"}: nothing is painted over an HP bar`, () => {
      const log = draw(live);
      const tracks = hpTrackIndices(log, live);
      const first = Math.min(...tracks);
      // The status art was drawn: the frost, Berserk and Terror glyphs, the
      // afflictions, the toffee, the frog's badge, the strand and the pips.
      const before = log.slice(0, first);
      const images = before
        .filter((call) => call[0] === "drawImage")
        .map((call) => (call[1] as { readonly id?: string }).id);
      expect(images).toContain("ICON:STATUS:FROZEN");
      expect(images).toContain("PORTRAIT:KNIGHT");
      expect(before.some((call) => call[0] === "roundRect")).toBe(true);
      // After the first HP bar only HP bars are painted: a dark track and
      // its fill for each wounded unit, and nothing else on the board.
      const after = log
        .slice(first)
        .filter((call) => PAINTS.has(String(call[0])));
      expect(after.every((call) => call[0] === "fillRect")).toBe(true);
      expect(after).toHaveLength(UNITS.length * 2);
    });

  it("draws the live look's bar later than the piece chrome, exactly as before", () => {
    const entry = UNITS[0] as BoardRenderPlanEntryV7;
    const deferred = recordingContext();
    const handled = drawDirectedPieceChromeV7(
      deferred.context,
      LIVE_DIRECTION_V7,
      entry,
      0,
      0,
      1,
      false,
      false,
      true,
    );
    // The chrome says it handles the bar but draws none of it ...
    expect(handled.hp).toBe(true);
    expect(deferred.log.filter((call) => call[0] === "fillRect")).toEqual([]);
    // ... and the bar alone draws what the chrome used to.
    const inline = recordingContext();
    drawDirectedPieceChromeV7(
      inline.context,
      LIVE_DIRECTION_V7,
      entry,
      0,
      0,
      1,
    );
    const bar = recordingContext();
    drawDirectedHpBarV7(bar.context, LIVE_DIRECTION_V7, entry, 0, 0, 1);
    const rects = (log: readonly LogEntry[]) =>
      log.filter((call) => call[0] === "fillRect");
    expect(rects(bar.log)).toEqual(rects(inline.log));
    expect(rects(bar.log)[0]).toEqual([
      "fillRect",
      -27,
      DIRECTED_BASE_HP_BAR_TOP_V7,
      54,
      8,
    ]);
  });
});

describe("a summon's pips and HP bar together (bead pulp_wars-2yc.71)", () => {
  it("draws the Control pips of a wounded daemon just above its HP bar", () => {
    const log = draw(true);
    for (const entry of UNITS.filter((item) => item.cult?.control)) {
      const { x, y } = centre(entry.at);
      const plates = log.filter(
        (call) =>
          call[0] === "roundRect" &&
          Math.abs(Number(call[1]) + Number(call[3]) / 2 - x) < 1 &&
          Number(call[2]) > y,
      );
      expect(plates, `pips of ${entry.key}`).toHaveLength(1);
      const [, , top, , height] = plates[0] as number[];
      // The plate ends above the bar's top, and the bar is drawn too.
      expect((top as number) + (height as number)).toBeLessThan(
        y + DIRECTED_BASE_HP_BAR_TOP_V7,
      );
      expect(
        log.some(
          (call) =>
            JSON.stringify(call) ===
            JSON.stringify([
              "fillRect",
              x - 27,
              y + DIRECTED_BASE_HP_BAR_TOP_V7,
              54,
              8,
            ]),
        ),
      ).toBe(true);
    }
  });

  it("keeps the pip row clear of the bar at every zoom and pip count", () => {
    for (const zoom of [0.3, 0.46875, 0.625, 1, 1.25]) {
      for (const control of [1, 2, 3, 4]) {
        const { context, log } = recordingContext();
        drawCultControlPipsV7(context, 0, 0, zoom, {
          control,
          strands: control - 1,
        });
        const plate = log.find((call) => call[0] === "roundRect") as number[];
        const bottom = (plate[2] as number) + (plate[4] as number);
        expect(bottom).toBeCloseTo(CULT_PIP_ROW_BOTTOM_V7 * zoom, 6);
        // The red rim of a short daemon is stroked on the plate's edge.
        expect(bottom + Math.max(1, 1.6 * zoom) / 2).toBeLessThan(
          DIRECTED_BASE_HP_BAR_TOP_V7 * zoom,
        );
      }
      expect(
        cultPipRowPlateV7(0, zoom, 6 * zoom).cy +
          cultPipRowPlateV7(0, zoom, 6 * zoom).height / 2,
      ).toBeLessThan(DIRECTED_BASE_HP_BAR_TOP_V7 * zoom);
    }
  });

  it("puts a Tentacle's turns in the same row above its bar", () => {
    const { context, log } = recordingContext();
    drawCultTrickUnitMarkersV7(context, { sinks: 2 }, 0, 0, 1, {});
    const plate = log.find((call) => call[0] === "roundRect") as number[];
    expect((plate[2] as number) + (plate[4] as number)).toBeCloseTo(
      CULT_PIP_ROW_BOTTOM_V7,
      6,
    );
    expect(CULT_PIP_ROW_BOTTOM_V7).toBeLessThan(DIRECTED_BASE_HP_BAR_TOP_V7);
  });
});
