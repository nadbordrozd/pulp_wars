import { describe, expect, it } from "vitest";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
  type BoardRenderPlanV7,
  type BoardSelectionV7,
} from "../../src/render/canvas/board-renderer-v7";
import type { ChibiBoardArtV7 } from "../../src/render/canvas/chibi-art-resolver-v7";
import {
  chibiCameraZoom,
  chibiDestinationRect,
} from "../../src/render/canvas/chibi-geometry-v7";
import { LIVE_DIRECTION_ART_REGISTRY_V7 } from "../../src/render/canvas/live-board-look-v7";
import { drawSupportFeedbackV7 } from "../../src/render/canvas/support-presentation-v7";
import { UNIT_SHADOW_TABLE_V7 } from "../../src/render/canvas/unit-shadows-v7";
import {
  DIRECTED_GROUND_SHADOW_COLOUR_V7,
  LIVE_DIRECTION_V7,
  createDirectedChibiArtV7,
} from "../../src/render/canvas/visual-direction-v7";
import {
  ROUND2_UI_V7,
  round2GateBlockedUiFixtureV7,
  round2SaucerUiFixtureV7,
} from "../fixtures/v7-curiosities-round2-ui";

/**
 * Map curiosities round 2 on the canvas (bead pulp_wars-737.16): the live
 * look draws the round-2 rasters (the Downed Saucer, both gates, the Well,
 * Bigfoot on its measured shadow); LEGACY and the classic look draw the
 * code markers and a code Bigfoot; the gate Move preview marks the exit and
 * the shove, or the exit as blocked; and the gate and Well cues draw their
 * sprites.
 */
type LogEntry = readonly unknown[];

function recordingContext(): {
  readonly context: CanvasRenderingContext2D;
  readonly log: LogEntry[];
} {
  const log: LogEntry[] = [];
  const context = new Proxy(
    { measureText: () => ({ width: 20 }) },
    {
      get: (target, key) =>
        key === "canvas"
          ? undefined
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
  return { context: context as unknown as CanvasRenderingContext2D, log };
}

const liveArt: ChibiBoardArtV7 = {
  resolve: (request) => {
    const asset = LIVE_DIRECTION_ART_REGISTRY_V7.variants(request.subject)[0];
    return asset === undefined
      ? { kind: "MISSING" }
      : {
          kind: "READY",
          asset,
          image: { assetId: asset.id } as unknown as CanvasImageSource,
          density: 1,
          smoothing: false,
          cacheKey: asset.id,
        };
  },
};
const classicArt: ChibiBoardArtV7 = { resolve: () => ({ kind: "MISSING" }) };

const AT = ROUND2_UI_V7;
const camera = { zoom: chibiCameraZoom(1), offsetX: 40, offsetY: 40 };
const centre = (at: CoordV7) => ({ x: 40 + at.x * 80, y: 40 + at.y * 80 });

function unitAt(state: GameStateV7, at: CoordV7) {
  const unit = state.units.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  if (unit === undefined) throw new Error("no unit there");
  return unit;
}

function plan(
  state: GameStateV7,
  selection: BoardSelectionV7 | null = null,
  only = true,
): BoardRenderPlanV7 {
  const view = viewForV7(state, state.humanPlayerId);
  const full = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
    selection,
    selectedUnitId: selection?.kind === "UNIT" ? selection.unitId : null,
    selectedAchievement: null,
  });
  // Only the curiosities and the neutral units: the test reads their calls.
  return only
    ? {
        ...full,
        entries: full.entries.filter(
          (entry) => entry.kind === "CURIOSITY" || entry.monster !== undefined,
        ),
      }
    : {
        ...full,
        entries: full.entries.filter((entry) => entry.kind !== "TERRAIN"),
      };
}

