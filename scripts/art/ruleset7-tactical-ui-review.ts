import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { format } from "prettier";
import sharp, { type OverlayOptions } from "sharp";
import {
  RULESET7_TACTICAL_UI_THEME_TREATMENTS,
  RULESET7_TACTICAL_UI_SYMBOLS,
  type Ruleset7TacticalUiSymbol,
  type TacticalSymbolPrimitive,
  type TacticalSymbolTheme,
  type TacticalSymbolTone,
} from "../../src/assets/ruleset7-tactical-ui-symbols";
import { RULESET7_TACTICAL_UI_ACTION_IDS } from "./ruleset7-tactical-ui-order";

const root = process.cwd();
const reviewRoot = path.join(root, "art/pixellab/reviews/ruleset7-tactical-ui");
const comparisonIds = [
  "ui-action-wait",
  "ui-action-pillage",
  "ui-action-disband",
] as const;
const artifactNames = [
  "raster-source-native-enlarged.png",
  "raster-context-accessibility.png",
  "raster-viewport-buttons-dpr.png",
  "code-native-symbol-inventory.png",
  "code-native-state-context.png",
] as const;

interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface Recipe {
  readonly id: string;
  readonly output: string;
  readonly seed: number;
  readonly requestSize: { readonly width: number; readonly height: number };
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly hardBounds: Bounds;
  readonly postprocess?: string;
  readonly styleReference?: string;
}

interface RecordEntry {
  readonly status: string;
  readonly jobId?: string;
  readonly candidate?: string;
  readonly candidateSha256?: string;
  readonly providerOutputSha256?: string;
  readonly outputSha256?: string;
  readonly alphaBounds?: Bounds;
  readonly rejectedAttempts?: readonly unknown[];
}

const source = JSON.parse(
  await readFile(path.join(root, "scripts/art/pixellab-manifest.json"), "utf8"),
) as { readonly recipes: readonly Recipe[] };
const generated = JSON.parse(
  await readFile(
    path.join(root, "scripts/art/pixellab-generated.json"),
    "utf8",
  ),
) as { readonly records: Readonly<Record<string, RecordEntry>> };
const recipes = new Map(source.recipes.map((recipe) => [recipe.id, recipe]));
const availableActions = RULESET7_TACTICAL_UI_ACTION_IDS.filter(available);

if (availableActions.length === 0)
  throw new Error("No Ruleset 7 tactical UI candidates are available");
await mkdir(reviewRoot, { recursive: true });
await sourceNativeSheet();
await accessibilitySheet();
await viewportButtonSheet();
await symbolInventorySheet();
await symbolStateSheet();
if (
  RULESET7_TACTICAL_UI_ACTION_IDS.every(
    (id) => generated.records[id]?.status === "ACCEPTED",
  )
)
  await writeEvidence();
else
  console.log(
    `Candidate review evidence ready at ${path.relative(root, reviewRoot)}; both accepted records are required for final evidence.`,
  );

function available(id: string): boolean {
  const status = generated.records[id]?.status;
  return status === "CANDIDATE" || status === "ACCEPTED";
}

function fileFor(id: string): string {
  const recipe = recipes.get(id);
  const record = generated.records[id];
  if (recipe === undefined || record === undefined)
    throw new Error(`Missing recipe or record: ${id}`);
  return path.join(
    root,
    record.status === "ACCEPTED"
      ? recipe.output
      : required(record.candidate, `${id} candidate`),
  );
}

async function sourceNativeSheet(): Promise<void> {
  const width = 1500;
  const rowHeight = 440;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "RULESET 7 TACTICAL ACTIONS · SOURCE 128 · ACTUAL 32 CSS · ENLARGED",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, id] of availableActions.entries()) {
    const top = 76 + row * rowHeight;
    const record = generated.records[id];
    overlays.push({ input: label(id, 410), left: 16, top });
    overlays.push({ input: checker(164, 164), left: 16, top: top + 42 });
    overlays.push({ input: await fitAction(id, 128), left: 34, top: top + 60 });
    overlays.push({ input: checker(80, 80), left: 215, top: top + 84 });
    overlays.push({
      input: await fitAction(id, 32),
      left: 239,
      top: top + 108,
    });
    overlays.push({ input: checker(388, 388), left: 330, top: top + 42 });
    overlays.push({
      input: await fitAction(id, 352),
      left: 348,
      top: top + 60,
    });
    overlays.push({
      input: caption(
        `PixelLab ${recipes.get(id)?.requestSize.width} source → deterministic Lanczos3 128 output · seed ${recipes.get(id)?.seed} · alpha ${bounds(record?.alphaBounds)} · hard bounds 10..118`,
        720,
      ),
      left: 754,
      top: top + 115,
    });
  }
  await render(
    width,
    100 + availableActions.length * rowHeight,
    overlays,
    artifactNames[0],
  );
}

