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
  ["FIGHTER", "caveman"],
  ["RAIDER", "raptor"],
  ["MARKSMAN", "spitter"],
  ["GUARD", "ankylosaurus"],
  ["CAPTAIN", "shaman"],
  ["CATAPULT", "triceratops"],
  ["KNIGHT", "t-rex"],
  ["JUGGERNAUT", "brontosaurus"],
] as const;

describe("Dinosaur interface art in the new direction (pulp_wars-3tq.13)", () => {
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

  it("shows every Dinosaur portrait, dock sprite and the Egg in fixed colours by default", () => {
    for (const [role, name] of ROLES) {
      // The portrait of the lay cards, the Hatch card and the technology
      // tree.
      expect(resolve(`PORTRAIT:DINOSAUR:${role}`), role).toEqual({
        id: `chibi-direction-portrait-dinosaur-${name}`,
        // The master as authored: no owner recolour.
        url: KEY,
        factionArt: true,
      });
      // The unit sprite of the selection dock and Help.
      expect(resolve(`UNIT:DINOSAUR:${role}`), role).toEqual({
        id: `chibi-direction-dinosaur-${name}`,
        url: KEY,
        factionArt: true,
      });
    }
    // The Egg's dock: the shell carries no owner colour. (`factionArt` says
    // a Human subject was replaced; the Egg has no Human counterpart.)
    expect(resolve("UNIT:DINOSAUR:EGG")).toEqual({
      id: "chibi-direction-dinosaur-egg",
      url: KEY,
      factionArt: false,
    });
    for (const [subject, name] of [
      ["ICON:ACTION:LAY_EGG", "lay-egg"],
      ["ICON:ACTION:HATCH", "hatch"],
      ["ICON:ACTION:STAMPEDE", "stampede"],
    ] as const)
      expect(resolve(subject), subject).toMatchObject({
        id: `chibi-direction-icon-action-${name}`,
      });
    // War Drums has no hide and no player colour: the classic icon.
    expect(resolve("ICON:ACTION:DINOSAUR:RALLY")).toMatchObject({
      id: "chibi-icon-action-dinosaur-rally",
    });
    for (const level of [1, 2, 3] as const)
      expect(resolve(`CITY:DINOSAUR:${level}`), `city ${level}`).toMatchObject({
        id: `chibi-direction-dinosaur-city-${level}`,
        url: KEY,
      });
  });

  it("keeps the classic Dinosaur art in the Classic look, in the owner's colour", () => {
    for (const [role, name] of ROLES) {
      expect(
        resolve(`PORTRAIT:DINOSAUR:${role}`, { classic: true }),
        role,
      ).toEqual({
        id: `chibi-portrait-dinosaur-${name}`,
        url: RECOLOURED,
        factionArt: true,
      });
      expect(resolve(`UNIT:DINOSAUR:${role}`, { classic: true }), role).toEqual(
        {
          id: `chibi-dinosaur-${name}`,
          url: RECOLOURED,
          factionArt: true,
        },
      );
    }
    expect(resolve("UNIT:DINOSAUR:EGG", { classic: true })).toEqual({
      id: "chibi-dinosaur-egg",
      url: RECOLOURED,
      factionArt: false,
    });
    expect(resolve("ICON:ACTION:LAY_EGG", { classic: true })).toMatchObject({
      id: "chibi-icon-action-lay-egg",
    });
    expect(resolve("CITY:DINOSAUR:2", { classic: true })).toMatchObject({
      id: "chibi-dinosaur-city-2",
      url: RECOLOURED,
    });
  });

  it("falls back per piece to the classic Dinosaur asset, never to Human art", () => {
    expect(
      resolve("PORTRAIT:DINOSAUR:KNIGHT", {
        failing: "chibi-direction-portrait-dinosaur-t-rex.",
      }),
    ).toEqual({
      id: "chibi-portrait-dinosaur-t-rex",
      url: RECOLOURED,
      factionArt: true,
    });
    // The other portraits are unaffected.
    expect(
      resolve("PORTRAIT:DINOSAUR:GUARD", {
        failing: "chibi-direction-portrait-dinosaur-t-rex.",
      }),
    ).toMatchObject({ id: "chibi-direction-portrait-dinosaur-ankylosaurus" });
    expect(
      resolve("UNIT:DINOSAUR:EGG", {
        failing: "chibi-direction-dinosaur-egg.",
      }),
    ).toEqual({
      id: "chibi-dinosaur-egg",
      url: RECOLOURED,
      factionArt: false,
    });
    // After this bead every faction's land units resolve to fixed-colour
    // art in the default look; only the shared ships keep an owner area.
    for (const [subject, id] of [
      ["PORTRAIT:FIGHTER", "chibi-direction-portrait-fighter"],
      ["PORTRAIT:GOBLIN:FIGHTER", "chibi-direction-portrait-goblin-goblin"],
      ["PORTRAIT:UNDEAD:FIGHTER", "chibi-direction-portrait-undead-skeleton"],
      ["UNIT:JUGGERNAUT", "chibi-direction-juggernaut"],
      ["UNIT:GOBLIN:JUGGERNAUT", "chibi-direction-goblin-troll"],
      ["UNIT:UNDEAD:JUGGERNAUT", "chibi-direction-undead-abomination"],
    ] as const)
      expect(resolve(subject), subject).toMatchObject({ id, url: KEY });
    for (const subject of [
      "UNIT:PATROL_BOAT",
      "UNIT:BATTLESHIP",
      "UNIT:EMBARKED_TRANSPORT",
    ] as const)
      expect(resolve(subject), subject).toMatchObject({ url: RECOLOURED });
  });
});