function draw(
  look: "LIVE" | "CLASSIC" | "LEGACY",
  board: BoardRenderPlanV7 = plan(round2SaucerUiFixtureV7()),
): LogEntry[] {
  const { context, log } = recordingContext();
  drawBoardV7({
    context,
    viewport: { width: 1800, height: 1800 },
    devicePixelRatio: 1,
    camera,
    plan: board,
    images: { resolve: () => null },
    reducedMotion: true,
    ...(look === "LEGACY"
      ? { artSet: "LEGACY" as const }
      : { artSet: "CHIBI" as const, chibiArt: classicArt }),
    ...(look === "LIVE"
      ? {
          direction: {
            spec: LIVE_DIRECTION_V7,
            art: createDirectedChibiArtV7({
              base: classicArt,
              samples: liveArt,
              direction: LIVE_DIRECTION_V7,
              environment: {
                readPixels: (_image, width, height) =>
                  new Uint8ClampedArray(width * height * 4).fill(200),
                createSurface: (pixels, width, height) =>
                  ({ pixels, width, height }) as unknown as CanvasImageSource,
              },
            }),
          },
        }
      : {}),
  });
  return log;
}

const imagesDrawn = (log: readonly LogEntry[]): string[] =>
  log
    .filter((call) => call[0] === "drawImage")
    .map((call) => (call[1] as { assetId?: string }).assetId ?? "?");

describe("curiosities round two on the canvas", () => {
  it("draws the round-2 rasters in the live look, each overlay filling its cell", () => {
    const log = draw("LIVE");
    const drawn = imagesDrawn(log);
    for (const id of [
      "chibi-curiosity-downed-saucer",
      "chibi-curiosity-wishing-well",
      "chibi-curiosity-bigfoot",
    ])
      expect(drawn, id).toContain(id);
    expect(drawn.filter((id) => id === "chibi-curiosity-gate")).toHaveLength(2);
    // The guards wear the Martian sprites.
    expect(drawn.some((id) => id.includes("martian"))).toBe(true);
    for (const [id, at] of [
      ["chibi-curiosity-downed-saucer", AT.camp],
      ["chibi-curiosity-wishing-well", AT.well],
    ] as const) {
      const call = log.find(
        (entry) =>
          entry[0] === "drawImage" &&
          (entry[1] as { assetId?: string }).assetId === id,
      );
      const at0 = centre(at);
      expect(call?.slice(2), id).toEqual([at0.x - 40, at0.y - 40, 80, 80]);
    }
  });

  it("stands Bigfoot on its measured giant shadow", () => {
    const log = draw("LIVE");
    const anchor = UNIT_SHADOW_TABLE_V7["UNIT:NEUTRAL_BIGFOOT"];
    const asset = LIVE_DIRECTION_ART_REGISTRY_V7.variants(
      "UNIT:NEUTRAL_BIGFOOT",
    )[0];
    if (anchor?.shadow == null || asset === undefined)
      throw new Error("no Bigfoot anchor");
    const rect = chibiDestinationRect(centre(AT.bigfoot), camera, asset, 1);
    const anchorShadow = anchor.shadow;
    let style: unknown = null;
    let ellipse: number[] | null = null;
    const shadows: number[][] = [];
    for (const call of log) {
      if (call[0] === "ellipse") ellipse = call.slice(1, 5).map(Number);
      if (call[0] === "set" && call[1] === "fillStyle") style = call[2];
      if (
        call[0] === "fill" &&
        style === DIRECTED_GROUND_SHADOW_COLOUR_V7 &&
        ellipse !== null
      )
        shadows.push(ellipse);
    }
    expect(
      shadows.some(
        (shadow) =>
          Math.abs((shadow[0] ?? 0) - (rect.x + anchorShadow.x)) < 0.01 &&
          Math.abs((shadow[1] ?? 0) - (rect.y + anchorShadow.y)) < 0.01,
      ),
    ).toBe(true);
  });

  for (const look of ["CLASSIC", "LEGACY"] as const)
    it(`${look}: draws code markers and a code Bigfoot, and no curiosity raster`, () => {
      const log = draw(look);
      expect(
        imagesDrawn(log).filter(
          (id) => id.startsWith("chibi-curiosity") || id === "?",
        ),
      ).toEqual([]);
      // A saucer, two rings of stones, a well and a footprint disc.
      expect(
        log.filter(
          (entry) => entry[0] === "stroke" || entry[0] === "strokeRect",
        ).length,
      ).toBeGreaterThan(20);
      // Each provoked guard wears the code "!" marker; Bigfoot none.
      expect(
        log.filter((entry) => entry[0] === "fillText").map((entry) => entry[1]),
      ).toEqual(["!", "!", "!"]);
    });
});

