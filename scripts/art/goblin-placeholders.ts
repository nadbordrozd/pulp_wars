/**
 * Goblin placeholder sprites (bead pulp_wars-0ao.4). Usage:
 *
 *   npm run art:goblin-placeholders              (write PNGs, masks, records)
 *   npm run art:goblin-placeholders -- check     (re-render and compare)
 *   npm run art:goblin-placeholders -- sheet     (review contact sheets)
 *
 * No PixelLab call: the sprites are drawn by
 * scripts/art/chibi/goblin-placeholders.ts. Bead pulp_wars-0ao.8 replaces
 * them with reviewed PixelLab art. See docs/art/factions/GOBLIN.md.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import {
  RULESET7_PLAYER_COLORS,
  parseHexColourV7,
  recolourOwnerPixelsV7,
} from "../../src/render/canvas/owner-recolour-v7";
import {
  GOBLIN_PLACEHOLDER_BEAD,
  GOBLIN_PLACEHOLDER_PALETTE,
  GOBLIN_PLACEHOLDER_RECORDS,
  GOBLIN_PLACEHOLDER_REPLACED_BY,
  GOBLIN_PLACEHOLDER_REVIEW_DIR,
  extractedMaskMatches,
  offPalettePixels,
  placeholderPaths,
  renderGoblinPlaceholdersV7,
  type GoblinPlaceholderRenderV7,
} from "./chibi/goblin-placeholders";
import { maskToRgba, type RgbaRaster } from "./chibi/owner-mask";
import {
  encodeMask,
  encodePng,
  pixelSha256,
  readRaster,
  sha256,
} from "./chibi/pipeline";

const ROOT = process.cwd();
const command = process.argv[2] ?? "generate";

interface PlaceholderRecord {
  readonly id: string;
  readonly subject: string;
  readonly role: string;
  readonly name: string;
  readonly assetClass: string;
  readonly width: number;
  readonly height: number;
  readonly anchor: "default" | { readonly x: number; readonly y: number };
  readonly cue: string;
  readonly status: "PLACEHOLDER";
  readonly replacedBy: string;
  readonly master: {
    readonly path: string;
    readonly sha256: string;
    readonly pixelSha256: string;
  };
  readonly mask: {
    readonly path: string;
    readonly sha256: string;
    readonly pixelSha256: string;
  };
  readonly maskQa: {
    readonly status: "PASS" | "FAIL";
    readonly opaquePixels: number;
    readonly ownerPixels: number;
    readonly coverage: number;
    readonly coverageOnTarget: boolean;
  };
}

function problemsOf(render: GoblinPlaceholderRenderV7): string[] {
  const problems: string[] = [];
  const label = render.spec.id;
  if (render.qa.status !== "PASS")
    problems.push(
      `${label}: mask QA ${render.qa.failures.map((issue) => issue.code).join(", ")}`,
    );
  if (!render.qa.coverageOnTarget)
    problems.push(
      `${label}: owner coverage ${render.qa.coverage} is off 20-40%`,
    );
  const off = offPalettePixels(render.master);
  if (off > 0) problems.push(`${label}: ${off} off-palette pixels`);
  if (!extractedMaskMatches(render))
    problems.push(`${label}: pipeline extraction differs from the key mask`);
  return problems;
}

async function records(
  renders: readonly GoblinPlaceholderRenderV7[],
): Promise<{ file: string; assets: PlaceholderRecord[] }> {
  const assets: PlaceholderRecord[] = [];
  for (const render of renders) {
    const paths = placeholderPaths(render.spec.id);
    const maskRaster = {
      width: render.mask.width,
      height: render.mask.height,
      data: maskToRgba(render.mask),
    };
    assets.push({
      id: render.spec.id,
      subject: `UNIT:GOBLIN:${render.spec.role}`,
      role: render.spec.role,
      name: render.spec.name,
      assetClass: render.spec.assetClass,
      width: render.spec.width,
      height: render.spec.height,
      anchor: render.spec.anchor ?? "default",
      cue: render.spec.cue,
      status: "PLACEHOLDER",
      replacedBy: GOBLIN_PLACEHOLDER_REPLACED_BY,
      master: {
        path: paths.master,
        sha256: sha256(await encodePng(render.master)),
        pixelSha256: pixelSha256(render.master),
      },
      mask: {
        path: paths.mask,
        sha256: sha256(await encodeMask(render.mask)),
        pixelSha256: pixelSha256(maskRaster),
      },
      maskQa: {
        status: render.qa.status,
        opaquePixels: render.qa.opaquePixels,
        ownerPixels: render.qa.ownerPixels,
        coverage: render.qa.coverage,
        coverageOnTarget: render.qa.coverageOnTarget,
      },
    });
  }
  const file = `${JSON.stringify(
    {
      kind: "PROGRAMMATIC_PLACEHOLDER",
      bead: GOBLIN_PLACEHOLDER_BEAD,
      replacedBy: GOBLIN_PLACEHOLDER_REPLACED_BY,
      generator: "scripts/art/chibi/goblin-placeholders.ts",
      command: "npm run art:goblin-placeholders",
      pixelLab: false,
      palette: GOBLIN_PLACEHOLDER_PALETTE,
      assets,
    },
    null,
    2,
  )}\n`;
  return { file, assets };
}

async function generate(): Promise<void> {
  const renders = renderGoblinPlaceholdersV7();
  const problems = renders.flatMap(problemsOf);
  if (problems.length > 0) throw new Error(problems.join("\n"));
  for (const render of renders) {
    const paths = placeholderPaths(render.spec.id);
    await mkdir(path.dirname(path.join(ROOT, paths.master)), {
      recursive: true,
    });
    await writeFile(
      path.join(ROOT, paths.master),
      await encodePng(render.master),
    );
    await writeFile(path.join(ROOT, paths.mask), await encodeMask(render.mask));
    console.log(
      `${render.spec.id}: ${render.spec.width} x ${render.spec.height}, owner ${(render.qa.coverage * 100).toFixed(1)}%`,
    );
  }
  const { file } = await records(renders);
  await mkdir(path.dirname(path.join(ROOT, GOBLIN_PLACEHOLDER_RECORDS)), {
    recursive: true,
  });
  await writeFile(path.join(ROOT, GOBLIN_PLACEHOLDER_RECORDS), file);
  console.log(`Records written to ${GOBLIN_PLACEHOLDER_RECORDS}`);
}

async function check(): Promise<void> {
  const renders = renderGoblinPlaceholdersV7();
  const problems = renders.flatMap(problemsOf);
  const { assets } = await records(renders);
  const stored = JSON.parse(
    await readFile(path.join(ROOT, GOBLIN_PLACEHOLDER_RECORDS), "utf8"),
  ) as { readonly assets: readonly PlaceholderRecord[] };
  for (const record of assets) {
    const kept = stored.assets.find((entry) => entry.id === record.id);
    if (kept === undefined) {
      problems.push(`${record.id}: no stored record`);
      continue;
    }
    for (const kind of ["master", "mask"] as const) {
      const file = await readRaster(path.join(ROOT, record[kind].path));
      if (pixelSha256(file) !== record[kind].pixelSha256)
        problems.push(
          `${record.id}: checked-in ${kind} differs from the generator`,
        );
      if (kept[kind].pixelSha256 !== record[kind].pixelSha256)
        problems.push(`${record.id}: stored ${kind} record is stale`);
    }
  }
  if (problems.length > 0) throw new Error(problems.join("\n"));
  console.log(`${assets.length} Goblin placeholders match their generator.`);
}

// ------------------------------------------------------------------ sheets

const TILE = 80;
const CELL_W = 96;
const CELL_H = 104;
const LABEL_H = 22;

type Canvas = { width: number; height: number; data: Uint8Array };

function blank(width: number, height: number, rgb: readonly number[]): Canvas {
  const data = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    data[index * 4] = rgb[0] ?? 0;
    data[index * 4 + 1] = rgb[1] ?? 0;
    data[index * 4 + 2] = rgb[2] ?? 0;
    data[index * 4 + 3] = 255;
  }
  return { width, height, data };
}

/** Alpha-over blit with an integer nearest-neighbour scale. */
function blit(
  target: Canvas,
  source: RgbaRaster,
  left: number,
  top: number,
  scale: number,
): void {
  for (let y = 0; y < source.height * scale; y += 1)
    for (let x = 0; x < source.width * scale; x += 1) {
      const tx = left + x;
      const ty = top + y;
      if (tx < 0 || ty < 0 || tx >= target.width || ty >= target.height)
        continue;
      const s =
        (Math.floor(y / scale) * source.width + Math.floor(x / scale)) * 4;
      const alpha = (source.data[s + 3] ?? 0) / 255;
      if (alpha === 0) continue;
      const t = (ty * target.width + tx) * 4;
      for (let channel = 0; channel < 3; channel += 1)
        target.data[t + channel] = Math.round(
          (source.data[s + channel] ?? 0) * alpha +
            (target.data[t + channel] ?? 0) * (1 - alpha),
        );
    }
}

