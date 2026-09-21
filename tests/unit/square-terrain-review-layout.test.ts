import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  individualTerrainLayout,
  type ReviewBounds,
} from "../../scripts/art/square-terrain-review-layout";

type Layout = ReturnType<typeof individualTerrainLayout>;

function expectContained(inner: ReviewBounds, outer: ReviewBounds) {
  expect(inner.left).toBeGreaterThanOrEqual(outer.left);
  expect(inner.top).toBeGreaterThanOrEqual(outer.top);
  expect(inner.left + inner.width).toBeLessThanOrEqual(
    outer.left + outer.width,
  );
  expect(inner.top + inner.height).toBeLessThanOrEqual(
    outer.top + outer.height,
  );
}

function expectSeparate(a: ReviewBounds, b: ReviewBounds) {
  expect(
    a.left + a.width <= b.left ||
      b.left + b.width <= a.left ||
      a.top + a.height <= b.top ||
      b.top + b.height <= a.top,
  ).toBe(true);
}

function expectUnclipped(layout: Layout) {
  for (const [index, panel] of layout.panels.entries()) {
    expectContained(panel.bounds, { left: 0, top: 0, ...layout });
    expectContained(panel.label, panel.bounds);
    const contents = [panel.label];
    for (const kind of ["source", "native", "enlarged"] as const) {
      expectContained(panel[kind].bounds, panel.bounds);
      expectContained(panel[kind].image, panel[kind].bounds);
      for (const previous of contents)
        expectSeparate(previous, panel[kind].bounds);
      contents.push(panel[kind].bounds);
    }
    for (const other of layout.panels.slice(index + 1))
      expectSeparate(panel.bounds, other.bounds);
  }
}

describe("square terrain individual review layout", () => {
  it("fits variable image dimensions without overlapping labels or neighboring cells", () => {
    const layout = individualTerrainLayout(
      Array.from({ length: 11 }, (_, index) => ({
        id: `terrain-${index}`,
        source: { width: 176, height: index === 5 ? 400 : 264 },
        native: { width: 128, height: 192 },
        enlarged: { width: index === 10 ? 600 : 256, height: 801 },
      })),
      52,
    );
    expectUnclipped(layout);
  });

  for (const faction of ["original", "candy"]) {
    it(`contains all 11 ${faction} assets and preserves their complete bottom edges at each scale`, async () => {
      const reviewRoot = `art/pixellab/reviews/square-${faction}-terrain`;
      const evidence = JSON.parse(
        await readFile(`${reviewRoot}/review-evidence.json`, "utf8"),
      ) as { readonly individualLayout: Layout };
      const layout = evidence.individualLayout;
      expect(layout.panels.map(({ id }) => id)).toEqual(
        [
          ...[1, 2, 3, 4].map((variant) => `grass-${variant}`),
          ...[1, 2, 3, 4].map((variant) => `forest-${variant}`),
          ...[1, 2, 3].map((variant) => `mountain-${variant}`),
        ].map((id) => `terrain-square-${faction}-${id}`),
      );
      expectUnclipped(layout);
      const sheet = await readFile(
        `${reviewRoot}/individual-native-enlarged.png`,
      );
      expect(await sharp(sheet).metadata()).toMatchObject({
        width: layout.width,
        height: layout.height,
      });
      for (const panel of layout.panels) {
        const file = `public/assets/pixellab/terrain-square/${panel.id.replace("terrain-square-", "")}.png`;
        const metadata = await sharp(file).metadata();
        for (const [kind, width] of [
          ["source", 176],
          ["native", 128],
          ["enlarged", 256],
        ] as const) {
          const bounds = panel[kind].image;
          expect(bounds.width).toBe(width);
          expect(bounds.height).toBe(
            Math.round((metadata.height * width) / metadata.width),
          );
          const rendered = await sharp(file)
            .resize({
              width,
              kernel:
                kind === "enlarged"
                  ? sharp.kernel.nearest
                  : sharp.kernel.lanczos3,
            })
            .ensureAlpha()
            .raw()
            .toBuffer();
          const edge = await sharp(sheet)
            .extract({
              left: bounds.left,
              top: bounds.top + bounds.height - 8,
              width,
              height: 8,
            })
            .ensureAlpha()
            .raw()
            .toBuffer();
          expect(
            edge.equals(rendered.subarray(rendered.length - width * 8 * 4)),
            `${panel.id} ${kind} lower edge`,
          ).toBe(true);
        }
      }
    });
  }
});
