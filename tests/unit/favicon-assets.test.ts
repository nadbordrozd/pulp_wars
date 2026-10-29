import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readRaster } from "../../scripts/art/chibi/pipeline";
import {
  FAVICON_FILES,
  decodeIco,
  faviconProblems,
} from "../../scripts/art/favicon";

/**
 * The favicon (bead pulp_wars-beh7): the goblin mascot, from reviewed
 * PixelLab takes, served from public/ so the page's links resolve under
 * the development root and the GitHub Pages base alike.
 */
const ROOT = path.resolve(".");
const publicFile = (file: string): string => path.join(ROOT, "public", file);

describe("favicon", () => {
  it("is what its recorded takes and hand edits derive", async () => {
    expect(await faviconProblems(ROOT)).toEqual([]);
  });

  it("serves transparent 16, 32 and 48 px icons and an opaque 180 px touch icon", async () => {
    for (const [file, size] of [
      [FAVICON_FILES.png16, 16],
      [FAVICON_FILES.png32, 32],
      [FAVICON_FILES.png48, 48],
    ] as const) {
      const raster = await readRaster(await readFile(publicFile(file)));
      expect([raster.width, raster.height], file).toEqual([size, size]);
      // Floats on transparency, so a tab shows its own colour round it.
      expect(raster.data[3], file).toBe(0);
    }
    const apple = await readRaster(
      await readFile(publicFile(FAVICON_FILES.appleTouch)),
    );
    expect([apple.width, apple.height]).toEqual([180, 180]);
    for (let index = 3; index < apple.data.length; index += 4)
      expect(apple.data[index]).toBe(255);
  });

  it("puts the 16, 32 and 48 px icons in favicon.ico", async () => {
    const images = decodeIco(await readFile(publicFile(FAVICON_FILES.ico)));
    expect(images.map((image) => image.size)).toEqual([16, 32, 48]);
  });

  it("links every icon from the page with a root-relative URL", async () => {
    const html = await readFile(path.join(ROOT, "index.html"), "utf8");
    const links = [
      ...html.matchAll(/<link\s[^>]*rel="(?:icon|apple-touch-icon)"[^>]*>/g),
    ]
      .map((match) => /href="([^"]+)"/.exec(match[0])?.[1])
      .filter((href): href is string => href !== undefined);
    // Vite prefixes these with the base (`/pulp_wars/`) in a build.
    expect(new Set(links)).toEqual(
      new Set(Object.values(FAVICON_FILES).map((file) => `/${file}`)),
    );
    expect(html).toContain('rel="apple-touch-icon"');
  });
});
