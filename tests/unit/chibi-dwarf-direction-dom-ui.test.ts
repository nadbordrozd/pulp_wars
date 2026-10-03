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
  ["FIGHTER", "hammerer"],
  ["RAIDER", "gyrocopter"],
  ["MARKSMAN", "clockwork-gunner"],
  ["GUARD", "steam-mole"],
  ["CAPTAIN", "engineer"],
  ["CATAPULT", "steam-cannon"],
  ["KNIGHT", "steam-tank"],
  ["JUGGERNAUT", "brass-titan"],
] as const;

describe("Dwarf interface art (pulp_wars-78i.6, DWARF.md wiring)", () => {
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

  it("shows every Dwarf portrait, dock sprite, mound, icon and hold in fixed colours by default", () => {
    for (const [role, name] of ROLES) {
      expect(resolve(`PORTRAIT:DWARF:${role}`), role).toEqual({
        id: `chibi-direction-portrait-dwarf-${name}`,
        url: KEY,
        factionArt: true,
      });
      expect(resolve(`UNIT:DWARF:${role}`), role).toEqual({
        id: `chibi-direction-dwarf-${name}`,
        url: KEY,
        factionArt: true,
      });
    }
    // The mound has no Human counterpart, so it is never "faction art over a
    // stand-in" (the board draws no badge on it either way).
    expect(resolve("UNIT:DWARF:MOUND")).toMatchObject({
      id: "chibi-direction-dwarf-mound",
      url: KEY,
    });
    expect(resolve("UNIT:DWARF:MOUND_RIDER")).toMatchObject({
      id: "chibi-direction-dwarf-mound-rider",
    });
    for (const [subject, name] of [
      ["ICON:ACTION:TUNNEL", "action-tunnel"],
      ["ICON:ACTION:BOMB_RUN", "action-bomb-run"],
      ["ICON:ACTION:ASSEMBLE", "action-assemble"],
      ["ICON:ACTION:DWARF:TEND_WOUNDED", "action-repair"],
      ["ICON:STATUS:CLOCKWORK", "status-clockwork"],
      ["ICON:STATUS:DUG_IN", "status-dug-in"],
      ["ICON:TECH:DWARF:FORTIFICATION", "tech-dig-in"],
      ["ICON:TECH:DWARF:EXPLOSIVES", "tech-blasting-charges"],
    ] as const)
      expect(resolve(subject), subject).toMatchObject({
        id: `chibi-direction-icon-${name}`,
      });
    for (const level of [1, 2, 3] as const)
      expect(resolve(`CITY:DWARF:${level}`), `city ${level}`).toMatchObject({
        id: `chibi-direction-dwarf-city-${level}`,
        url: KEY,
      });
    // The Dwarf fleet through the generic naval wiring.
    expect(resolve("UNIT:DWARF:PATROL_BOAT")).toMatchObject({
      id: "chibi-naval-dwarf-patrol-boat",
    });
    expect(resolve("PORTRAIT:DWARF:BATTLESHIP")).toMatchObject({
      id: "chibi-naval-dwarf-portrait-battleship",
    });
  });

  it("draws the Human stand-in in the Classic look (the cog badge marks it)", () => {
    for (const [role] of ROLES) {
      const stand = resolve(`UNIT:${role}`, { classic: true });
      if (typeof stand !== "object") throw new Error(`${role}: ${stand}`);
      expect(resolve(`UNIT:DWARF:${role}`, { classic: true }), role).toEqual({
        ...stand,
        factionArt: false,
      });
    }
    // The mound has no stand-in (it is code-drawn), nor the ability icons.
    expect(resolve("UNIT:DWARF:MOUND", { classic: true })).toBe("MISSING");
    expect(resolve("ICON:ACTION:BOMB_RUN", { classic: true })).toBe("MISSING");
    // Repair, Dig In and Blasting Charges fall back to the Human art.
    expect(
      resolve("ICON:ACTION:DWARF:TEND_WOUNDED", { classic: true }),
    ).toEqual(resolve("ICON:ACTION:TEND_WOUNDED", { classic: true }));
    expect(resolve("ICON:TECH:DWARF:FORTIFICATION", { classic: true })).toEqual(
      resolve("ICON:TECH:FORTIFICATION", { classic: true }),
    );
    expect(resolve("ICON:TECH:DWARF:EXPLOSIVES", { classic: true })).toEqual(
      resolve("ICON:ACTION:BLAST_MOUNTAIN", { classic: true }),
    );
  });

  it("falls back per piece to the Human stand-in when a Dwarf raster fails", () => {
    expect(
      resolve("UNIT:DWARF:GUARD", {
        failing: "chibi-direction-dwarf-steam-mole.",
      }),
    ).toMatchObject({ factionArt: false });
    expect(
      resolve("UNIT:DWARF:FIGHTER", {
        failing: "chibi-direction-dwarf-steam-mole.",
      }),
    ).toMatchObject({ id: "chibi-direction-dwarf-hammerer" });
  });
});
