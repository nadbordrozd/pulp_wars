/**
 * Cuts the same rectangle out of several screenshots and sets the cuts side
 * by side, enlarged, each under its file's name (bead pulp_wars-2yc.28).
 *
 *   npx tsx scripts/art/terrain-fog/crop.ts <out.png> <x,y,w,h> <scale> <a.png> [<b.png> ...]
 *
 * A file may be given as `title=path` to put that title over its cut.
 */
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";

const [out, boxText, scaleText, ...files] = process.argv.slice(2);
if (out === undefined || boxText === undefined || files.length === 0)
  throw new Error(
    "usage: crop.ts <out.png> <x,y,w,h> <scale> <a.png> [<b.png> ...]",
  );
const [left = 0, top = 0, width = 100, height = 100] = boxText
  .split(",")
  .map(Number);
const scale = Number(scaleText ?? "1");
const gap = 12;
const head = 30;
const cellWidth = Math.round(width * scale);
const cellHeight = Math.round(height * scale);
const composites: OverlayOptions[] = [];
for (const [index, entry] of files.entries()) {
  const split = entry.indexOf("=");
  const file = split < 0 ? entry : entry.slice(split + 1);
  const title = split < 0 ? path.basename(file, ".png") : entry.slice(0, split);
  const x = index * (cellWidth + gap);
  composites.push({
    input: Buffer.from(
      `<svg width="${cellWidth}" height="${head}"><text x="2" y="21" font-family="Helvetica" font-weight="700" font-size="17" fill="#f2f2ee">${title}</text></svg>`,
    ),
    left: x,
    top: 0,
  });
  composites.push({
    input: await sharp(file)
      .extract({ left, top, width, height })
      .resize(cellWidth, cellHeight, {
        kernel: scale < 1 ? "lanczos3" : "nearest",
      })
      .png()
      .toBuffer(),
    left: x,
    top: head,
  });
}
await sharp({
  create: {
    width: files.length * (cellWidth + gap) - gap,
    height: head + cellHeight,
    channels: 4,
    background: { r: 20, g: 24, b: 26, alpha: 1 },
  },
})
  .composite(composites)
  .png()
  .toFile(out);
console.log(`wrote ${out}`);