function recoloured(
  raster: RgbaRaster,
  mask: RgbaRaster,
  colour: string,
): RgbaRaster {
  const owner = parseHexColourV7(colour);
  if (owner === null) throw new Error(colour);
  return {
    width: raster.width,
    height: raster.height,
    data: recolourOwnerPixelsV7({
      pixels: new Uint8ClampedArray(raster.data),
      width: raster.width,
      height: raster.height,
      mask: new Uint8ClampedArray(mask.data),
      maskWidth: mask.width,
      maskHeight: mask.height,
      owner,
    }),
  };
}

/** One board cell: the grass tile with the piece on its class anchor. */
function cell(
  grass: RgbaRaster,
  piece: RgbaRaster | null,
  scale: number,
  anchor?: { readonly x: number; readonly y: number },
): Canvas {
  const out = blank(CELL_W * scale, CELL_H * scale, [52, 58, 66]);
  const tileLeft = ((CELL_W - TILE) / 2) * scale;
  const tileTop = (CELL_H - TILE) * scale;
  blit(out, grass, tileLeft, tileTop, scale);
  if (piece !== null) {
    // The anchor (default: bottom-centred, width / 2, height - 40) on the
    // tile centre, as the board draws it.
    const at = anchor ?? { x: piece.width / 2, y: piece.height - TILE / 2 };
    const left = tileLeft + (TILE / 2 - at.x) * scale;
    const top = tileTop + (TILE / 2 - at.y) * scale;
    blit(out, piece, left, top, scale);
  }
  return out;
}