async function accessibilitySheet(): Promise<void> {
  const modes = [
    ["LIGHT", "#eef4e8", "normal"],
    ["DARK", "#213d43", "normal"],
    ["HIGH CONTRAST", "#000000", "high"],
    ["GRAYSCALE", "#d9d9d2", "grayscale"],
    ["PROTANOPIA", "#e7e1d4", "protanopia"],
    ["DEUTERANOPIA", "#e7e1d4", "deuteranopia"],
    ["TRITANOPIA", "#e7e1d4", "tritanopia"],
    ["BUSY MAP", "busy", "normal"],
  ] as const;
  const width = 1560;
  const cellWidth = 188;
  const rowHeight = 210;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "ACTUAL-SIZE ACCESSIBILITY · IDENTITY USES SHAPE, NOT HUE",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [column, [mode]] of modes.entries())
    overlays.push({
      input: tinyLabel(mode, 174),
      left: 8 + column * cellWidth,
      top: 64,
    });
  for (const [row, id] of availableActions.entries()) {
    overlays.push({
      input: label(id, 260),
      left: 8,
      top: 96 + row * rowHeight,
    });
    for (const [column, [, background, transform]] of modes.entries())
      overlays.push({
        input: await accessibilityCell(id, background, transform),
        left: 8 + column * cellWidth,
        top: 132 + row * rowHeight,
      });
  }
  const comparisonTop = 132 + availableActions.length * rowHeight;
  overlays.push({
    input: label("DISTINCT FROM ACCEPTED WAIT / PILLAGE / DISBAND", 700),
    left: 8,
    top: comparisonTop,
  });
  for (const [index, id] of comparisonIds.entries()) {
    overlays.push({
      input: await accessibilityCell(id, "#eef4e8", "grayscale"),
      left: 20 + index * 188,
      top: comparisonTop + 42,
    });
    overlays.push({
      input: tinyLabel(id, 174),
      left: 8 + index * 188,
      top: comparisonTop + 150,
    });
  }
  await render(width, comparisonTop + 195, overlays, artifactNames[1]);
}

async function viewportButtonSheet(): Promise<void> {
  const width = 1540;
  const rowHeight = 650;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "EXACT 112×130 ORIGINAL-PADDING CONTAIN · 176px BUTTON · DPR1/2 · 200%",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, id] of availableActions.entries()) {
    const top = 76 + row * rowHeight;
    overlays.push({ input: label(id, 320), left: 12, top });
    const contexts = [
      ["LIGHT / REST", "#eef4e8", "rest", 1],
      ["DARK / FOCUS", "#213d43", "focus", 1],
      ["HC / SELECTED", "#000000", "selected", 1],
      ["BUSY MAP / DISABLED", "busy", "disabled", 1],
      ["DPR2 → CSS", "#eef4e8", "rest", 2],
      ["200%", "#213d43", "focus", 2],
    ] as const;
    for (const [
      column,
      [name, background, state, scale],
    ] of contexts.entries()) {
      const left = column < 5 ? 8 + column * 220 : 1100;
      overlays.push({
        input: tinyLabel(name, 230),
        left,
        top: top + 42,
      });
      overlays.push({
        input: await actionButton(
          id,
          background,
          state,
          scale,
          name === "DPR2 → CSS",
        ),
        left,
        top: top + 72,
      });
    }
  }
  await render(
    width,
    100 + availableActions.length * rowHeight,
    overlays,
    artifactNames[2],
  );
}

async function symbolInventorySheet(): Promise<void> {
  const columns = 3;
  const cellWidth = 510;
  const cellHeight = 158;
  const rows = Math.ceil(RULESET7_TACTICAL_UI_SYMBOLS.length / columns);
  const width = columns * cellWidth;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "STATIC CODE-NATIVE SYMBOL MANIFEST · 24×24 SHAPES + SEMANTIC LABELS",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [index, symbol] of RULESET7_TACTICAL_UI_SYMBOLS.entries()) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    overlays.push({
      input: await symbolCard(symbol),
      left: column * cellWidth + 8,
      top: row * cellHeight + 70,
    });
  }
  await render(width, 90 + rows * cellHeight, overlays, artifactNames[3]);
}

