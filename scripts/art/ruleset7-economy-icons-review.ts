import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";

const root = process.cwd();
const ids = ["ui-hud-gold-coin-v7", "ui-hud-population"] as const;
const source = JSON.parse(
  await readFile(path.join(root, "scripts/art/pixellab-manifest.json"), "utf8"),
) as { recipes: { id: string; output: string }[] };
const generated = JSON.parse(
  await readFile(
    path.join(root, "scripts/art/pixellab-generated.json"),
    "utf8",
  ),
) as {
  records: Record<
    string,
    { status: string; candidate?: string; outputSha256?: string }
  >;
};
const output = await mkdtemp(path.join(os.tmpdir(), "pulp-wars-v7-economy-"));
const width = 850;
const height = 490;
const overlays: OverlayOptions[] = [];
const notes: string[] = [];
for (const [row, id] of ids.entries()) {
  const recipe = source.recipes.find((entry) => entry.id === id);
  const record = generated.records[id];
  if (
    recipe === undefined ||
    record === undefined ||
    !["CANDIDATE", "ACCEPTED"].includes(record.status)
  )
    throw new Error(`Reviewable asset missing: ${id}`);
  const assetPath = path.join(
    root,
    record.status === "ACCEPTED" ? recipe.output : (record.candidate ?? ""),
  );
  const input = await readFile(assetPath);
  const metadata = await sharp(input).metadata();
  if (
    metadata.width !== 96 ||
    metadata.height !== 96 ||
    metadata.hasAlpha !== true
  )
    throw new Error(`${id} must be a transparent 96x96 PNG`);
  const sha256 = createHash("sha256").update(input).digest("hex");
  notes.push(
    `${id}: ${record.status}, ${sha256}, ${path.relative(root, assetPath)}`,
  );
  const native = await sharp(input)
    .resize(24, 24, { kernel: "lanczos3" })
    .png()
    .toBuffer();
  const enlarged = await sharp(native)
    .resize(192, 192, { kernel: "nearest" })
    .png()
    .toBuffer();
  const sourceLarge = await sharp(input)
    .resize(192, 192, { kernel: "nearest" })
    .png()
    .toBuffer();
  const top = 42 + row * 224;
  for (const [column, background] of ["#20232e", "#fff8df"].entries()) {
    const left = 12 + column * 130;
    overlays.push({ input: svgRect(115, 204, background), left, top });
    overlays.push({ input: native, left: left + 45, top: top + 28 });
    overlays.push({
      input: svgText(115, `${column === 0 ? "dark" : "light"} · 24px`),
      left,
      top: top + 153,
    });
  }
  overlays.push({ input: enlarged, left: 306, top: top + 6 });
  overlays.push({ input: sourceLarge, left: 550, top: top + 6 });
  overlays.push({
    input: svgText(192, "24px enlarged 8×"),
    left: 306,
    top: top + 182,
  });
  overlays.push({
    input: svgText(192, "96px source 2×"),
    left: 550,
    top: top + 182,
  });
}
const sheet = path.join(output, "economy-icons.png");
await sharp({ create: { width, height, channels: 4, background: "#808080" } })
  .composite(overlays)
  .png()
  .toFile(sheet);
await writeFile(path.join(output, "review.txt"), `${notes.join("\n")}\n`);
console.log(sheet);

function svgRect(width: number, height: number, fill: string): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}"><rect width="100%" height="100%" fill="${fill}"/></svg>`,
  );
}
function svgText(width: number, label: string): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="22"><text x="2" y="17" fill="#171722" font-family="sans-serif" font-size="13">${label}</text></svg>`,
  );
}
