import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import type {
  ArtSubjectV7,
  ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import {
  CHIBI_CURIOSITIES_ART_ASSETS_V7,
  CHIBI_CURIOSITIES_ROUND2_ART_ASSETS_V7,
} from "../../src/assets/chibi-curiosities-art-manifest";
import { CHIBI_DIRECTION_ART_ASSETS_V7 } from "../../src/assets/chibi-direction-art-manifest";
import { CHIBI_DIRECTION_GOBLIN_ART_ASSETS_V7 } from "../../src/assets/chibi-direction-art-manifest";
import { DWARF_FLYER_PRESENTATION_V7 } from "../../src/assets/chibi-direction-dwarf-presentation";
import { CHIBI_DIRECTION_DINOSAUR_ART_ASSETS_V7 } from "../../src/assets/chibi-direction-dinosaur-art-manifest";
import { CHIBI_DIRECTION_CANDY_ART_ASSETS_V7 } from "../../src/assets/chibi-direction-candy-art-manifest";
import { CHIBI_DIRECTION_CULT_ART_ASSETS_V7 } from "../../src/assets/chibi-direction-cult-art-manifest";
import { CHIBI_DIRECTION_DWARF_ART_ASSETS_V7 } from "../../src/assets/chibi-direction-dwarf-art-manifest";
import { CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7 } from "../../src/assets/chibi-direction-ice-folk-art-manifest";
import { CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7 } from "../../src/assets/chibi-direction-martian-art-manifest";
import { MARTIAN_FLYER_PRESENTATION_V7 } from "../../src/assets/chibi-direction-martian-presentation";
import { CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7 } from "../../src/assets/chibi-direction-undead-art-manifest";
import { CHIBI_NAVAL_FACTION_ART_ASSETS_V7 } from "../../src/assets/chibi-naval-faction-art-manifest";
import { CHIBI_SUBMERGED_SUBMARINE_ART_ASSETS_V7 } from "../../src/assets/chibi-naval-submarine-art-manifest";
import {
  drawBoardV7,
  type BoardRenderPlanEntryV7,
} from "../../src/render/canvas/board-renderer-v7";
import type { ChibiBoardArtV7 } from "../../src/render/canvas/chibi-art-resolver-v7";
import {
  chibiCameraZoom,
  chibiDestinationRect,
} from "../../src/render/canvas/chibi-geometry-v7";
import { growthSpriteScaleV7 } from "../../src/render/canvas/dinosaur-canvas-v7";
import { LIVE_DIRECTION_ART_REGISTRY_V7 } from "../../src/render/canvas/live-board-look-v7";
import { UNIT_SHADOW_MEASUREMENTS_V7 } from "../../src/render/canvas/unit-shadow-measurements-v7.generated";
import {
  UNIT_SHADOW_FLYERS_V7,
  UNIT_SHADOW_HOVER_GAPS_V7,
  UNIT_SHADOW_TABLE_V7,
  unitShadowAnchorV7,
  type UnitShadowAnchorV7,
} from "../../src/render/canvas/unit-shadows-v7";
import {
  DIRECTED_GROUND_SHADOW_COLOUR_V7,
  DIRECTED_READY_RING_COLOUR_V7,
  LIVE_DIRECTION_V7,
  createDirectedChibiArtV7,
  directedUnitShadowGeometryV7,
  drawDirectedUnitBaseV7,
} from "../../src/render/canvas/visual-direction-v7";
import { measureUnitFootprintV7 } from "../../scripts/art/unit-shadows/measure";

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

/** The ellipse filled (or stroked) with `colour`, as [x, y, rx, ry]. */
function ellipsesPainted(
  log: readonly LogEntry[],
  colour: string,
  paint: "fill" | "stroke",
): number[][] {
  const found: number[][] = [];
  let ellipse: number[] | null = null;
  let style: unknown = null;
  for (const call of log) {
    if (call[0] === "ellipse") ellipse = call.slice(1, 5).map(Number);
    if (
      call[0] === "set" &&
      call[1] === (paint === "fill" ? "fillStyle" : "strokeStyle")
    )
      style = call[2];
    if (call[0] === paint && style === colour && ellipse !== null)
      found.push(ellipse);
  }
  return found;
}

const LIVE_ASSETS: readonly ChibiArtAssetV7[] = [
  ...CHIBI_DIRECTION_ART_ASSETS_V7,
  ...CHIBI_DIRECTION_GOBLIN_ART_ASSETS_V7,
  ...CHIBI_DIRECTION_UNDEAD_ART_ASSETS_V7,
  ...CHIBI_DIRECTION_DINOSAUR_ART_ASSETS_V7,
  ...CHIBI_DIRECTION_MARTIAN_ART_ASSETS_V7,
  ...CHIBI_DIRECTION_ICE_FOLK_ART_ASSETS_V7,
  ...CHIBI_DIRECTION_DWARF_ART_ASSETS_V7,
  ...CHIBI_DIRECTION_CANDY_ART_ASSETS_V7,
  // The Cult's units and summoned units (bead pulp_wars-mch9.15).
  ...CHIBI_DIRECTION_CULT_ART_ASSETS_V7,
  ...CHIBI_NAVAL_FACTION_ART_ASSETS_V7.map((entry) => entry.asset),
  // The Submarines riding low in the water (bead pulp_wars-5ti.6).
  ...CHIBI_SUBMERGED_SUBMARINE_ART_ASSETS_V7.map((entry) => entry.asset),
  // The neutral Giant Spider (bead pulp_wars-737.6) and Bigfoot (bead
  // pulp_wars-737.16).
  ...CHIBI_CURIOSITIES_ART_ASSETS_V7,
  ...CHIBI_CURIOSITIES_ROUND2_ART_ASSETS_V7,
];
const UNIT_SUBJECTS = [
  ...new Set(
    LIVE_ASSETS.map((asset) => asset.subject).filter((subject) =>
      subject.startsWith("UNIT:"),
    ),
  ),
];
const anchors = Object.values(UNIT_SHADOW_TABLE_V7) as UnitShadowAnchorV7[];

function liveAsset(subject: ArtSubjectV7): ChibiArtAssetV7 {
  const asset = LIVE_DIRECTION_ART_REGISTRY_V7.variants(subject)[0];
  if (asset === undefined) throw new Error(`${subject}: no live asset`);
  return asset;
}

function unitEntry(
  subject: ArtSubjectV7,
  extra: Partial<BoardRenderPlanEntryV7> = {},
): BoardRenderPlanEntryV7 {
  return {
    key: "unit:7",
    kind: "UNIT",
    layer: 5,
    at: { x: 0, y: 0 },
    assetId: "legacy",
    artSubject: subject,
    ownerColor: "#28b7a4",
    ...extra,
  };
}

describe("unit shadow table (pulp_wars-jg1)", () => {
  it("covers every unit subject of the live look with the raster it was measured on", () => {
    expect(UNIT_SUBJECTS.length).toBeGreaterThan(70);
    for (const subject of UNIT_SUBJECTS) {
      const asset = liveAsset(subject);
      const anchor = UNIT_SHADOW_TABLE_V7[subject];
      expect(anchor, subject).toBeDefined();
      expect(anchor).toMatchObject({
        assetId: asset.id,
        width: asset.width,
        height: asset.height,
      });
      expect(unitShadowAnchorV7(subject, asset.id)).toBe(anchor);
      // Another raster (a stand-in while the live one loads) falls back.
      expect(unitShadowAnchorV7(subject, "legacy")).toBeNull();
    }
    expect(Object.keys(UNIT_SHADOW_TABLE_V7).sort()).toEqual(
      [...UNIT_SUBJECTS].sort(),
    );
  });

  it("matches the masters (npm run art:unit-shadows-measure is current)", async () => {
    for (const subject of UNIT_SUBJECTS) {
      const asset = liveAsset(subject);
      const { data, info } = await sharp(
        path.join(process.cwd(), "public", asset.url.replace(/^\/+/, "")),
      )
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const footprint = measureUnitFootprintV7({
        width: info.width,
        height: info.height,
        data: new Uint8Array(data),
      });
      expect(UNIT_SHADOW_MEASUREMENTS_V7[subject], subject).toEqual({
        assetId: asset.id,
        assetClass: asset.assetClass,
        width: info.width,
        height: info.height,
        contactY: footprint.contactY,
        footLeft: footprint.footLeft,
        footRight: footprint.footRight,
        baseLeft: footprint.baseLeft,
        baseRight: footprint.baseRight,
      });
    }
  });

  it("flags the flyers explicitly, with their presentation shadow, and the hovering Banshee", () => {
    const flyers = anchors
      .filter((anchor) => anchor.motion === "FLYER")
      .map((anchor) => anchor.subject)
      .sort();
    expect(flyers).toEqual([
      "UNIT:DWARF:RAIDER",
      "UNIT:MARTIAN:KNIGHT",
      "UNIT:MARTIAN:RAIDER",
    ]);
    const presentations: Readonly<Record<string, { readonly shadow: object }>> =
      { ...MARTIAN_FLYER_PRESENTATION_V7, ...DWARF_FLYER_PRESENTATION_V7 };
    for (const subject of flyers) {
      const assetId = UNIT_SHADOW_FLYERS_V7[subject] ?? "";
      expect(liveAsset(subject).id).toBe(assetId);
      expect(UNIT_SHADOW_TABLE_V7[subject]?.shadow).toEqual(
        presentations[assetId]?.shadow,
      );
      // The gap below a flyer is deliberate: its lowest pixel is well above
      // its shadow.
      const measurement = UNIT_SHADOW_MEASUREMENTS_V7[subject];
      expect(
        (UNIT_SHADOW_TABLE_V7[subject]?.shadow?.y ?? 0) -
          (measurement?.contactY ?? 0),
      ).toBeGreaterThanOrEqual(8);
    }
    expect(Object.keys(UNIT_SHADOW_HOVER_GAPS_V7)).toEqual([
      "UNIT:UNDEAD:MARKSMAN",
    ]);
    expect(UNIT_SHADOW_TABLE_V7["UNIT:UNDEAD:MARKSMAN"]?.motion).toBe("HOVER");
    // Ships and transports stand on the water: no shadow, the hull ring.
    for (const anchor of anchors.filter((a) => a.subject.includes("BOAT")))
      expect(anchor).toMatchObject({
        motion: "AFLOAT",
        shadow: null,
        ring: null,
      });
  });

  it("puts every grounded unit's feet in the front half of its shadow, near its centre", () => {
    const grounded = anchors.filter((anchor) => anchor.motion === "GROUNDED");
    // 55 since the Thrall sprite is retired (bead pulp_wars-b5f.3).
    expect(grounded.length).toBeGreaterThanOrEqual(55);
    for (const anchor of grounded) {
      const measurement = UNIT_SHADOW_MEASUREMENTS_V7[anchor.subject];
      const shadow = anchor.shadow;
      if (measurement === undefined || shadow === null)
        throw new Error(anchor.subject);
      // Never floating: the contact line is inside the shadow's lower half.
      expect(measurement.contactY, anchor.subject).toBeGreaterThan(shadow.y);
      expect(measurement.contactY, anchor.subject).toBeLessThan(
        shadow.y + shadow.radiusY,
      );
      expect(Math.abs(shadow.x - anchor.width / 2)).toBeLessThanOrEqual(6);
      // The ring follows the shadow.
      expect(anchor.ring).toMatchObject({ x: shadow.x, y: shadow.y });
      expect(anchor.ring?.radiusX).toBeGreaterThan(shadow.radiusX);
    }
  });

  it("gives the giants larger shadows than every normal unit, and grows big units' too", () => {
    const radius = (size: UnitShadowAnchorV7["size"]): number[] =>
      anchors
        .filter((anchor) => anchor.size === size && anchor.motion !== "AFLOAT")
        .filter((anchor) => anchor.motion === "GROUNDED")
        .map((anchor) => anchor.shadow?.radiusX ?? 0);
    const giants = radius("GIANT");
    const bigs = radius("BIG");
    const normals = radius("NORMAL");
    // The eight Juggernaut-role giants (the Gingerbread Giant since the Candy
    // art was wired in, pulp_wars-jdb.3) and the neutral Giant Spider, whose
    // 88 x 72 canvas is a giant's (wide and flat), not a SMALL one; and
    // round 2's Bigfoot (88 x 96, giant bounds). The Cult (bead
    // pulp_wars-mch9.15) adds three: the Thing in the Cellar and the Herald,
    // bound and Unbound.
    expect(giants).toHaveLength(13);
    for (const subject of [
      "UNIT:MONSTER_GIANT_SPIDER",
      "UNIT:NEUTRAL_BIGFOOT",
    ] as const)
      expect(UNIT_SHADOW_TABLE_V7[subject]).toMatchObject({
        size: "GIANT",
        motion: "GROUNDED",
      });
    expect(Math.min(...giants)).toBeGreaterThan(Math.max(...normals));
    expect(Math.min(...giants)).toBeGreaterThan(Math.max(...bigs));
    expect(Math.min(...bigs)).toBeGreaterThanOrEqual(Math.max(...normals) - 1);
    // Every Juggernaut is a giant, and its shadow covers most of its feet.
    for (const anchor of anchors.filter((a) =>
      a.subject.endsWith("JUGGERNAUT"),
    )) {
      expect(anchor.size, anchor.subject).toBe("GIANT");
      const measurement = UNIT_SHADOW_MEASUREMENTS_V7[anchor.subject];
      expect(2 * (anchor.shadow?.radiusX ?? 0)).toBeGreaterThanOrEqual(
        (measurement?.footRight ?? 0) - (measurement?.footLeft ?? 0),
      );
    }
  });
});

describe("unit shadow render plan (pulp_wars-jg1)", () => {
  const sprite = { x: 100, y: 50, width: 72 * 1.5, height: 88 * 1.5 };

  it("places the shadow and the ring from the anchor, scaled by the drawn sprite", () => {
    const subject = "UNIT:ICE_FOLK:KNIGHT" as const;
    const asset = liveAsset(subject);
    const anchor = UNIT_SHADOW_TABLE_V7[subject];
    if (anchor?.shadow == null || anchor.ring === null)
      throw new Error(subject);
    const geometry = directedUnitShadowGeometryV7(
      unitEntry(subject),
      sprite,
      asset.id,
    );
    expect(geometry.anchored).toBe(true);
    expect(geometry.shadow.centreX).toBeCloseTo(100 + anchor.shadow.x * 1.5);
    expect(geometry.shadow.centreY).toBeCloseTo(50 + anchor.shadow.y * 1.5);
    expect(geometry.shadow.radiusX).toBeCloseTo(anchor.shadow.radiusX * 1.5);
    expect(geometry.ring.centreY).toBeCloseTo(geometry.shadow.centreY);
    expect(geometry.ring.radiusX).toBeCloseTo(anchor.ring.radiusX * 1.5);
    // The Sabretooth stands 19 px above its canvas bottom: the shadow no
    // longer sits at the canvas bottom, where it used to show below it.
    const generic = directedUnitShadowGeometryV7(unitEntry(subject), sprite);
    expect(generic.anchored).toBe(false);
    expect(geometry.shadow.centreY).toBeLessThan(generic.shadow.centreY - 15);

    const { context, log } = recordingContext();
    drawDirectedUnitBaseV7(
      context,
      LIVE_DIRECTION_V7,
      unitEntry(subject, { ready: true }),
      sprite,
      1,
      asset.id,
    );
    const [shadow] = ellipsesPainted(
      log,
      DIRECTED_GROUND_SHADOW_COLOUR_V7,
      "fill",
    );
    const [ring] = ellipsesPainted(
      log,
      DIRECTED_READY_RING_COLOUR_V7,
      "stroke",
    );
    expect(shadow?.[1]).toBeCloseTo(geometry.shadow.centreY);
    expect(ring?.[1]).toBeCloseTo(geometry.ring.centreY);
    expect(ring?.[2]).toBeCloseTo(geometry.ring.radiusX);
  });

  it("keeps the generic ground afloat and for a stand-in raster, and puts a flyer's ring round its own shadow", () => {
    const boat = "UNIT:GOBLIN:PATROL_BOAT" as const;
    const afloat = directedUnitShadowGeometryV7(
      unitEntry(boat),
      sprite,
      liveAsset(boat).id,
    );
    expect(afloat).toMatchObject({ anchored: false, afloat: true });

    const saucer = "UNIT:MARTIAN:RAIDER" as const;
    const { context, log } = recordingContext();
    drawDirectedUnitBaseV7(
      context,
      LIVE_DIRECTION_V7,
      unitEntry(saucer, {
        ready: true,
        martian: { flyer: true } as NonNullable<
          BoardRenderPlanEntryV7["martian"]
        >,
      }),
      sprite,
      1,
      liveAsset(saucer).id,
    );
    // The flyer code draws its shadow; the base draws only the ring, round it.
    expect(
      ellipsesPainted(log, DIRECTED_GROUND_SHADOW_COLOUR_V7, "fill"),
    ).toEqual([]);
    const [ring] = ellipsesPainted(
      log,
      DIRECTED_READY_RING_COLOUR_V7,
      "stroke",
    );
    const presentation =
      MARTIAN_FLYER_PRESENTATION_V7["chibi-direction-martian-saucer"].shadow;
    expect(ring?.[0]).toBeCloseTo(100 + presentation.x * 1.5);
    expect(ring?.[1]).toBeCloseTo(50 + presentation.y * 1.5);
  });

  it("draws a grown Dinosaur's shadow from the grown sprite on the board", () => {
    const subject = "UNIT:DINOSAUR:JUGGERNAUT" as const;
    const asset = liveAsset(subject);
    const art: ChibiBoardArtV7 = {
      resolve: (request) => {
        const resolved = LIVE_DIRECTION_ART_REGISTRY_V7.variants(
          request.subject,
        )[0];
        return resolved === undefined
          ? { kind: "MISSING" }
          : {
              kind: "READY",
              asset: resolved,
              image: { width: 2, height: 2 } as unknown as CanvasImageSource,
              density: 1,
              smoothing: false,
              cacheKey: resolved.id,
            };
      },
    };
    const shadowOf = (growthStage: 1 | 2 | undefined): number[] => {
      const { context, log } = recordingContext();
      const camera = { zoom: chibiCameraZoom(1), offsetX: 200, offsetY: 200 };
      drawBoardV7({
        context,
        viewport: { width: 800, height: 600 },
        devicePixelRatio: 1,
        camera,
        plan: {
          version: 7,
          entries: [
            unitEntry(
              subject,
              growthStage === undefined ? {} : { growthStage },
            ),
          ],
          targets: [],
        },
        images: { resolve: () => null },
        artSet: "CHIBI",
        chibiArt: art,
        reducedMotion: true,
        direction: {
          spec: LIVE_DIRECTION_V7,
          art: createDirectedChibiArtV7({
            base: art,
            direction: LIVE_DIRECTION_V7,
            environment: {
              readPixels: (_image, width, height) =>
                new Uint8ClampedArray(width * height * 4).fill(200),
              createSurface: (pixels, width, height) =>
                ({ pixels, width, height }) as unknown as CanvasImageSource,
            },
          }),
        },
      });
      const [shadow] = ellipsesPainted(
        log,
        DIRECTED_GROUND_SHADOW_COLOUR_V7,
        "fill",
      );
      if (shadow === undefined) throw new Error("no shadow drawn");
      return shadow;
    };
    const anchor = UNIT_SHADOW_TABLE_V7[subject];
    if (anchor?.shadow == null) throw new Error(subject);
    const rect = chibiDestinationRect(
      { x: 200, y: 200 },
      { zoom: chibiCameraZoom(1), offsetX: 200, offsetY: 200 },
      asset,
      1,
    );
    const plain = shadowOf(undefined);
    expect(plain[0]).toBeCloseTo(rect.x + anchor.shadow.x);
    expect(plain[1]).toBeCloseTo(rect.y + anchor.shadow.y);
    expect(plain[2]).toBeCloseTo(anchor.shadow.radiusX);
    const growth = growthSpriteScaleV7(2, asset.width);
    expect(growth).toBeGreaterThan(1);
    const alpha = shadowOf(2);
    expect(alpha[2]).toBeCloseTo(anchor.shadow.radiusX * growth);
    // About the canvas bottom: the grown feet stand lower than the canvas
    // bottom minus their old gap, and the shadow follows them.
    const bottom = rect.y + rect.height;
    expect(alpha[1]).toBeCloseTo(
      bottom - (asset.height - anchor.shadow.y) * growth,
    );
  });
});
