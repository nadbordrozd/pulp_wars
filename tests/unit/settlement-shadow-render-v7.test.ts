import { describe, expect, it } from "vitest";
import {
  SETTLEMENT_SHADOW_ENABLED_V7,
  SETTLEMENT_SHADOW_V7,
  drawSettlementShadowV7,
  hasSettlementShadowV7,
  settlementShadowEllipsesV7,
  settlementShadowEnabledV7,
} from "../../src/render/canvas/settlement-shadow-v7";
import { DIRECTED_GROUND_SHADOW_COLOUR_V7 } from "../../src/render/canvas/visual-direction-v7";

/**
 * pulp_wars-2yc.8 (docs/art/SETTLEMENT_SHADOW.md), a try: cities and
 * villages stand on a soft ground shadow in the live look.
 */

describe("the settlement shadow", () => {
  it("is on by default and the query string overrides it", () => {
    expect(SETTLEMENT_SHADOW_ENABLED_V7).toBe(true);
    expect(settlementShadowEnabledV7("")).toBe(true);
    for (const off of ["0", "off", "false"])
      expect(settlementShadowEnabledV7(`?art=chibi&city-shadow=${off}`)).toBe(
        false,
      );
    expect(settlementShadowEnabledV7("?city-shadow=1")).toBe(true);
    expect(settlementShadowEnabledV7()).toBe(true);
  });

  it("is for cities and villages only", () => {
    expect(hasSettlementShadowV7({ kind: "CITY" })).toBe(true);
    expect(
      hasSettlementShadowV7({ kind: "SITE", artSubject: "SITE:VILLAGE" }),
    ).toBe(true);
    expect(
      hasSettlementShadowV7({ kind: "SITE", artSubject: "TREASURE" }),
    ).toBe(false);
    for (const kind of ["UNIT", "IMPROVEMENT", "TERRAIN", "RESOURCE"])
      expect(hasSettlementShadowV7({ kind })).toBe(false);
  });

  it("is the units' shadow colour under the footprint, and a fainter one up and to the right", () => {
    const sprite = { x: 100, y: 200, width: 80, height: 80 };
    const [cast, contact] = settlementShadowEllipsesV7(sprite);
    if (cast === undefined || contact === undefined)
      throw new Error("no ellipses");
    expect(contact.fill).toBe(DIRECTED_GROUND_SHADOW_COLOUR_V7);
    expect(SETTLEMENT_SHADOW_V7.cast).toBe("rgba(18, 22, 30, 0.12)");
    // Under the lower half of the sprite, and flat.
    expect(contact.centreY).toBeGreaterThan(sprite.y + sprite.height / 2);
    expect(contact.centreY + contact.radiusY).toBeLessThanOrEqual(
      sprite.y + sprite.height,
    );
    expect(contact.radiusY).toBeLessThan(contact.radiusX * 0.6);
    // The sun is at the bottom left: the cast lies up and to the right,
    // and only a little.
    expect(cast.centreX).toBeGreaterThan(contact.centreX);
    expect(cast.centreY).toBeLessThan(contact.centreY);
    expect(cast.centreX - contact.centreX).toBeLessThan(sprite.width * 0.1);
    expect(contact.centreY - cast.centreY).toBeLessThan(sprite.height * 0.1);
    // It stays inside the cell's width plus a few pixels.
    expect(cast.centreX + cast.radiusX).toBeLessThan(
      sprite.x + sprite.width * 1.1,
    );
    expect(contact.centreX - contact.radiusX).toBeGreaterThan(
      sprite.x - sprite.width * 0.05,
    );
    // It scales with the sprite.
    const [, half] = settlementShadowEllipsesV7({
      x: 0,
      y: 0,
      width: 40,
      height: 40,
    });
    expect(half?.radiusX).toBeCloseTo(contact.radiusX / 2);
  });

  it("draws two ellipses under a city and nothing under anything else", () => {
    const fills: string[] = [];
    const state = { fillStyle: "", globalAlpha: 1 };
    const fake = {
      save() {},
      restore() {},
      beginPath() {},
      ellipse() {},
      fill() {
        fills.push(`${state.fillStyle}@${state.globalAlpha}`);
      },
    };
    Object.defineProperties(fake, {
      fillStyle: {
        get: () => state.fillStyle,
        set: (value: string) => {
          state.fillStyle = value;
        },
      },
      globalAlpha: {
        get: () => state.globalAlpha,
        set: (value: number) => {
          state.globalAlpha = value;
        },
      },
    });
    const context = fake as unknown as CanvasRenderingContext2D;
    const sprite = { x: 0, y: 0, width: 80, height: 80 };
    drawSettlementShadowV7(context, { kind: "UNIT" }, sprite);
    expect(fills).toEqual([]);
    drawSettlementShadowV7(context, { kind: "CITY" }, sprite, 0.5);
    expect(fills).toEqual([
      `${SETTLEMENT_SHADOW_V7.cast}@0.5`,
      `${SETTLEMENT_SHADOW_V7.contact}@0.5`,
    ]);
  });
});
