import { describe, expect, it } from "vitest";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
} from "../../src/render/canvas/board-renderer-v7";
import type { ChibiBoardArtV7 } from "../../src/render/canvas/chibi-art-resolver-v7";
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import { CULT_PALETTE_V7 } from "../../src/render/canvas/cult-channel-canvas-v7";
import {
  CULT_EFFECT_SPRITES_V7,
  CULT_EFFECT_SUBJECTS_V7,
  drawCultFeedbackV7,
  type CultFeedbackEffectV7,
} from "../../src/render/canvas/cult-effects-v7";
import { LIVE_DIRECTION_ART_REGISTRY_V7 } from "../../src/render/canvas/live-board-look-v7";
import {
  LIVE_DIRECTION_V7,
  createDirectedChibiArtV7,
} from "../../src/render/canvas/visual-direction-v7";
import { cultFieldV7 } from "../fixtures/v7-cult";
import {
  cultChannelBusyUiFixtureV7,
  cultChannelFuriousUiFixtureV7,
  cultChannelShortUiFixtureV7,
  cultChannelUnboundUiFixtureV7,
} from "../fixtures/v7-cult-ui";
import { at } from "../fixtures/v7-revision20";

/**
 * The channel on the canvas (bead `pulp_wars-mch9.18`): the live look draws
 * the Candlelit raster on its halo and the cues' sprites; LEGACY and the
 * classic look draw every mark in code; a board without the channel draws
 * none of it.
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
const camera = { zoom: chibiCameraZoom(1), offsetX: 40, offsetY: 40 };

function draw(
  look: "LIVE" | "CLASSIC" | "LEGACY",
  state: GameStateV7,
): LogEntry[] {
  const view = viewForV7(state, state.humanPlayerId);
  const full = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
    selection: null,
    selectedUnitId: null,
    selectedAchievement: null,
  });
  const { context, log } = recordingContext();
  drawBoardV7({
    context,
    viewport: { width: 1800, height: 1800 },
    devicePixelRatio: 1,
    camera,
    // The pieces and the channel; the ground is not what this reads.
    plan: {
      ...full,
      entries: full.entries.filter((entry) => entry.kind !== "TERRAIN"),
    },
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

const strokes = (log: readonly LogEntry[], colour: string): number =>
  log.filter(
    (call) =>
      call[0] === "set" && call[1] === "strokeStyle" && call[2] === colour,
  ).length;

describe("the channel on the canvas", () => {
  it("draws the Candlelit raster over each channeller in the live look", () => {
    const log = draw("LIVE", cultChannelBusyUiFixtureV7());
    // Two channellers and the Thing that grips one.
    expect(
      imagesDrawn(log).filter(
        (id) => id === "chibi-direction-icon-cult-status-candlelit",
      ),
    ).toHaveLength(3);
    // Two strands in the lodge's green, and the grip in teal.
    expect(strokes(log, CULT_PALETTE_V7.glow)).toBe(2);
    expect(strokes(log, CULT_PALETTE_V7.teal)).toBe(1);
  });

  it("draws every mark in code in LEGACY and the classic look", () => {
    for (const look of ["LEGACY", "CLASSIC"] as const) {
      const log = draw(look, cultChannelBusyUiFixtureV7());
      expect(
        imagesDrawn(log).filter((id) => id.includes("cult-status")),
      ).toEqual([]);
      expect(strokes(log, CULT_PALETTE_V7.glow), look).toBe(2);
      // The code candles' flames.
      expect(
        log.filter(
          (call) =>
            call[0] === "set" &&
            call[1] === "fillStyle" &&
            call[2] === CULT_PALETTE_V7.flame,
        ).length,
        look,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("rims the pips of a daemon short of its Control in red", () => {
    const log = draw("LIVE", cultChannelShortUiFixtureV7());
    expect(strokes(log, CULT_PALETTE_V7.redLit)).toBeGreaterThan(0);
    expect(
      strokes(
        draw("LIVE", cultChannelBusyUiFixtureV7()),
        CULT_PALETTE_V7.redLit,
      ),
    ).toBe(0);
  });

  it("draws nothing of the channel on a board without it", () => {
    const log = draw(
      "LIVE",
      cultFieldV7([
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 6) },
      ]),
    );
    for (const colour of [
      CULT_PALETTE_V7.glow,
      CULT_PALETTE_V7.dark,
      CULT_PALETTE_V7.teal,
      CULT_PALETTE_V7.redLit,
    ])
      expect(strokes(log, colour), colour).toBe(0);
    expect(imagesDrawn(log).some((id) => id.includes("cult-status"))).toBe(
      false,
    );
  });
});

describe("an Unbound daemon on the canvas", () => {
  const letters = (log: readonly LogEntry[]): unknown[] =>
    log.filter((call) => call[0] === "fillText").map((call) => call[1]);

  it("renders a whole board with an Unbound, Furious Horror in the live look", () => {
    const sprite = LIVE_DIRECTION_ART_REGISTRY_V7.variants(
      "UNIT:CULT:HORROR_UNBOUND",
    )[0];
    const bound =
      LIVE_DIRECTION_ART_REGISTRY_V7.variants("UNIT:CULT:HORROR")[0];
    if (sprite === undefined || bound === undefined)
      throw new Error("no Horror art");
    const drawn = imagesDrawn(draw("LIVE", cultChannelFuriousUiFixtureV7()));
    // Its Unbound look, beside the bound Horror's.
    expect(drawn.filter((id) => id === sprite.id)).toHaveLength(1);
    expect(drawn.filter((id) => id === bound.id)).toHaveLength(1);
    // The broken collar and the steam.
    expect(drawn).toContain("chibi-direction-icon-cult-status-unbound");
    expect(drawn).toContain("chibi-direction-icon-cult-status-furious");
    // Calm, it has no steam.
    const calm = imagesDrawn(draw("LIVE", cultChannelUnboundUiFixtureV7()));
    expect(calm).toContain("chibi-direction-icon-cult-status-unbound");
    expect(calm).not.toContain("chibi-direction-icon-cult-status-furious");
  });

  it("renders it in LEGACY and the classic look too, with the marks in code", () => {
    for (const look of ["LEGACY", "CLASSIC"] as const) {
      const log = draw(look, cultChannelFuriousUiFixtureV7());
      expect(
        imagesDrawn(log).filter((id) => id.includes("cult-status")),
      ).toEqual([]);
      // The badge's red rim, and the eye's on its target.
      expect(strokes(log, CULT_PALETTE_V7.redLit), look).toBeGreaterThanOrEqual(
        2,
      );
    }
  });

  it("draws a summoned unit's own sprite without the stand-in letter", () => {
    // Every Cult unit of the scene has its own sprite in the live look:
    // no "C" badge, also not on the Horrors, bound or Unbound.
    expect(
      letters(draw("LIVE", cultChannelUnboundUiFixtureV7())).filter(
        (letter) => letter === "C",
      ),
    ).toEqual([]);
    // Without their rasters (the classic look) they are stand-ins.
    expect(
      letters(draw("CLASSIC", cultChannelUnboundUiFixtureV7())).filter(
        (letter) => letter === "C",
      ).length,
    ).toBeGreaterThan(0);
  });
});

describe("the cues' sprites", () => {
  it("has a registered sprite for each cue that names one", () => {
    expect(CULT_EFFECT_SUBJECTS_V7).toEqual([
      "EFFECT:SUMMON_POP",
      "EFFECT:STRAND_SNAP",
      "EFFECT:BOO",
      "EFFECT:UNBOUND",
    ]);
    for (const subject of CULT_EFFECT_SUBJECTS_V7)
      expect(
        LIVE_DIRECTION_ART_REGISTRY_V7.variants(subject),
        subject,
      ).toHaveLength(1);
  });

  it("draws the sprite when the art has it and the code shape when it has not", () => {
    const art = {
      devicePixelRatio: 1,
      image: (subject: string) => {
        const asset = LIVE_DIRECTION_ART_REGISTRY_V7.variants(
          subject as never,
        )[0];
        return asset === undefined
          ? null
          : {
              image: { assetId: asset.id } as unknown as CanvasImageSource,
              width: asset.width,
              height: asset.height,
            };
      },
    };
    for (const effect of Object.keys(
      CULT_EFFECT_SPRITES_V7,
    ) as CultFeedbackEffectV7[]) {
      const feedback = {
        effect,
        cells: [at(5, 4)],
        from: at(5, 6),
        progress: 0.4,
      };
      const withArt = recordingContext();
      drawCultFeedbackV7(withArt.context, camera, feedback, art);
      expect(imagesDrawn(withArt.log), effect).toHaveLength(1);
      expect(imagesDrawn(withArt.log)[0]).toMatch(
        /^chibi-direction-effect-cult-/,
      );
      const without = recordingContext();
      drawCultFeedbackV7(without.context, camera, feedback, null);
      expect(imagesDrawn(without.log), effect).toEqual([]);
      expect(
        without.log.some((call) => call[0] === "stroke" || call[0] === "fill"),
      ).toBe(true);
    }
  });
});
