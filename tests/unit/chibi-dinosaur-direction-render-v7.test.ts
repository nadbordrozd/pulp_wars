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
import {
  LIVE_DIRECTION_ART_REGISTRY_V7,
  liveBoardLookV7,
} from "../../src/render/canvas/live-board-look-v7";
import {
  DIRECTED_GROUND_SHADOW_COLOUR_V7,
  DIRECTION_EGG_PLATE_RADIUS_SHARE_V7,
  DIRECTION_FLAG_ANCHORS_V7,
  HUMAN_DEMO_DIRECTION_V7,
  LIVE_DIRECTION_V7,
  createDirectedChibiArtV7,
  drawDirectedFlagV7,
  drawDirectedPieceChromeV7,
  drawDirectedUnitBaseV7,
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
const TEAL = "#28b7a4";
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
                id: `direction-${request.subject}`,
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

const ROLES = [
  ["FIGHTER", "caveman"],
  ["RAIDER", "raptor"],
  ["MARKSMAN", "spitter"],
  ["GUARD", "ankylosaurus"],
  ["CAPTAIN", "shaman"],
  ["CATAPULT", "triceratops"],
  ["KNIGHT", "t-rex"],
  ["JUGGERNAUT", "brontosaurus"],
] as const;

const DINOSAUR_SUBJECTS = [
  ...ROLES.map(([role]) => `UNIT:DINOSAUR:${role}` as const),
  "UNIT:DINOSAUR:EGG",
  "CITY:DINOSAUR:1",
  "CITY:DINOSAUR:2",
  "CITY:DINOSAUR:3",
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

const fillsOf = (log: readonly LogEntry[]): unknown[] =>
  log
    .filter((call) => call[0] === "set" && call[1] === "fillStyle")
    .map((call) => call[2]);

describe("Dinosaur art in the live default look (pulp_wars-3tq.13)", () => {
  it("is registered in the art the game loads, and is not passed for the classic look or LEGACY", () => {
    const registry = LIVE_DIRECTION_ART_REGISTRY_V7;
    for (const [role, name] of ROLES) {
      expect(registry.variants(`UNIT:DINOSAUR:${role}`)[0], role).toMatchObject(
        { id: `chibi-direction-dinosaur-${name}`, fixedColours: true },
      );
      expect(registry.variants(`PORTRAIT:DINOSAUR:${role}`)[0]?.id, role).toBe(
        `chibi-direction-portrait-dinosaur-${name}`,
      );
    }
    expect(registry.variants("UNIT:DINOSAUR:EGG")[0]).toMatchObject({
      id: "chibi-direction-dinosaur-egg",
      width: 48,
      height: 48,
      fixedColours: true,
    });
    expect(registry.variants("CITY:DINOSAUR:3")[0]?.id).toBe(
      "chibi-direction-dinosaur-city-3",
    );
    // The other three factions are still there.
    expect(registry.variants("UNIT:FIGHTER")[0]?.id).toBe(
      "chibi-direction-fighter",
    );
    expect(registry.variants("UNIT:GOBLIN:FIGHTER")[0]?.id).toBe(
      "chibi-direction-goblin-goblin",
    );
    expect(registry.variants("UNIT:UNDEAD:FIGHTER")[0]?.id).toBe(
      "chibi-direction-undead-skeleton",
    );
    expect(liveBoardLookV7("CHIBI").visualDirectionArt).toBe(registry);
    // The classic look and LEGACY get no direction and no direction art,
    // so they draw the classic Dinosaur art exactly as before.
    expect(liveBoardLookV7("CHIBI", true)).toEqual({});
    expect(liveBoardLookV7("LEGACY")).toEqual({});
  });

  it("draws every Dinosaur unit's direction sprite as authored, nothing while it loads, and the classic sprite when it fails", () => {
    const base = classicArt();
    const readPixels = vi.fn(environment.readPixels);
    const art = createDirectedChibiArtV7({
      base,
      direction: LIVE_DIRECTION_V7,
      environment: { ...environment, readPixels },
      samples: directionArt(DINOSAUR_SUBJECTS),
    });
    for (const [role] of ROLES) {
      const subject = `UNIT:DINOSAUR:${role}` as const;
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

    const raptor = entry("UNIT", "UNIT:DINOSAUR:RAIDER", {
      ownerColor: CORAL,
      ownerSeat: 1,
      faction: "DINOSAUR",
      hp: 10,
      maxHp: 10,
    });
    const live = drawPieces([raptor], {
      samples: directionArt(DINOSAUR_SUBJECTS),
    });
    expect(live.images).toEqual([raster("direction:UNIT:DINOSAUR:RAIDER")]);
    // The unit stands on no plate since bead pulp_wars-w5j.3 (the faint
    // neutral shadow, no player colour), and wears no faction badge (the
    // footprint badge is for a Dinosaur drawn with Human art).
    expect(fillsOf(live.log)).not.toContain(CORAL);
    expect(fillsOf(live.log)).toContain(DIRECTED_GROUND_SHADOW_COLOUR_V7);
    expect(fillsOf(live.log)).not.toContain("#33363d");
    // Loading: no sprite, never a flash of the classic one.
    expect(
      drawPieces([raptor], {
        samples: directionArt(DINOSAUR_SUBJECTS, "LOADING"),
      }).images,
    ).toEqual([]);
    // Failed: the classic Dinosaur sprite in the player's colour.
    expect(drawPieces([raptor], { samples: directionArt([]) }).images).toEqual([
      raster(`classic:UNIT:DINOSAUR:RAIDER#${CORAL}`),
    ]);
    // The classic look: the classic sprite in the player's colour.
    expect(drawPieces([raptor], { direction: null }).images).toEqual([
      raster(`classic:UNIT:DINOSAUR:RAIDER#${CORAL}`),
    ]);
  });

  it("keeps the growth display on the new sprites: the same raster drawn larger, with the chevrons", () => {
    const grown = (stage: 1 | 2 | undefined) =>
      drawPieces(
        [
          entry("UNIT", "UNIT:DINOSAUR:KNIGHT", {
            ownerColor: TEAL,
            ownerSeat: 0,
            faction: "DINOSAUR",
            hp: 10,
            maxHp: 10,
            ...(stage === undefined ? {} : { growthStage: stage }),
          }),
        ],
        { samples: directionArt(DINOSAUR_SUBJECTS) },
      );
    const width = (stage: 1 | 2 | undefined): number => {
      const call = grown(stage).log.find((entry) => entry[0] === "drawImage");
      return Number(call?.[4]);
    };
    // One raster for every stage, scaled about the feet.
    for (const stage of [undefined, 1, 2] as const)
      expect(grown(stage).images, String(stage)).toEqual([
        raster("direction:UNIT:DINOSAUR:KNIGHT"),
      ]);
    expect(width(1)).toBeCloseTo(width(undefined) * 1.125, 5);
    // 80 px wide in this fixture: Alpha is capped at 96 CSS px.
    expect(width(2)).toBeCloseTo(width(undefined) * 1.2, 5);
    // The chevrons are cream on black, whatever the sprite's colours.
    const strokes = (stage: 1 | 2 | undefined): unknown[] =>
      grown(stage)
        .log.filter((call) => call[0] === "set" && call[1] === "strokeStyle")
        .map((call) => call[2]);
    expect(strokes(2)).toContain("#efe6c8");
    expect(strokes(undefined)).not.toContain("#efe6c8");
  });

  it("draws the Egg's direction sprite with no owner colour and no plate, with the owner's ring on its countdown", () => {
    const egg = entry("UNIT", "UNIT:DINOSAUR:EGG", {
      ownerColor: TEAL,
      ownerSeat: 0,
      faction: "DINOSAUR",
      hp: 5,
      maxHp: 5,
      egg: { turnsRemaining: 2 },
    });
    const live = drawPieces([egg], {
      samples: directionArt(DINOSAUR_SUBJECTS),
    });
    expect(live.images).toEqual([raster("direction:UNIT:DINOSAUR:EGG")]);
    // No plate since bead pulp_wars-w5j.3: nothing is filled in the player
    // colour (the Dinosaur look is the Dinosaur player's); the countdown
    // chip keeps its owner-coloured ring and its number.
    expect(fillsOf(live.log)).not.toContain(TEAL);
    expect(fillsOf(live.log)).toContain(DIRECTED_GROUND_SHADOW_COLOUR_V7);
    expect(
      live.log
        .filter((call) => call[0] === "set" && call[1] === "strokeStyle")
        .map((call) => call[2]),
    ).toContain(TEAL);
    expect(live.log.filter((call) => call[0] === "fillText")).toContainEqual(
      expect.arrayContaining(["fillText", "2"]),
    );
    // The classic look and a failed raster: the classic Egg in the owner's
    // colour.
    for (const options of [
      { direction: null },
      { samples: directionArt([]) },
    ] as const)
      expect(drawPieces([egg], options).images).toEqual([
        raster(`classic:UNIT:DINOSAUR:EGG#${TEAL}`),
      ]);

    // The plate of the study benches' direction (the live look has none
    // since bead pulp_wars-w5j.3): the Egg's 48 px master gets a 58 px
    // plate (about a large unit's), so its ends show beside the nest that
    // fills the canvas; any other sprite keeps the rule.
    const radius = (plan: BoardRenderPlanEntryV7): number => {
      const { context, log } = recordingContext();
      drawDirectedUnitBaseV7(
        context,
        HUMAN_DEMO_DIRECTION_V7,
        plan,
        { x: 0, y: 0, width: 48, height: 48 },
        1,
      );
      // The innermost ellipse is the plate itself (its rim is drawn wider).
      return Math.min(
        ...log
          .filter((call) => call[0] === "ellipse")
          .map((call) => Number(call[3])),
      );
    };
    expect(DIRECTION_EGG_PLATE_RADIUS_SHARE_V7 * 48).toBe(29);
    const { egg: _egg, ...plain } = egg;
    void _egg;
    expect(radius(egg) - radius(plain)).toBeCloseTo(29 - 26 * (48 / 80), 5);
    expect(radius(egg)).toBeGreaterThan(24);
  });

  it("draws a Dinosaur city's direction art with the pennant at its anchor, and the classic city with its crown when it fails", () => {
    const base = classicArt();
    const art = createDirectedChibiArtV7({
      base,
      direction: LIVE_DIRECTION_V7,
      environment,
      samples: directionArt(DINOSAUR_SUBJECTS),
    });
    for (const level of [1, 2, 3] as const) {
      const resolved = art.resolve({
        subject: `CITY:DINOSAUR:${level}`,
        at,
        ownerColor: CORAL,
        deviceScale: 1,
      });
      // As authored: no owner recolour and no tone.
      expect(resolved.kind === "READY" && resolved.cacheKey).toBe(
        `direction:CITY:DINOSAUR:${level}`,
      );
    }
    // The raster failed: the classic camp in the owner's colour.
    const failed = createDirectedChibiArtV7({
      base,
      direction: LIVE_DIRECTION_V7,
      environment,
      samples: directionArt([]),
    }).resolve({
      subject: "CITY:DINOSAUR:1",
      at,
      ownerColor: CORAL,
      deviceScale: 1,
    });
    expect(failed.kind === "READY" && failed.cacheKey).toBe(
      `classic:CITY:DINOSAUR:1#${CORAL}`,
    );

    const capital = entry("CITY", "CITY:DINOSAUR:1", {
      ownerColor: CORAL,
      ownerSeat: 1,
      capital: true,
    });
    const rect = { x: 0, y: 0, width: 96, height: 104 };
    expect(
      [1, 2, 3].map(
        (level) =>
          DIRECTION_FLAG_ANCHORS_V7[`chibi-direction-dinosaur-city-${level}`],
      ),
    ).toEqual([
      { x: 30.5, y: 0, pole: 6 },
      { x: 66.5, y: 11, pole: 0 },
      { x: 68.5, y: 0, pole: 12 },
    ]);
    for (const level of [1, 2, 3]) {
      const id = `chibi-direction-dinosaur-city-${level}`;
      const { context, log } = recordingContext();
      expect(
        drawDirectedFlagV7(context, LIVE_DIRECTION_V7, capital, id, rect, 1),
        id,
      ).toBe(true);
      // The pennant in the player colour with the capital's gold shape.
      expect(fillsOf(log), id).toContain(CORAL);
      expect(fillsOf(log), id).toContain("#f4c542");
      // It starts at the recorded anchor.
      const anchor = DIRECTION_FLAG_ANCHORS_V7[id];
      expect(log.find((call) => call[0] === "moveTo")).toEqual([
        "moveTo",
        anchor?.x,
        anchor?.y,
      ]);
    }
    // The classic camp has no anchor, so it gets no pennant.
    const none = recordingContext();
    expect(
      drawDirectedFlagV7(
        none.context,
        LIVE_DIRECTION_V7,
        capital,
        "chibi-dinosaur-city-1",
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
});
