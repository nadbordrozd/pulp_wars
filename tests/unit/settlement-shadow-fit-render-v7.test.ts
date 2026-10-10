import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import type { ChibiArtAssetV7 } from "../../src/assets/chibi-art-v7";
import { chibiDirectionArtAssetsV7 } from "../../src/assets/chibi-direction-art-manifest";
import { LIVE_DIRECTION_ART_REGISTRY_V7 } from "../../src/render/canvas/live-board-look-v7";
import { SETTLEMENT_SHADOW_MEASUREMENTS_V7 } from "../../src/render/canvas/settlement-shadow-measurements-v7.generated";
import {
  SETTLEMENT_SHADOW_FIT_V7,
  SETTLEMENT_SHADOW_TABLE_V7,
  SETTLEMENT_SHADOW_V7,
  deriveSettlementShadowAnchorV7,
  drawSettlementShadowV7,
  settlementShadowEllipsesV7,
  settlementShadowEnabledV7,
  settlementShadowPlainV7,
} from "../../src/render/canvas/settlement-shadow-v7";
import { measureSettlementFootprintV7 } from "../../scripts/art/settlement-shadows/measure";

/**
 * pulp_wars-2yc.12 (docs/art/SETTLEMENT_SHADOW.md): a city's or a
 * village's ground shadow is fitted to the measured footprint of its own
 * raster, as a unit's is, instead of one shape for every settlement.
 */

/** The settlement rasters the live look draws first, one per subject. */
const LIVE_SETTLEMENTS: readonly ChibiArtAssetV7[] = [
  ...new Set(
    chibiDirectionArtAssetsV7()
      .filter((asset) => asset.assetClass === "SETTLEMENT")
      .map((asset) => asset.subject),
  ),
].map((subject) => {
  const asset = LIVE_DIRECTION_ART_REGISTRY_V7.variants(subject)[0];
  if (asset === undefined) throw new Error(`${subject}: no live asset`);
  return asset;
});

/** A raster with the pixels `inside` says are opaque. */
function raster(
  width: number,
  height: number,
  inside: (x: number, y: number) => boolean,
) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1)
      if (inside(x, y)) data[(y * width + x) * 4 + 3] = 255;
  return { width, height, data };
}

describe("the settlement footprint measurement", () => {
  it("finds the ends, the ground line and the front of a round ground", () => {
    // An ellipse of ground, 60 wide and 30 deep, centred on (40, 50).
    const round = measureSettlementFootprintV7(
      raster(
        80,
        80,
        (x, y) => ((x + 0.5 - 40) / 30) ** 2 + ((y + 0.5 - 50) / 15) ** 2 <= 1,
      ),
    );
    expect(round.left).toBe(10);
    expect(round.right).toBe(70);
    expect(round.contactY).toBe(65);
    expect(Math.abs(round.leftY - 55)).toBeLessThanOrEqual(3);
    expect(round.rightY).toBe(round.leftY);
    expect(round.fullness).toBeGreaterThan(0.9);
  });

  it("calls a walled town's diamond leaner than a round ground", () => {
    // A diamond with the same ends and front, with walls standing on it.
    const diamond = measureSettlementFootprintV7(
      raster(
        80,
        80,
        (x, y) =>
          Math.abs(x + 0.5 - 40) / 30 + Math.abs(y + 0.5 - 50) / 15 <= 1 ||
          (y < 50 &&
            y >= 30 &&
            Math.abs(x + 0.5 - 40) / 30 + Math.abs(y + 20.5 - 50) / 15 <= 1),
      ),
    );
    // A corner's single pixel does not count as a column or a row.
    expect(diamond.left).toBeGreaterThanOrEqual(10);
    expect(diamond.left).toBeLessThanOrEqual(12);
    expect(diamond.right).toBeGreaterThanOrEqual(68);
    expect(diamond.contactY).toBeGreaterThanOrEqual(63);
    expect(diamond.contactY).toBeLessThanOrEqual(65);
    expect(diamond.fullness).toBeGreaterThan(0.65);
    expect(diamond.fullness).toBeLessThan(0.85);
  });

  it("ignores a stray pixel and rejects an empty raster", () => {
    const ground = (x: number, y: number): boolean =>
      ((x + 0.5 - 40) / 30) ** 2 + ((y + 0.5 - 50) / 15) ** 2 <= 1;
    const clean = measureSettlementFootprintV7(raster(80, 80, ground));
    const stray = measureSettlementFootprintV7(
      raster(80, 80, (x, y) => ground(x, y) || (x === 2 && y === 78)),
    );
    expect(stray).toEqual(clean);
    expect(() =>
      measureSettlementFootprintV7(raster(8, 8, () => false)),
    ).toThrow();
  });
});