function label(text: string, width: number): Buffer {
  const safe = text.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${LABEL_H}"><text x="4" y="16" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="700" fill="#f4f1e8">${safe}</text></svg>`,
  );
}

async function sheet(): Promise<void> {
  const renders = renderGoblinPlaceholdersV7();
  const grass = await readRaster(
    path.join(ROOT, "public/assets/chibi/terrain/chibi-grass-1.png"),
  );
  const humanIds: Readonly<Record<string, string>> = {
    FIGHTER: "chibi-fighter",
    RAIDER: "chibi-raider",
    MARKSMAN: "chibi-marksman",
    GUARD: "chibi-guard",
    CAPTAIN: "chibi-captain",
    CATAPULT: "chibi-catapult",
    KNIGHT: "chibi-knight",
    JUGGERNAUT: "chibi-juggernaut",
  };
  const owners = Object.entries(RULESET7_PLAYER_COLORS);
  const nativeColumns = 2 + owners.length; // Human, key, four owners
  const enlargedColumns = owners.length + 1; // four owners and the mask
  const scale = 4;
  const nativeWidth = nativeColumns * (CELL_W + 8);
  const width = nativeWidth + enlargedColumns * (CELL_W * scale + 8) + 8;
  const rowHeight = LABEL_H + CELL_H * scale + 12;
  const full = blank(width, LABEL_H + renders.length * rowHeight, [30, 33, 40]);
  const native = blank(
    nativeWidth + 8,
    LABEL_H + renders.length * (LABEL_H + CELL_H + 12),
    [30, 33, 40],
  );
  const labels: { input: Buffer; left: number; top: number }[] = [];
  const nativeLabels: { input: Buffer; left: number; top: number }[] = [];
  const header = `Goblin placeholders (${GOBLIN_PLACEHOLDER_BEAD}): Human role at 1x | key and Coral, Teal, Gold, Violet at 1x | the four owners and the mask at 4x`;
  labels.push({ input: label(header, width), left: 4, top: 0 });
  nativeLabels.push({
    input: label(
      "Human | key | Coral | Teal | Gold | Violet (1x)",
      nativeWidth,
    ),
    left: 4,
    top: 0,
  });
  for (const [row, render] of renders.entries()) {
    const maskRaster = {
      width: render.mask.width,
      height: render.mask.height,
      data: maskToRgba(render.mask),
    };
    const human = await readRaster(
      path.join(
        ROOT,
        `public/assets/chibi/units/${humanIds[render.spec.role] ?? ""}.png`,
      ),
    );
    const humanMask = await readRaster(
      path.join(
        ROOT,
        `public/assets/chibi/units/${humanIds[render.spec.role] ?? ""}.mask.png`,
      ),
    );
    const top = LABEL_H + row * rowHeight;
    const nativeTop = LABEL_H + row * (LABEL_H + CELL_H + 12);
    const title = `${render.spec.name} (${render.spec.role}, ${render.spec.width} x ${render.spec.height}, owner ${(render.qa.coverage * 100).toFixed(1)}%): ${render.spec.cue}`;
    labels.push({ input: label(title, width), left: 4, top });
    nativeLabels.push({
      input: label(`${render.spec.name} (${render.spec.role})`, nativeWidth),
      left: 4,
      top: nativeTop,
    });
    const nativeCells: RgbaRaster[] = [
      recoloured(human, humanMask, RULESET7_PLAYER_COLORS.CORAL),
      render.master,
      ...owners.map(([, colour]) =>
        recoloured(render.master, maskRaster, colour),
      ),
    ];
    for (const [column, piece] of nativeCells.entries()) {
      const image = cell(
        grass,
        piece,
        1,
        column === 0 ? undefined : render.spec.anchor,
      );
      blit(full, image, 8 + column * (CELL_W + 8), top + LABEL_H, 1);
      blit(native, image, 8 + column * (CELL_W + 8), nativeTop + LABEL_H, 1);
    }
    const enlarged: RgbaRaster[] = [
      ...owners.map(([, colour]) =>
        recoloured(render.master, maskRaster, colour),
      ),
      maskRaster,
    ];
    for (const [column, piece] of enlarged.entries())
      blit(
        full,
        cell(grass, piece, scale, render.spec.anchor),
        nativeWidth + 8 + column * (CELL_W * scale + 8),
        top + LABEL_H,
        1,
      );
  }
  const directory = path.join(ROOT, GOBLIN_PLACEHOLDER_REVIEW_DIR);
  await mkdir(directory, { recursive: true });
  for (const [name, canvas, overlay] of [
    ["contact-sheet.png", full, labels],
    ["contact-sheet-native.png", native, nativeLabels],
  ] as const)
    await sharp(Buffer.from(canvas.data), {
      raw: { width: canvas.width, height: canvas.height, channels: 4 },
    })
      .composite(overlay)
      .png({ compressionLevel: 9 })
      .toFile(path.join(directory, name));
  console.log(`Contact sheets written to ${GOBLIN_PLACEHOLDER_REVIEW_DIR}`);
}

if (command === "generate") await generate();
else if (command === "check") await check();
else if (command === "sheet") await sheet();
else throw new Error(`Unknown command ${command}: generate, check or sheet`);
