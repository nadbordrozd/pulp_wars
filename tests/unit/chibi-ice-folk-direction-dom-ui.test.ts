import { describe, expect, it } from "vitest";
import type { ArtSubjectV7 } from "../../src/assets/chibi-art-v7";
import { LIVE_DIRECTION_ART_REGISTRY_V7 } from "../../src/render/canvas/live-board-look-v7";
import {
  createChibiDomArtV7,
  type ChibiDomEnvironmentV7,
} from "../../src/render/dom/chibi-dom-art-v7";

/**
 * Rasters settle at once; every master reads back as a block of the key
 * colour and every mask as fully opaque, so a recolour shows in the encoded
 * URL. A URL containing a fragment of `failing` fails to load.
 */
function environment(failing = "\u0000"): ChibiDomEnvironmentV7 {
  return {
    loadImage(url, settle) {
      settle(!url.includes(failing));
      return { url } as unknown as CanvasImageSource;
    },
    readPixels(image, width, height) {
      const source = image as unknown as { url?: string };
      const pixels = new Uint8ClampedArray(width * height * 4);
      if (source.url?.endsWith(".mask.png")) pixels.fill(255);
      else
        for (let y = 2; y < 8; y += 1)
          for (let x = 3; x < 7; x += 1)
            pixels.set([216, 38, 44, 255], (y * width + x) * 4);
      return pixels;
    },
    createSurface: (pixels, width, height) =>
      ({ pixels, width, height }) as unknown as CanvasImageSource,
    encode: (surface) => {
      const { pixels } = surface as unknown as { pixels: Uint8ClampedArray };
      return `data:image/test;${pixels[0]},${pixels[1]},${pixels[2]}`;
    },
  };
}

const CORAL = "#f06762";
const KEY = "data:image/test;216,38,44";

const ROLES = [
  ["FIGHTER", "yeti"],
  ["RAIDER", "sled"],
  ["MARKSMAN", "snow-hunter"],
  ["GUARD", "mammoth"],
  ["CAPTAIN", "ice-witch"],
  ["CATAPULT", "boulder-yeti"],
  ["KNIGHT", "sabretooth"],
  ["JUGGERNAUT", "frost-giant"],
] as const;

describe("Ice Folk interface art (pulp_wars-7g3.6, ICE_FOLK.md wiring)", () => {
  const resolve = (
    subject: ArtSubjectV7,
    options: { readonly classic?: boolean; readonly failing?: string } = {},
  ) => {
    const art = createChibiDomArtV7({
      environment: environment(options.failing),
      onChange: () => undefined,
      ...(options.classic === true
        ? {}
        : { preferred: LIVE_DIRECTION_ART_REGISTRY_V7 }),
    });
    const resolution = art.resolve({ subject, ownerColor: CORAL });
    return resolution.kind === "READY"
      ? {
          id: resolution.asset.id,
          url: resolution.url,
          factionArt: resolution.factionArt,
        }
      : resolution.kind;
  };

  it("shows every Ice Folk portrait, dock sprite, icon and camp in fixed colours by default", () => {
    for (const [role, name] of ROLES) {
      expect(resolve(`PORTRAIT:ICE_FOLK:${role}`), role).toEqual({
        id: `chibi-direction-portrait-ice-folk-${name}`,
        url: KEY,
        factionArt: true,
      });
      expect(resolve(`UNIT:ICE_FOLK:${role}`), role).toEqual({
        id: `chibi-direction-ice-folk-${name}`,
        url: KEY,
        factionArt: true,
      });
    }
    for (const [subject, name] of [
      ["ICON:ACTION:THROW_BOLAS", "action-throw-bolas"],
      ["ICON:ACTION:COLD_SNAP", "action-cold-snap"],
      ["ICON:STATUS:CHILLED", "status-chilled"],
      ["ICON:STATUS:FROZEN", "status-frozen"],
      ["ICON:TECH:ICE_FOLK:FORTIFICATION", "tech-deep-winter"],
      ["ICON:TECH:ICE_FOLK:EXPLOSIVES", "tech-brittle"],
    ] as const)
      expect(resolve(subject), subject).toMatchObject({
        id: `chibi-direction-icon-${name}`,
      });
    for (const level of [1, 2, 3] as const)
      expect(resolve(`CITY:ICE_FOLK:${level}`), `city ${level}`).toMatchObject({
        id: `chibi-direction-ice-folk-city-${level}`,
        url: KEY,
      });
  });

  it("draws the Human stand-in in the Classic look (the peak badge marks it)", () => {
    for (const [role] of ROLES) {
      const stand = resolve(`UNIT:${role}`, { classic: true });
      if (typeof stand !== "object") throw new Error(`${role}: ${stand}`);
      expect(resolve(`UNIT:ICE_FOLK:${role}`, { classic: true }), role).toEqual(
        { ...stand, factionArt: false },
      );
    }
    // The ability icons have no stand-in: the code-drawn glyph is kept.
    expect(resolve("ICON:ACTION:THROW_BOLAS", { classic: true })).toBe(
      "MISSING",
    );
    // Deep Winter and Brittle fall back to the Human Fortification and
    // Explosives art.
    expect(
      resolve("ICON:TECH:ICE_FOLK:FORTIFICATION", { classic: true }),
    ).toEqual(resolve("ICON:TECH:FORTIFICATION", { classic: true }));
    expect(resolve("ICON:TECH:ICE_FOLK:EXPLOSIVES", { classic: true })).toEqual(
      resolve("ICON:ACTION:BLAST_MOUNTAIN", { classic: true }),
    );
  });

  it("falls back per piece to the Human stand-in when an Ice Folk raster fails", () => {
    expect(
      resolve("UNIT:ICE_FOLK:GUARD", {
        failing: "chibi-direction-ice-folk-mammoth.",
      }),
    ).toMatchObject({ factionArt: false });
    expect(
      resolve("UNIT:ICE_FOLK:FIGHTER", {
        failing: "chibi-direction-ice-folk-mammoth.",
      }),
    ).toMatchObject({ id: "chibi-direction-ice-folk-yeti" });
  });
});
