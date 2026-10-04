import { describe, expect, it } from "vitest";
import type { ArtSubjectV7 } from "../../src/assets/chibi-art-v7";
import { unitId } from "../../src/engine/index";
import {
  commandSubjectV7,
  portraitSubjectV7,
  technologySubjectV7,
} from "../../src/assets/chibi-ui-art-v7";
import { FACTION_COLOURS_V7 } from "../../src/render/canvas/faction-colours-v7";
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

const KEY = "data:image/test;216,38,44";

const ROLES = [
  ["FIGHTER", "gumdrop"],
  ["RAIDER", "donut-racer"],
  ["MARKSMAN", "gumball-gunner"],
  ["GUARD", "marshmallow"],
  ["CAPTAIN", "confectioner"],
  ["CATAPULT", "pie-launcher"],
  ["KNIGHT", "gummy-bear"],
  ["JUGGERNAUT", "rock-candy-golem"],
] as const;

describe("Candy interface art (pulp_wars-jdb.6, CANDY.md wiring)", () => {
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
    const resolution = art.resolve({
      subject,
      ownerColor: FACTION_COLOURS_V7.CANDY,
    });
    return resolution.kind === "READY"
      ? {
          id: resolution.asset.id,
          url: resolution.url,
          factionArt: resolution.factionArt,
        }
      : resolution.kind;
  };

  it("plays the Candy in cotton-candy pink", () => {
    expect(FACTION_COLOURS_V7.CANDY).toBe("#ffb8d8");
  });

  it("shows each Candy unit's own portrait and sprite in fixed colours", () => {
    for (const [role, name] of ROLES) {
      // The dock asks for the portrait of the unit's own role: the
      // Confectioner's dock shows the Confectioner, never another unit.
      expect(portraitSubjectV7(role, "CANDY")).toBe(`PORTRAIT:CANDY:${role}`);
      expect(resolve(portraitSubjectV7(role, "CANDY")), role).toEqual({
        id: `chibi-direction-portrait-candy-${name}`,
        url: KEY,
        factionArt: true,
      });
      expect(resolve(`UNIT:CANDY:${role}`), role).toEqual({
        id: `chibi-direction-candy-${name}`,
        url: KEY,
        factionArt: true,
      });
    }
    expect(resolve("PORTRAIT:CANDY:BATTLESHIP")).toMatchObject({
      id: "chibi-naval-candy-portrait-battleship",
    });
  });

  it("wires the Candy command, status and technology icons and the Crumbs", () => {
    for (const [subject, name] of [
      ["ICON:ACTION:SUGAR_RUSH", "icon-action-sugar-rush"],
      ["ICON:ACTION:REBAKE", "icon-action-rebake"],
      ["ICON:ACTION:SUGAR_TOSS", "icon-action-sugar-toss"],
      ["ICON:ACTION:CANDY:TEND_WOUNDED", "icon-action-frosting"],
      ["ICON:STATUS:RUSHED", "icon-status-rushed"],
      ["ICON:STATUS:CRASHED", "icon-status-crashed"],
      ["ICON:STATUS:SPLATTED", "icon-status-splatted"],
      ["ICON:TECH:CANDY:FORTIFICATION", "icon-tech-home-sweet-home"],
      ["ICON:TECH:CANDY:EXPLOSIVES", "icon-tech-peppermint-surprise"],
      ["CRUMBS", "candy-crumbs"],
    ] as const)
      expect(resolve(subject), subject).toMatchObject({
        id: `chibi-direction-${name}`,
      });
    // The buttons and the technology cards ask for exactly these.
    const tend = { kind: "TEND_WOUNDED", unitId: unitId(1) } as const;
    expect(commandSubjectV7(tend, "CANDY")).toBe(
      "ICON:ACTION:CANDY:TEND_WOUNDED",
    );
    expect(commandSubjectV7(tend, "ORIGINAL")).toBe("ICON:ACTION:TEND_WOUNDED");
    expect(technologySubjectV7("FORTIFICATION", "CANDY")).toBe(
      "ICON:TECH:CANDY:FORTIFICATION",
    );
    expect(technologySubjectV7("EXPLOSIVES", "CANDY")).toBe(
      "ICON:TECH:CANDY:EXPLOSIVES",
    );
    expect(technologySubjectV7("ADMINISTRATION", "CANDY")).toBe(
      "PORTRAIT:CANDY:CAPTAIN",
    );
  });

  it("falls back to the Human art in the Classic look", () => {
    expect(
      resolve("ICON:ACTION:CANDY:TEND_WOUNDED", { classic: true }),
    ).toEqual(resolve("ICON:ACTION:TEND_WOUNDED", { classic: true }));
    expect(resolve("ICON:TECH:CANDY:FORTIFICATION", { classic: true })).toEqual(
      resolve("ICON:TECH:FORTIFICATION", { classic: true }),
    );
    expect(resolve("ICON:TECH:CANDY:EXPLOSIVES", { classic: true })).toEqual(
      resolve("ICON:ACTION:BLAST_MOUNTAIN", { classic: true }),
    );
    // The ability and status icons have no stand-in: the buttons keep
    // their generic glyphs and the markers are code-drawn.
    expect(resolve("ICON:ACTION:SUGAR_RUSH", { classic: true })).toBe(
      "MISSING",
    );
    expect(resolve("ICON:STATUS:CRASHED", { classic: true })).toBe("MISSING");
    expect(resolve("CRUMBS", { classic: true })).toBe("MISSING");
  });
});
