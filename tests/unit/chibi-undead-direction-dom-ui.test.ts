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
      const source = image as unknown as {
        url?: string;
        pixels?: Uint8ClampedArray;
      };
      if (source.pixels !== undefined) return source.pixels;
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
  ["FIGHTER", "skeleton"],
  ["RAIDER", "ghoul"],
  ["MARKSMAN", "banshee"],
  ["GUARD", "zombie"],
  ["CAPTAIN", "necromancer"],
  ["CATAPULT", "lich"],
  ["KNIGHT", "vampire"],
  ["JUGGERNAUT", "abomination"],
] as const;

describe("Undead interface art in the new direction (pulp_wars-3tq.12)", () => {
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

  it("shows every Undead portrait and dock sprite in fixed colours by default", () => {
    for (const [role, name] of ROLES) {
      // The portrait of the train buttons, cards and the technology tree.
      expect(resolve(`PORTRAIT:UNDEAD:${role}`), role).toEqual({
        id: `chibi-direction-portrait-undead-${name}`,
        // The master as authored: no owner recolour.
        url: KEY,
        factionArt: true,
      });
      // The unit sprite of the selection dock.
      expect(resolve(`UNIT:UNDEAD:${role}`), role).toEqual({
        id: `chibi-direction-undead-${name}`,
        url: KEY,
        factionArt: true,
      });
    }
    for (const [subject, name] of [
      ["ICON:ACTION:RAISE_DEAD", "raise-dead"],
      ["ICON:ACTION:DEVOUR", "devour"],
      ["ICON:ACTION:WAIL", "wail"],
      ["ICON:ACTION:UNDEAD:RALLY", "undead-rally"],
    ] as const)
      expect(resolve(subject), subject).toMatchObject({
        id: `chibi-direction-icon-action-${name}`,
      });
    for (const level of [1, 2, 3] as const)
      expect(resolve(`CITY:UNDEAD:${level}`), `city ${level}`).toMatchObject({
        id: `chibi-direction-undead-city-${level}`,
        url: KEY,
      });
  });

  it("keeps the classic Undead art in the Classic look, in the owner's colour", () => {
    for (const [role, name] of ROLES) {
      expect(
        resolve(`PORTRAIT:UNDEAD:${role}`, { classic: true }),
        role,
      ).toEqual({
        id: `chibi-portrait-undead-${name}`,
        url: RECOLOURED,
        factionArt: true,
      });
      expect(resolve(`UNIT:UNDEAD:${role}`, { classic: true }), role).toEqual({
        id: `chibi-undead-${name}`,
        url: RECOLOURED,
        factionArt: true,
      });
    }
    expect(resolve("ICON:ACTION:WAIL", { classic: true })).toMatchObject({
      id: "chibi-icon-action-wail",
    });
    expect(resolve("CITY:UNDEAD:2", { classic: true })).toMatchObject({
      id: "chibi-undead-city-2",
      url: RECOLOURED,
    });
  });

  it("falls back per piece to the classic Undead asset, never to Human art", () => {
    expect(
      resolve("PORTRAIT:UNDEAD:KNIGHT", {
        failing: "chibi-direction-portrait-undead-vampire.",
      }),
    ).toEqual({
      id: "chibi-portrait-undead-vampire",
      url: RECOLOURED,
      factionArt: true,
    });
    // The other portraits are unaffected.
    expect(
      resolve("PORTRAIT:UNDEAD:GUARD", {
        failing: "chibi-direction-portrait-undead-vampire.",
      }),
    ).toMatchObject({ id: "chibi-direction-portrait-undead-zombie" });
    // Other factions' portraits never become Undead: the Dinosaurs (since
    // bead pulp_wars-3tq.13), the Goblins and the Humans keep their own
    // direction art.
    expect(resolve("PORTRAIT:DINOSAUR:FIGHTER")).toMatchObject({
      id: "chibi-direction-portrait-dinosaur-caveman",
      factionArt: true,
      url: KEY,
    });
    expect(resolve("PORTRAIT:GOBLIN:FIGHTER")).toMatchObject({
      id: "chibi-direction-portrait-goblin-goblin",
      factionArt: true,
    });
    expect(resolve("PORTRAIT:FIGHTER")).toMatchObject({
      id: "chibi-direction-portrait-fighter",
    });
  });
});