describe("the fitted settlement shadow", () => {
  it("has a measurement for every faction's city at every level and the Village", () => {
    const subjects = LIVE_SETTLEMENTS.map((asset) => asset.subject);
    for (const faction of [
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
      "DWARF",
      "CANDY",
    ])
      for (const level of [1, 2, 3])
        expect(subjects).toContain(`CITY:${faction}:${level}`);
    for (const level of [1, 2, 3]) expect(subjects).toContain(`CITY:${level}`);
    expect(subjects).toContain("SITE:VILLAGE");
    expect(Object.keys(SETTLEMENT_SHADOW_MEASUREMENTS_V7).sort()).toEqual(
      LIVE_SETTLEMENTS.map((asset) => asset.id).sort(),
    );
  });

  it("matches the masters (npm run art:settlement-shadows-measure is current)", async () => {
    for (const asset of LIVE_SETTLEMENTS) {
      const { data, info } = await sharp(
        path.join(process.cwd(), "public", asset.url.replace(/^\/+/, "")),
      )
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect(SETTLEMENT_SHADOW_MEASUREMENTS_V7[asset.id], asset.id).toEqual({
        subject: asset.subject,
        width: asset.width,
        height: asset.height,
        ...measureSettlementFootprintV7({
          width: info.width,
          height: info.height,
          data: new Uint8Array(data),
        }),
      });
    }
  });

  it("lies under each raster's own footprint", () => {
    const fit = SETTLEMENT_SHADOW_FIT_V7;
    for (const asset of LIVE_SETTLEMENTS) {
      const measured = SETTLEMENT_SHADOW_MEASUREMENTS_V7[asset.id];
      const anchor = SETTLEMENT_SHADOW_TABLE_V7[asset.id];
      if (measured === undefined || anchor === undefined)
        throw new Error(`${asset.id}: not measured`);
      const { contact, cast } = anchor;
      // Centred between the footprint's ends, no wider than them plus the
      // rim, and its front edge on the contact line within the rim.
      expect(contact.x, asset.id).toBe((measured.left + measured.right) / 2);
      expect(contact.x - contact.radiusX, asset.id).toBeGreaterThanOrEqual(
        measured.left - fit.rim,
      );
      expect(contact.x + contact.radiusX, asset.id).toBeLessThanOrEqual(
        measured.right + fit.rim,
      );
      const front = contact.y + contact.radiusY;
      expect(front, asset.id).toBeLessThanOrEqual(
        measured.contactY + fit.rim + 1e-9,
      );
      expect(front, asset.id).toBeGreaterThan(measured.contactY - 8);
      // Flat, like ground seen from above and in front.
      expect(contact.radiusY, asset.id).toBeLessThan(contact.radiusX * 0.75);
      // The sun is at the bottom left: the cast lies up and to the right,
      // and stays within a few pixels of the raster's width.
      expect(cast.x, asset.id).toBeGreaterThan(contact.x);
      expect(cast.y, asset.id).toBeLessThan(contact.y);
      expect(cast.x + cast.radiusX, asset.id).toBeLessThan(asset.width + 12);
    }
  });

  it("differs from city to city: a camp low in its canvas, a village small", () => {
    const anchorOf = (id: string) => {
      const anchor = SETTLEMENT_SHADOW_TABLE_V7[id];
      if (anchor === undefined) throw new Error(`${id}: not measured`);
      return anchor;
    };
    const village = anchorOf("chibi-direction-village");
    const castle = anchorOf("chibi-direction-city-3");
    expect(village.contact.radiusX).toBeLessThan(castle.contact.radiusX - 8);
    // The Dinosaur camp stands well above its canvas bottom; the one
    // shape used to lie below it.
    const camp = anchorOf("chibi-direction-dinosaur-city-1");
    const sprite = { x: 0, y: 0, width: camp.width, height: camp.height };
    const [, fitted] = settlementShadowEllipsesV7(sprite, camp.assetId);
    const [, plain] = settlementShadowEllipsesV7(sprite);
    if (fitted === undefined || plain === undefined) throw new Error("none");
    expect(fitted.centreY + fitted.radiusY).toBeLessThan(
      plain.centreY + plain.radiusY - 6,
    );
  });

  it("takes the lower end as the ground where a roof or mast overhangs", () => {
    const anchor = deriveSettlementShadowAnchorV7("x", {
      subject: "CITY:1",
      width: 80,
      height: 80,
      contactY: 77,
      left: 10,
      right: 70,
      leftY: 63,
      rightY: 48,
      fullness: 0.8,
    });
    // Front to ground is 14 px; 30 px half-width x 0.8 + the rim.
    expect(anchor.contact.y).toBe(63);
    expect(anchor.contact.radiusX).toBeCloseTo(
      24 + SETTLEMENT_SHADOW_FIT_V7.rim,
    );
    expect(anchor.contact.radiusY).toBeCloseTo(
      14 * 0.8 + SETTLEMENT_SHADOW_FIT_V7.rim,
    );
  });

  it("scales with the drawn sprite and keeps the one shape for an unmeasured raster", () => {
    const anchor = SETTLEMENT_SHADOW_TABLE_V7["chibi-direction-city-2"];
    if (anchor === undefined) throw new Error("not measured");
    const at = (scale: number) =>
      settlementShadowEllipsesV7(
        {
          x: 100,
          y: 200,
          width: anchor.width * scale,
          height: anchor.height * scale,
        },
        anchor.assetId,
      );
    const [cast, contact] = at(1);
    const [, doubled] = at(2);
    if (cast === undefined || contact === undefined || doubled === undefined)
      throw new Error("no ellipses");
    expect(contact.centreX).toBeCloseTo(100 + anchor.contact.x);
    expect(contact.centreY).toBeCloseTo(200 + anchor.contact.y);
    expect(doubled.radiusX).toBeCloseTo(contact.radiusX * 2);
    expect(doubled.centreY).toBeCloseTo(200 + anchor.contact.y * 2);
    expect(contact.fill).toBe(SETTLEMENT_SHADOW_V7.contact);
    expect(cast.fill).toBe(SETTLEMENT_SHADOW_V7.cast);
    const sprite = { x: 0, y: 0, width: 80, height: 80 };
    expect(settlementShadowEllipsesV7(sprite, "some-other-raster")).toEqual(
      settlementShadowEllipsesV7(sprite),
    );
  });

  it("is drawn for the raster the sprite is drawn with", () => {
    const ellipses: number[][] = [];
    const context = {
      save() {},
      restore() {},
      beginPath() {},
      ellipse(...values: number[]) {
        ellipses.push(values.slice(0, 4));
      },
      fill() {},
      globalAlpha: 1,
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D;
    const sprite = { x: 0, y: 0, width: 72, height: 72 };
    drawSettlementShadowV7(
      context,
      { kind: "SITE", artSubject: "SITE:VILLAGE" },
      sprite,
      1,
      "chibi-direction-village",
    );
    expect(ellipses).toEqual(
      settlementShadowEllipsesV7(sprite, "chibi-direction-village").map(
        (ellipse) => [
          ellipse.centreX,
          ellipse.centreY,
          ellipse.radiusX,
          ellipse.radiusY,
        ],
      ),
    );
  });

  it("has a review value that draws the one shape again", () => {
    expect(settlementShadowPlainV7("?city-shadow=plain")).toBe(true);
    expect(settlementShadowEnabledV7("?city-shadow=plain")).toBe(true);
    for (const query of ["", "?city-shadow=1", "?city-shadow=0"])
      expect(settlementShadowPlainV7(query)).toBe(false);
    expect(settlementShadowPlainV7()).toBe(false);
  });
});
