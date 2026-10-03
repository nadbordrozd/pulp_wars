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
const RECOLOURED = "data:image/test;240,103,98";

const ROLES = [
  ["FIGHTER", "grunt"],
  ["RAIDER", "saucer"],
  ["MARKSMAN", "ray-gunner"],
  ["GUARD", "shield-projector"],
  ["CAPTAIN", "brain"],
  ["CATAPULT", "tripod"],
  ["KNIGHT", "mothership"],
  ["JUGGERNAUT", "colossus"],
] as const;

describe("Martian interface art (pulp_wars-t6s.4, MARTIAN.md wiring)", () => {
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

  it("shows every Martian portrait, dock sprite, icon and colony in fixed colours by default", () => {
    for (const [role, name] of ROLES) {
      expect(resolve(`PORTRAIT:MARTIAN:${role}`), role).toEqual({
        id: `chibi-direction-portrait-martian-${name}`,
        url: KEY,
        factionArt: true,
      });
      expect(resolve(`UNIT:MARTIAN:${role}`), role).toEqual({
        id: `chibi-direction-martian-${name}`,
        url: KEY,
        factionArt: true,
      });
    }
    for (const [subject, name] of [
      ["ICON:ACTION:BEAM_DOWN", "action-beam-down"],
      ["ICON:ACTION:MIND_CONTROL", "action-mind-control"],
      ["ICON:ACTION:TRACTOR_BEAM", "action-tractor-beam"],
      ["ICON:ACTION:FORCE_FIELD", "action-force-field"],
      ["ICON:ACTION:MARTIAN:RALLY", "action-martian-rally"],
      ["ICON:STATUS:SHIELD", "status-shield"],
      ["ICON:STATUS:COOLING", "status-cooling"],
    ] as const)
      expect(resolve(subject), subject).toMatchObject({
        id: `chibi-direction-icon-${name}`,
      });
    for (const level of [1, 2, 3] as const)
      expect(resolve(`CITY:MARTIAN:${level}`), `city ${level}`).toMatchObject({
        id: `chibi-direction-martian-city-${level}`,
        url: KEY,
      });
  });

  it("draws the Human stand-in in the Classic look (the Martian badge marks it)", () => {
    for (const [role] of ROLES) {
      const stand = resolve(`UNIT:${role}`, { classic: true });
      if (typeof stand !== "object") throw new Error(`${role}: ${stand}`);
      expect(resolve(`UNIT:MARTIAN:${role}`, { classic: true }), role).toEqual({
        ...stand,
        factionArt: false,
      });
    }
    expect(RECOLOURED).not.toBe(KEY);
    // The ability icons have no stand-in: the code-drawn glyph is kept.
    expect(resolve("ICON:ACTION:BEAM_DOWN", { classic: true })).toBe("MISSING");
    // Psychic Command falls back to the Human Rally horn.
    expect(resolve("ICON:ACTION:MARTIAN:RALLY", { classic: true })).toEqual(
      resolve("ICON:ACTION:RALLY", { classic: true }),
    );
  });

  it("falls back per piece to the Human stand-in when a Martian raster fails", () => {
    expect(
      resolve("UNIT:MARTIAN:KNIGHT", {
        failing: "chibi-direction-martian-mothership.",
      }),
    ).toMatchObject({ factionArt: false });
    expect(
      resolve("UNIT:MARTIAN:GUARD", {
        failing: "chibi-direction-martian-mothership.",
      }),
    ).toMatchObject({ id: "chibi-direction-martian-shield-projector" });
  });
});
