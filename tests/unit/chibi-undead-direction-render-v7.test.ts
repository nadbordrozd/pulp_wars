import { describe, expect, it, vi } from "vitest";
import type {
  ArtSubjectV7,
  ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import {
  drawBoardV7,
  type BoardRenderPlanEntryV7,
} from "../../src/render/canvas/board-renderer-v7";
import type {
  ChibiArtRequestV7,
  ChibiBoardArtV7,
  ChibiResolutionV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import {
  LIVE_DIRECTION_ART_REGISTRY_V7,
  liveBoardLookV7,
} from "../../src/render/canvas/live-board-look-v7";
import {
  UNDEAD_VIOLET_GLOW_V7,
  drawSupportFeedbackV7,
  type SupportEffectArtV7,
  type SupportFeedbackV7,
} from "../../src/render/canvas/support-presentation-v7";
import {
  abilityAreaStrokeV7,
  undeadPreviewStyleV7,
} from "../../src/render/canvas/undead-canvas-v7";
import {
  BASELINE_DIRECTION_V7,
  DIRECTED_GROUND_SHADOW_COLOUR_V7,
  DIRECTION_FLAG_ANCHORS_V7,
  HUMAN_DEMO_DIRECTION_V7,
  LIVE_DIRECTION_V7,
  createDirectedChibiArtV7,
  drawDirectedFlagV7,
  drawDirectedPieceChromeV7,
  type BoardVisualDirectionV7,
} from "../../src/render/canvas/visual-direction-v7";

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

const CORAL = "#f06762";
const at = { x: 0, y: 0 };

const rasters = new Map<string, CanvasImageSource>();
function raster(name: string): CanvasImageSource {
  const existing = rasters.get(name);
  if (existing !== undefined) return existing;
  const created = { name, width: 2, height: 2 } as unknown as CanvasImageSource;
  rasters.set(name, created);
  return created;
}

/** The classic registry: every subject, recoloured to the owner. */
function classicArt(): ChibiBoardArtV7 & {
  readonly requests: ChibiArtRequestV7[];
} {
  const requests: ChibiArtRequestV7[] = [];
  return {
    requests,
    resolve: (request): ChibiResolutionV7 => {
      requests.push(request);
      return {
        kind: "READY",
        asset: {
          id: `classic-${request.subject}`,
          subject: request.subject,
          assetClass: request.subject.startsWith("UNIT:")
            ? "STANDARD_UNIT"
            : "SETTLEMENT",
          width: 80,
          height: 80,
          url: `/classic/${request.subject}.png`,
        } as ChibiArtAssetV7,
        image: raster(`classic:${request.subject}#${request.ownerColor ?? ""}`),
        density: 1,
        smoothing: false,
        cacheKey: `classic:${request.subject}#${request.ownerColor ?? ""}`,
      };
    },
  };
}

/** The direction's own art for the given subjects; MISSING otherwise. */
function directionArt(
  subjects: readonly ArtSubjectV7[],
  state: "READY" | "LOADING" = "READY",
  ids: Readonly<Partial<Record<ArtSubjectV7, string>>> = {},
): ChibiBoardArtV7 {
  return {
    resolve: (request) =>
      !subjects.includes(request.subject)
        ? { kind: "MISSING" }
        : state === "LOADING"
          ? { kind: "LOADING" }
          : {
              kind: "READY",
              asset: {
                id: ids[request.subject] ?? `direction-${request.subject}`,
                subject: request.subject,
                assetClass: request.subject.startsWith("UNIT:")
                  ? "STANDARD_UNIT"
                  : "SETTLEMENT",
                width: 80,
                height: 80,
                url: `/direction/${request.subject}.png`,
                fixedColours: true,
              } as ChibiArtAssetV7,
              image: raster(`direction:${request.subject}`),
              density: 1,
              smoothing: false,
              cacheKey: `direction:${request.subject}`,
            },
  };
}

const environment = {
  readPixels: (_image: CanvasImageSource, width: number, height: number) =>
    new Uint8ClampedArray(width * height * 4).fill(200),
  createSurface: (pixels: Uint8ClampedArray, width: number, height: number) =>
    ({ pixels: [...pixels], width, height }) as unknown as CanvasImageSource,
};

const UNDEAD_SUBJECTS = [
  "UNIT:UNDEAD:FIGHTER",
  "UNIT:UNDEAD:KNIGHT",
  "CITY:UNDEAD:1",
  "CITY:UNDEAD:2",
  "CITY:UNDEAD:3",
  "EFFECT:WAIL",
  "EFFECT:RAISE",
] as const satisfies readonly ArtSubjectV7[];

function entry(
  kind: BoardRenderPlanEntryV7["kind"],
  subject: ArtSubjectV7,
  extra: Partial<BoardRenderPlanEntryV7> = {},
): BoardRenderPlanEntryV7 {
  return {
    key: `${kind.toLowerCase()}:${subject}`,
    kind,
    layer: kind === "UNIT" ? 5 : 4,
    at,
    assetId: "legacy",
    artSubject: subject,
    ...extra,
  };
}

function drawPieces(
  entries: readonly BoardRenderPlanEntryV7[],
  options: {
    readonly samples?: ChibiBoardArtV7;
    readonly direction?: BoardVisualDirectionV7 | null;
  } = {},
): { readonly log: LogEntry[]; readonly images: unknown[] } {
  const { context, log } = recordingContext();
  const base = classicArt();
  const direction =
    options.direction === undefined ? LIVE_DIRECTION_V7 : options.direction;
  drawBoardV7({
    context,
    viewport: { width: 800, height: 600 },
    devicePixelRatio: 1,
    camera: { zoom: 1, offsetX: 200, offsetY: 200 },
    plan: { version: 7, entries, targets: [] },
    images: { resolve: () => null },
    artSet: "CHIBI",
    chibiArt: base,
    reducedMotion: true,
    ...(direction === null
      ? {}
      : {
          direction: {
            spec: direction,
            art: createDirectedChibiArtV7({
              base,
              direction,
              environment,
              ...(options.samples === undefined
                ? {}
                : { samples: options.samples }),
            }),
          },
        }),
  });
  return {
    log,
    images: log
      .filter((call) => call[0] === "drawImage")
      .map((call) => call[1]),
  };
}

describe("Undead art in the live default look (pulp_wars-3tq.12)", () => {
  it("is registered in the art the game loads, and is not passed for the classic look or LEGACY", () => {
    const registry = LIVE_DIRECTION_ART_REGISTRY_V7;
    expect(registry.variants("UNIT:UNDEAD:FIGHTER")[0]?.id).toBe(
      "chibi-direction-undead-skeleton",
    );
    expect(registry.variants("UNIT:UNDEAD:JUGGERNAUT")[0]).toMatchObject({
      id: "chibi-direction-undead-abomination",
      fixedColours: true,
    });
    expect(registry.variants("PORTRAIT:UNDEAD:KNIGHT")[0]?.id).toBe(
      "chibi-direction-portrait-undead-vampire",
    );
    expect(registry.variants("CITY:UNDEAD:3")[0]?.id).toBe(
      "chibi-direction-undead-city-3",
    );
    expect(registry.variants("EFFECT:SPLASH")[0]?.id).toBe(
      "chibi-direction-effect-splash",
    );
    // The Human art is still there, and nothing Goblin or Dinosaur.
    expect(registry.variants("UNIT:FIGHTER")[0]?.id).toBe(
      "chibi-direction-fighter",
    );
    expect(liveBoardLookV7("CHIBI").visualDirectionArt).toBe(registry);
    expect(liveBoardLookV7("CHIBI").visualDirection?.undeadAccent).toBe(
      "VIOLET",
    );
    // The classic look and LEGACY get no direction and no direction art,
    // so they draw the classic Undead art exactly as before.
    expect(liveBoardLookV7("CHIBI", true)).toEqual({});
    expect(liveBoardLookV7("LEGACY")).toEqual({});
    expect(BASELINE_DIRECTION_V7.undeadAccent).toBeUndefined();
    expect(HUMAN_DEMO_DIRECTION_V7.undeadAccent).toBeUndefined();
  });

  it("draws an Undead unit's direction sprite as authored, nothing while it loads, and the classic sprite when it fails", () => {
    const base = classicArt();
    const readPixels = vi.fn(environment.readPixels);
    const art = createDirectedChibiArtV7({
      base,
      direction: LIVE_DIRECTION_V7,
      environment: { ...environment, readPixels },
      samples: directionArt(UNDEAD_SUBJECTS),
    });
    for (const subject of [
      "UNIT:UNDEAD:FIGHTER",
      "UNIT:UNDEAD:KNIGHT",
    ] as const) {
      const resolved = art.resolve({
        subject,
        at,
        ownerColor: CORAL,
        deviceScale: 1,
      });
      // The fixed-colour raster itself: no owner recolour and no tone.
      expect(resolved.kind === "READY" && resolved.image, subject).toBe(
        raster(`direction:${subject}`),
      );
      expect(resolved.kind === "READY" && resolved.cacheKey, subject).toBe(
        `direction:${subject}`,
      );
    }
    expect(base.requests).toEqual([]);
    expect(readPixels).not.toHaveBeenCalled();

    const skeleton = entry("UNIT", "UNIT:UNDEAD:FIGHTER", {
      ownerColor: CORAL,
      ownerSeat: 1,
      faction: "UNDEAD",
      hp: 10,
      maxHp: 10,
    });
    expect(
      drawPieces([skeleton], { samples: directionArt(UNDEAD_SUBJECTS) }).images,
    ).toEqual([raster("direction:UNIT:UNDEAD:FIGHTER")]);
    // Loading: no sprite, never a flash of the classic one.
    expect(
      drawPieces([skeleton], {
        samples: directionArt(UNDEAD_SUBJECTS, "LOADING"),
      }).images,
    ).toEqual([]);
    // Failed: the classic Undead sprite in the player's colour.
    expect(
      drawPieces([skeleton], { samples: directionArt([]) }).images,
    ).toEqual([raster(`classic:UNIT:UNDEAD:FIGHTER#${CORAL}`)]);
    // The classic look: the classic sprite in the player's colour.
    expect(drawPieces([skeleton], { direction: null }).images).toEqual([
      raster(`classic:UNIT:UNDEAD:FIGHTER#${CORAL}`),
    ]);
    // Since bead pulp_wars-w5j.3 the unit stands on no plate: the faint
    // neutral shadow, nothing in the player colour.
    const fills = drawPieces([skeleton], {
      samples: directionArt(UNDEAD_SUBJECTS),
    })
      .log.filter((call) => call[0] === "set" && call[1] === "fillStyle")
      .map((call) => call[2]);
    expect(fills).not.toContain(CORAL);
    expect(fills).toContain(DIRECTED_GROUND_SHADOW_COLOUR_V7);
  });

  it("draws an Undead city's direction art with the pennant on its tower, and the classic city with its crown when it fails", () => {
    const base = classicArt();
    const art = createDirectedChibiArtV7({
      base,
      direction: LIVE_DIRECTION_V7,
      environment,
      samples: directionArt(UNDEAD_SUBJECTS),
    });
    for (const level of [1, 2, 3] as const) {
      const resolved = art.resolve({
        subject: `CITY:UNDEAD:${level}`,
        at,
        ownerColor: CORAL,
        deviceScale: 1,
      });
      expect(resolved.kind === "READY" && resolved.cacheKey).toBe(
        `direction:CITY:UNDEAD:${level}`,
      );
    }
    // A Goblin or Dinosaur city is not registered: its classic raster.
    const goblin = art.resolve({
      subject: "CITY:GOBLIN:2",
      at,
      ownerColor: CORAL,
      deviceScale: 1,
    });
    expect(goblin.kind === "READY" && goblin.cacheKey).toBe(
      `classic:CITY:GOBLIN:2#${CORAL}`,
    );
    // The raster failed: the classic necropolis in the owner's colour.
    const failed = createDirectedChibiArtV7({
      base,
      direction: LIVE_DIRECTION_V7,
      environment,
      samples: directionArt([]),
    }).resolve({
      subject: "CITY:UNDEAD:1",
      at,
      ownerColor: CORAL,
      deviceScale: 1,
    });
    expect(failed.kind === "READY" && failed.cacheKey).toBe(
      `classic:CITY:UNDEAD:1#${CORAL}`,
    );

    const capital = entry("CITY", "CITY:UNDEAD:1", {
      ownerColor: CORAL,
      ownerSeat: 1,
      capital: true,
    });
    const rect = { x: 0, y: 0, width: 80, height: 80 };
    for (const level of [1, 2, 3]) {
      const id = `chibi-direction-undead-city-${level}`;
      expect(DIRECTION_FLAG_ANCHORS_V7[id], id).toBeDefined();
      const { context, log } = recordingContext();
      expect(
        drawDirectedFlagV7(context, LIVE_DIRECTION_V7, capital, id, rect, 1),
        id,
      ).toBe(true);
      const fills = log
        .filter((call) => call[0] === "set" && call[1] === "fillStyle")
        .map((call) => call[2]);
      // The pennant in the player colour with the capital's gold shape.
      expect(fills, id).toContain(CORAL);
      expect(fills, id).toContain("#f4c542");
    }
    // The classic necropolis has no anchor, so it gets no pennant.
    const none = recordingContext();
    expect(
      drawDirectedFlagV7(
        none.context,
        LIVE_DIRECTION_V7,
        capital,
        "chibi-undead-city-1",
        rect,
        1,
      ),
    ).toBe(false);
    const chrome = (flagDrawn: boolean) => {
      const { context, log } = recordingContext();
      const handled = drawDirectedPieceChromeV7(
        context,
        LIVE_DIRECTION_V7,
        capital,
        0,
        0,
        1,
        false,
        flagDrawn,
      );
      return { handled, log };
    };
    // Converted (the pennant is on the art): the pennant replaces the seat
    // badge and the crown, and no second pennant is drawn in the corner.
    const converted = chrome(true);
    expect(converted.handled).toEqual({ badge: true, hp: false, crown: true });
    expect(converted.log.filter((call) => call[0] === "fill")).toEqual([]);
    // Fallback (no pennant drawn): the classic city keeps its stock crown.
    expect(chrome(false).handled).toEqual({
      badge: true,
      hp: false,
      crown: false,
    });
  });

  it("draws the violet effect sprites and leaves the Plague, Bitten and cure art alone", () => {
    const base = classicArt();
    const art = createDirectedChibiArtV7({
      base,
      direction: LIVE_DIRECTION_V7,
      environment,
      samples: directionArt(UNDEAD_SUBJECTS),
    });
    const key = (subject: ArtSubjectV7): string | false => {
      const resolved = art.resolve({ subject, at, deviceScale: 1 });
      return resolved.kind === "READY" && resolved.cacheKey;
    };
    expect(key("EFFECT:WAIL")).toBe("direction:EFFECT:WAIL");
    expect(key("EFFECT:RAISE")).toBe("direction:EFFECT:RAISE");
    for (const subject of [
      "EFFECT:CURE",
      "STATUS:PLAGUED",
      "STATUS:BITTEN",
    ] as const)
      expect(key(subject), subject).toBe(`classic:${subject}#`);
    // A direction that draws no samples (the baseline) keeps every effect.
    const baseline = createDirectedChibiArtV7({
      base,
      direction: BASELINE_DIRECTION_V7,
      environment,
      samples: directionArt(UNDEAD_SUBJECTS),
    }).resolve({ subject: "EFFECT:WAIL", at, deviceScale: 1 });
    expect(baseline.kind === "READY" && baseline.cacheKey).toBe(
      "classic:EFFECT:WAIL#",
    );
  });

  it("tints the code-drawn glows of the Undead cues violet only when the look says so", () => {
    const camera = { offsetX: 0, offsetY: 0, zoom: chibiCameraZoom(1) };
    const image = { effect: true } as unknown as CanvasImageSource;
    const sprites = (glow?: string): SupportEffectArtV7 => ({
      devicePixelRatio: 1,
      image: () => ({ image, width: 32, height: 32 }),
      ...(glow === undefined ? {} : { glow }),
    });
    const wail: SupportFeedbackV7 = {
      effect: "WAIL",
      actor: { unitId: 1, at: { x: 2, y: 2 } },
      recipients: [{ unitId: 2, at: { x: 3, y: 2 } }],
      progress: 0.45,
    } as SupportFeedbackV7;
    const strokes = (art: SupportEffectArtV7 | null): unknown[] => {
      const { context, log } = recordingContext();
      drawSupportFeedbackV7(context, camera, wail, false, art);
      return log
        .filter((call) => call[0] === "set" && call[1] === "strokeStyle")
        .map((call) => call[2]);
    };
    expect(UNDEAD_VIOLET_GLOW_V7).toBe("#c9a6ff");
    // The default look: the Wail rings in the faction's violet.
    expect(strokes(sprites(UNDEAD_VIOLET_GLOW_V7))).toContain("#c9a6ff");
    expect(strokes(sprites(UNDEAD_VIOLET_GLOW_V7))).not.toContain("#d2e2f6");
    // The classic look: the pale blue-white rings, as before.
    expect(strokes(sprites())).toContain("#d2e2f6");
    expect(strokes(sprites())).not.toContain("#c9a6ff");
  });

  it("previews Raise Dead in violet in the default look and in green in the classic look", () => {
    expect(undeadPreviewStyleV7("RAISE", true)).toBe("WAIL");
    expect(undeadPreviewStyleV7("RAISE", false)).toBe("RAISE");
    expect(abilityAreaStrokeV7("WAIL")).toBe("#c9a6ff");
    expect(abilityAreaStrokeV7("RAISE")).toBe("#8ff0a4");
    // Colours that mean something else are never touched.
    for (const style of ["WAIL", "DEVOUR", "SPLASH", "TEND", "BLAST"] as const)
      expect(undeadPreviewStyleV7(style, true)).toBe(style);

    const target: BoardRenderPlanEntryV7 = {
      key: "ability-target:RAISE:1,1",
      kind: "ABILITY_TARGET",
      layer: 7.5,
      at: { x: 1, y: 1 },
      abilityStyle: "RAISE",
      label: "Rise",
    };
    const strokes = (direction: BoardVisualDirectionV7 | null): unknown[] =>
      drawPieces([target], { direction })
        .log.filter((call) => call[0] === "set" && call[1] === "strokeStyle")
        .map((call) => call[2]);
    expect(strokes(LIVE_DIRECTION_V7)).toContain("#c9a6ff");
    expect(strokes(LIVE_DIRECTION_V7)).not.toContain("#8ff0a4");
    for (const direction of [null, BASELINE_DIRECTION_V7]) {
      expect(strokes(direction)).toContain("#8ff0a4");
      expect(strokes(direction)).not.toContain("#c9a6ff");
    }
  });
});