describe("the gate Move preview on the canvas", () => {
  const labels = (log: readonly LogEntry[]): unknown[] =>
    log.filter((call) => call[0] === "fillText").map((call) => call[1]);
  const strokes = (log: readonly LogEntry[]): unknown[] =>
    log
      .filter((call) => call[0] === "set" && call[1] === "strokeStyle")
      .map((call) => call[2]);

  it("marks the exit and the tile its occupant is shoved to", () => {
    const state = round2SaucerUiFixtureV7();
    const traveller = unitAt(state, AT.traveller);
    const log = draw(
      "LEGACY",
      plan(state, { kind: "UNIT", unitId: traveller.id }, false),
    );
    expect(labels(log)).toEqual(expect.arrayContaining(["Exit", "Shoved"]));
    expect(strokes(log)).toEqual(
      expect.arrayContaining(["#ece8ff", "#c9c0f2"]),
    );
  });

  it("marks a blocked exit with a cross", () => {
    const state = round2GateBlockedUiFixtureV7();
    const traveller = unitAt(state, AT.traveller);
    const log = draw(
      "LEGACY",
      plan(state, { kind: "UNIT", unitId: traveller.id }, false),
    );
    expect(labels(log)).toContain("Blocked");
    expect(labels(log)).not.toContain("Shoved");
    expect(strokes(log)).toContain("#aab3c0");
  });
});

describe("the round-2 curiosity cues", () => {
  const art = {
    devicePixelRatio: 1,
    image: (subject: string) => ({
      image: { subject } as unknown as CanvasImageSource,
      width: 48,
      height: 48,
    }),
  };
  const cue = (
    effect: "GATE" | "WELL",
    amount: number | undefined,
    sprites: boolean,
    progress = 0.3,
  ): LogEntry[] => {
    const { context, log } = recordingContext();
    drawSupportFeedbackV7(
      context,
      camera,
      {
        effect,
        actor: {
          unitId: 1,
          at: AT.gateA,
          ...(amount === undefined ? {} : { amount }),
        },
        recipients: effect === "GATE" ? [{ unitId: 1, at: AT.gateB }] : [],
        progress,
      },
      false,
      sprites ? art : null,
    );
    return log;
  };
  const subjects = (log: readonly LogEntry[]): string[] =>
    log
      .filter((call) => call[0] === "drawImage")
      .map((call) => (call[1] as { subject: string }).subject);

  it("bursts at both gates and splashes the Coin with its Coins", () => {
    expect(subjects(cue("GATE", undefined, true))).toEqual([
      "EFFECT:GATE_TRAVERSE",
      "EFFECT:GATE_TRAVERSE",
    ]);
    const well = cue("WELL", 5, true);
    expect(subjects(well)).toEqual(["EFFECT:COIN_SPLASH"]);
    expect(
      well.filter((call) => call[0] === "fillText").map((call) => call[1]),
    ).toEqual(["+5"]);
  });

  it("keeps a code cue without the sprites, with no negative radius at any progress", () => {
    for (const effect of ["GATE", "WELL"] as const)
      for (const progress of [-1, 0, 0.5, 1, 2]) {
        const log = cue(effect, undefined, false, progress);
        expect(subjects(log)).toEqual([]);
        for (const call of log.filter((entry) => entry[0] === "ellipse"))
          expect(
            Math.min(Number(call[3]), Number(call[4])),
            `${effect} ${progress}`,
          ).toBeGreaterThanOrEqual(0);
      }
  });
});