async function symbolStateSheet(): Promise<void> {
  const representatives = [
    "ui-status-concealed",
    "ui-status-detected",
    "ui-status-exposed",
    "ui-status-spoils",
    "ui-status-blackout-cooldown",
    "ui-status-blackout-pending",
    "ui-status-blackout-active",
    "ui-status-blackout-recovery",
    "ui-status-achievement-progress",
    "ui-status-achievement-source-current-owner",
  ] as const;
  const width = 1540;
  const cellWidth = 138;
  const overlays: OverlayOptions[] = [
    {
      input: heading(
        "REPRESENTATIVE STATIC STATES · LIGHT/DARK/HC/BUSY · FOCUS/DISABLED/SELECTED",
        width,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [index, id] of representatives.entries()) {
    const symbol = RULESET7_TACTICAL_UI_SYMBOLS.find(
      (entry) => entry.id === id,
    );
    if (symbol === undefined) throw new Error(`Missing representative ${id}`);
    overlays.push({
      input: tinyLabel(shortId(id), 126),
      left: 6 + index * cellWidth,
      top: 66,
    });
    for (const [row, [background, state]] of (
      [
        ["#eef4e8", "rest"],
        ["#213d43", "focus"],
        ["#000000", "selected"],
        ["busy", "disabled"],
      ] as const
    ).entries())
      overlays.push({
        input: await symbolContext(symbol, background, state),
        left: 6 + index * cellWidth,
        top: 98 + row * 112,
      });
  }
  overlays.push({
    input: caption(
      "All registry entries declare reducedMotion=STATIC; representative rendering schedules no motion and carries no hidden-state derivation.",
      width - 24,
    ),
    left: 12,
    top: 558,
  });
  await render(width, 700, overlays, artifactNames[4]);
}

async function fitAction(id: string, size: number): Promise<Buffer> {
  return sharp(await readFile(fileFor(id)))
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();
}

async function accessibilityCell(
  id: string,
  background: string,
  transform: string,
): Promise<Buffer> {
  let icon = sharp(await fitAction(id, 32));
  if (transform === "grayscale") icon = icon.grayscale();
  if (transform === "protanopia")
    icon = icon.recomb([
      [0.567, 0.433, 0],
      [0.558, 0.442, 0],
      [0, 0.242, 0.758],
    ]);
  if (transform === "deuteranopia")
    icon = icon.recomb([
      [0.625, 0.375, 0],
      [0.7, 0.3, 0],
      [0, 0.3, 0.7],
    ]);
  if (transform === "tritanopia")
    icon = icon.recomb([
      [0.95, 0.05, 0],
      [0, 0.433, 0.567],
      [0, 0.475, 0.525],
    ]);
  if (transform === "high")
    icon = icon.modulate({ brightness: 1.2, saturation: 0 });
  const rendered = await icon.png().toBuffer();
  const base =
    background === "busy"
      ? await busyBackdrop(176, 104)
      : await sharp({
          create: { width: 176, height: 104, channels: 4, background },
        })
          .png()
          .toBuffer();
  return sharp(base)
    .composite([
      ...(background === "#000000"
        ? [
            {
              input: Buffer.from(
                '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><rect x="1" y="1" width="42" height="42" rx="4" fill="#000" stroke="#fff" stroke-width="2"/></svg>',
              ),
              left: 66,
              top: 30,
            },
          ]
        : []),
      { input: rendered, left: 72, top: 36 },
    ])
    .png()
    .toBuffer();
}

async function actionButton(
  id: string,
  background: string,
  state: string,
  scale: number,
  cssNormalizeDpr: boolean,
): Promise<Buffer> {
  const backingWidth = 176 * scale;
  const backingHeight = 282 * scale;
  const border =
    state === "focus"
      ? "#f5c84b"
      : state === "selected"
        ? "#ffffff"
        : "#17333a";
  const originalAsset = await sharp(await readFile(fileFor(id)))
    .resize(112 * scale, 130 * scale, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();
  const asset =
    state === "disabled"
      ? await multiplyAlpha(originalAsset, 0.46)
      : originalAsset;
  const textColor =
    background === "#213d43" || background === "#000000"
      ? "#f8f2df"
      : "#17333a";
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${backingWidth}" height="${backingHeight}"><rect x="${3 * scale}" y="${3 * scale}" width="${170 * scale}" height="${276 * scale}" rx="${12 * scale}" fill="${background === "busy" ? "#eef4e8cc" : background}" stroke="${border}" stroke-width="${state === "focus" ? 5 * scale : 3 * scale}"/><rect x="${16 * scale}" y="${18 * scale}" width="${144 * scale}" height="${164 * scale}" rx="${8 * scale}" fill="${state === "selected" ? "#37565a" : "#00000018"}"/><text x="${88 * scale}" y="${224 * scale}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${20 * scale}" font-weight="700" fill="${textColor}">${id.endsWith("defection") ? "Defection" : "Blackout"}</text><text x="${88 * scale}" y="${250 * scale}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${12 * scale}" fill="${textColor}">${state.toUpperCase()}</text></svg>`,
  );
  const base =
    background === "busy"
      ? await busyBackdrop(backingWidth, backingHeight)
      : svg;
  const full = await sharp(base)
    .composite([
      ...(background === "busy" ? [{ input: svg, left: 0, top: 0 }] : []),
      { input: asset, left: 32 * scale, top: 34 * scale },
    ])
    .png()
    .toBuffer();
  if (!cssNormalizeDpr) return full;
  return sharp(full)
    .resize(176, 282, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
}

async function symbolCard(symbol: Ruleset7TacticalUiSymbol): Promise<Buffer> {
  const light = primitivesSvg(symbol.primitives, "LIGHT");
  const dark = primitivesSvg(symbol.primitives, "DARK");
  const highContrast = primitivesSvg(symbol.primitives, "HIGH_CONTRAST");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="494" height="146"><rect width="494" height="146" rx="10" fill="#eef4e8" stroke="#17333a" stroke-width="2"/><rect x="6" y="8" width="30" height="30" fill="#eef4e8" stroke="#17333a"/><g transform="translate(9 11)">${light}</g><text x="21" y="51" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="#17333a">L24</text><rect x="42" y="8" width="30" height="30" fill="#213d43" stroke="#17333a"/><g transform="translate(45 11)">${dark}</g><text x="57" y="51" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="#17333a">D24</text><rect x="78" y="8" width="38" height="38" fill="#000" stroke="#17333a"/><g transform="translate(81 11) scale(1.333333)">${highContrast}</g><text x="97" y="59" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="#17333a">HC32</text><rect x="124" y="8" width="74" height="74" fill="#fff" stroke="#17333a"/><g transform="translate(129 13) scale(2.666667)">${light}</g><text x="161" y="95" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="#17333a">64 enlarged</text><text x="210" y="28" font-family="Arial,sans-serif" font-size="15" font-weight="700" fill="#17333a">${escapeXml(crop(symbol.id, 31))}</text><text x="210" y="54" font-family="Arial,sans-serif" font-size="12" fill="#17333a">${escapeXml(crop(symbol.semanticLabel, 39))}</text><text x="210" y="78" font-family="Arial,sans-serif" font-size="10" fill="#36545a">${escapeXml(symbol.semanticRole)} · ${escapeXml(symbol.visibility)}</text><text x="210" y="102" font-family="Arial,sans-serif" font-size="9" fill="#36545a">${escapeXml(crop(symbol.projectedSource, 49))}</text><text x="210" y="124" font-family="Arial,sans-serif" font-size="9" fill="#36545a">${symbol.primitives.length} primitives · STATIC · themed ≥3:1</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function symbolContext(
  symbol: Ruleset7TacticalUiSymbol,
  background: string,
  state: string,
): Promise<Buffer> {
  const border =
    state === "focus"
      ? "#f5c84b"
      : state === "selected"
        ? "#ffffff"
        : "#17333a";
  const opacity = state === "disabled" ? 0.48 : 1;
  const theme: TacticalSymbolTheme =
    background === "#000000"
      ? "HIGH_CONTRAST"
      : background === "#213d43"
        ? "DARK"
        : "LIGHT";
  const textColor =
    background === "#213d43" || background === "#000000"
      ? "#ffffff"
      : "#17333a";
  const shapes = primitivesSvg(symbol.primitives, theme);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="126" height="98"><rect x="3" y="3" width="120" height="92" rx="9" fill="${background === "busy" ? "#eef4e8cc" : background}" stroke="${border}" stroke-width="${state === "focus" ? 5 : 3}"/><g transform="translate(17 12)" opacity="${opacity}">${shapes}</g><g transform="translate(67 8) scale(1.333333)" opacity="${opacity}">${shapes}</g><text x="29" y="48" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" fill="${textColor}">24</text><text x="83" y="48" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" fill="${textColor}">32</text><text x="63" y="88" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" fill="${textColor}">${state.toUpperCase()}</text></svg>`;
  const base =
    background === "busy"
      ? await busyBackdrop(126, 98)
      : await sharp(Buffer.from(svg)).png().toBuffer();
  return sharp(base)
    .composite(
      background === "busy"
        ? [{ input: Buffer.from(svg), left: 0, top: 0 }]
        : [],
    )
    .png()
    .toBuffer();
}

async function multiplyAlpha(input: Buffer, amount: number): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let index = 3; index < data.length; index += 4)
    data[index] = Math.round((data[index] ?? 0) * amount);
  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function busyBackdrop(width: number, height: number): Promise<Buffer> {
  const tileSize = Math.min(128, width, height);
  const grass = await sharp(
    path.join(
      root,
      "public/assets/pixellab/terrain-square/original-grass-1.png",
    ),
  )
    .resize(tileSize, tileSize, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();
  const forestWidth = Math.min(112, width);
  const forestHeight = Math.min(112, height);
  const forest = await sharp(
    path.join(
      root,
      "public/assets/pixellab/terrain-square/original-forest-1.png",
    ),
  )
    .resize(forestWidth, forestHeight, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();
  const unitWidth = Math.min(64, width);
  const unitHeight = Math.min(74, height);
  const unit = await sharp(
    path.join(root, "public/assets/pixellab/units/warrior.png"),
  )
    .resize(unitWidth, unitHeight, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();
  return sharp({
    create: { width, height, channels: 4, background: "#6d815e" },
  })
    .composite([
      { input: grass, tile: true },
      { input: forest, left: 0, top: 0 },
      {
        input: unit,
        left: Math.max(0, width - unitWidth),
        top: Math.max(0, height - unitHeight),
      },
    ])
    .png()
    .toBuffer();
}

function primitivesSvg(
  primitives: readonly TacticalSymbolPrimitive[],
  theme: TacticalSymbolTheme,
): string {
  return primitives
    .map((primitive) => {
      if (primitive.kind === "line")
        return `<line x1="${primitive.x1}" y1="${primitive.y1}" x2="${primitive.x2}" y2="${primitive.y2}" stroke="${RULESET7_TACTICAL_UI_THEME_TREATMENTS[theme].lineTonePolicy === "BOUNDARY_TONE" ? RULESET7_TACTICAL_UI_THEME_TREATMENTS[theme].boundary : tone(primitive.tone, theme)}" stroke-width="${primitive.width}" stroke-linecap="round" stroke-linejoin="round"/>`;
      if (primitive.kind === "circle")
        return `<circle cx="${primitive.cx}" cy="${primitive.cy}" r="${primitive.radius}" fill="${tone(primitive.fill, theme)}" stroke="${tone(primitive.stroke, theme)}" stroke-width="1.8"/>`;
      if (primitive.kind === "rect")
        return `<rect x="${primitive.x}" y="${primitive.y}" width="${primitive.width}" height="${primitive.height}" rx="${primitive.radius}" fill="${tone(primitive.fill, theme)}" stroke="${tone(primitive.stroke, theme)}" stroke-width="1.8"/>`;
      return `<polygon points="${primitive.points.map(([x, y]) => `${x},${y}`).join(" ")}" fill="${tone(primitive.fill, theme)}" stroke="${tone(primitive.stroke, theme)}" stroke-width="1.8" stroke-linejoin="round"/>`;
    })
    .join("");
}

function tone(value: TacticalSymbolTone, theme: TacticalSymbolTheme): string {
  return RULESET7_TACTICAL_UI_THEME_TREATMENTS[theme].tones[value];
}

async function writeEvidence(): Promise<void> {
  const artifacts = await Promise.all(
    artifactNames.map(async (filename) => {
      const bytes = await readFile(path.join(reviewRoot, filename));
      return {
        filename,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        bytes: bytes.byteLength,
      };
    }),
  );
  const assets = Object.fromEntries(
    RULESET7_TACTICAL_UI_ACTION_IDS.map((id) => {
      const recipe = recipes.get(id);
      const record = generated.records[id];
      return [
        id,
        {
          seed: recipe?.seed,
          jobId: record?.jobId,
          candidateSha256: record?.candidateSha256,
          providerOutputSha256: record?.providerOutputSha256,
          outputSha256: record?.outputSha256,
          alphaBounds: record?.alphaBounds,
          rejectedAttempts: record?.rejectedAttempts ?? [],
        },
      ];
    }),
  );
  const evidence = {
    schemaVersion: 1,
    status: "COMPLETE",
    generationOrder: RULESET7_TACTICAL_UI_ACTION_IDS,
    rasterInventory: RULESET7_TACTICAL_UI_ACTION_IDS,
    codeNativeInventory: RULESET7_TACTICAL_UI_SYMBOLS.map(({ id }) => id),
    reviewCoverage: [
      "every source 128 and enlarged plus actual 32 CSS identity",
      "exact 112x130 original transparent-padding contain and 176px buttons",
      "light/dark/high-contrast/grayscale/protanopia/deuteranopia/tritanopia and busy map",
      "DPR1/2 and 200% with rest/focus/selected/disabled states",
      "all code-native primitives at actual 24/32 CSS and enlarged, static and readable without color or motion",
      "Defection and Blackout distinct from accepted Wait/Pillage/Disband",
    ],
    projectionSafety:
      "Synthetic examples render static manifest metadata only. They do not derive concealed entities, hidden detectors, Defection counterpart links, or owner-only achievement provenance.",
    assets,
    artifacts,
  };
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    await format(JSON.stringify(evidence), { parser: "json" }),
  );
  const readme = `# Ruleset 7 tactical UI review\n\nGenerated by \`npm run art:ruleset7-tactical-ui-review\`. These bounded artifacts review the accepted Defection/Blackout raster pair and synthetic representative rendering of the reusable static code-native symbol manifest metadata. They are evidence only, not runtime integration.\n\nThe synthetic examples do not consume a PlayerView fixture and never infer concealed entities, hidden detectors, Defection counterpart links, or owner-only achievement provenance.\n`;
  await writeFile(
    path.join(reviewRoot, "README.md"),
    await format(readme, { parser: "markdown" }),
  );
  console.log(
    `Ruleset 7 tactical UI review complete at ${path.relative(root, reviewRoot)}`,
  );
}

async function render(
  width: number,
  height: number,
  overlays: readonly OverlayOptions[],
  filename: string,
): Promise<void> {
  await sharp({
    create: { width, height, channels: 4, background: "#d6d0bd" },
  })
    .composite([...overlays])
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(path.join(reviewRoot, filename));
}

function checker(width: number, height: number, fallback = "#d9d4c4"): Buffer {
  const cells = Array.from(
    { length: Math.ceil(width / 16) * Math.ceil(height / 16) },
    (_, index) => {
      const columns = Math.ceil(width / 16);
      const x = (index % columns) * 16;
      const y = Math.floor(index / columns) * 16;
      return `<rect x="${x}" y="${y}" width="16" height="16" fill="${(Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0 ? fallback : "#ffffff"}"/>`;
    },
  ).join("");
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${cells}<rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="#17333a" stroke-width="2"/></svg>`,
  );
}

function heading(value: string, width: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="52"><rect width="${width}" height="52" fill="#17333a"/><text x="18" y="34" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="#f8f2df">${escapeXml(value)}</text></svg>`,
  );
}

function label(value: string, width: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="34"><text x="2" y="25" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="#17333a">${escapeXml(value)}</text></svg>`,
  );
}

function tinyLabel(value: string, width = 180): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="26"><text x="2" y="18" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="#17333a">${escapeXml(value)}</text></svg>`,
  );
}

function caption(value: string, width: number): Buffer {
  const words = value.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (`${current} ${word}`.trim().length > 66) {
      lines.push(current);
      current = word;
    } else current = `${current} ${word}`.trim();
  }
  if (current.length > 0) lines.push(current);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="130"><text x="8" y="25" font-family="Arial,sans-serif" font-size="18" fill="#17333a">${lines.map((line, index) => `<tspan x="8" dy="${index === 0 ? 0 : 26}">${escapeXml(line)}</tspan>`).join("")}</text></svg>`,
  );
}

function bounds(value: Bounds | undefined): string {
  return value === undefined
    ? "unrecorded"
    : `${value.left},${value.top}..${value.right},${value.bottom}`;
}

function shortId(id: string): string {
  return id
    .replace(/^ui-(action|status)-/, "")
    .replaceAll("-", " ")
    .slice(0, 18);
}

function crop(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function required<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new Error(`Missing ${name}`);
  return value;
}
