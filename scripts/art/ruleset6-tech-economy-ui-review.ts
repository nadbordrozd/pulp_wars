import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";

const root = process.cwd();
const reviewRoot = path.join(
  root,
  "art/pixellab/reviews/ruleset6-tech-economy-ui",
);
const source = JSON.parse(
  await readFile(path.join(root, "scripts/art/pixellab-manifest.json"), "utf8"),
) as SourceManifest;
const generated = JSON.parse(
  await readFile(
    path.join(root, "scripts/art/pixellab-generated.json"),
    "utf8",
  ),
) as GeneratedManifest;
const roadManifest = JSON.parse(
  await readFile(
    path.join(root, "scripts/art/road-masks.generated.json"),
    "utf8",
  ),
) as {
  readonly records: readonly {
    readonly id: string;
    readonly output: string;
    readonly accepted: boolean;
  }[];
};
const aliases = new Map(source.aliases.map((alias) => [alias.id, alias]));
const recipes = new Map(source.recipes.map((recipe) => [recipe.id, recipe]));

const newIds = [
  "ui-hud-coin",
  "ui-action-redevelop",
  "ui-tech-fieldcraft",
  "ui-hud-population",
  "ui-hud-negative-population",
  "ui-hud-capacity",
  "ui-action-clear-forest",
  "ui-action-replant-forest",
  "ui-reward-expand",
  "ui-action-heal",
  "ui-action-recover",
  "ui-action-wait",
  "ui-action-promote",
  "ui-action-end-turn",
  "ui-tech-maneuver",
  "ui-tech-fortification",
  "ui-tech-recovery",
] as const;
const hudIds = [
  "ui-hud-coin",
  "ui-hud-income",
  "ui-hud-population",
  "ui-hud-negative-population",
  "ui-hud-capacity",
  "ui-hud-road",
] as const;
const actionIds = [
  "ui-action-redevelop",
  "ui-action-clear-forest",
  "ui-action-replant-forest",
  "ui-action-heal",
  "ui-action-recover",
  "ui-action-wait",
  "ui-action-promote",
  "ui-action-end-turn",
  "ui-reward-expand",
] as const;
const techIds = [
  "gathering",
  "farming",
  "milling",
  "craft",
  "grand-works",
  "hunting",
  "forestry",
  "sawmilling",
  "marksmanship",
  "fieldcraft",
  "surveying",
  "mining",
  "metallurgy",
  "quarrying",
  "masonry",
  "scouting",
  "roads",
  "commerce",
  "raiding",
  "maneuver",
  "drill",
  "fortification",
  "explosives",
  "medicine",
  "recovery",
] as const;
const technologyViewport = { width: 112, height: 130 } as const;

await mkdir(reviewRoot, { recursive: true });
assertAccepted();
await sampleGateSheet();
await hudMatrix();
await actionMatrix();
await technologyTree("original");
await technologyTree("candy");
await technologyAccessibility();
await responsiveMatrix();
await responsiveDpr2Native();
await writeEvidence();

interface SourceManifest {
  readonly aliases: readonly {
    readonly id: string;
    readonly source: string;
    readonly semanticRole: string;
    readonly notes: string;
  }[];
  readonly recipes: readonly {
    readonly id: string;
    readonly output: string;
    readonly outputSize: { readonly width: number; readonly height: number };
    readonly prompt: string;
    readonly negativePrompt: string;
    readonly seed: number;
    readonly stage: string;
  }[];
}

interface GeneratedManifest {
  readonly records: Readonly<
    Record<
      string,
      {
        readonly status: string;
        readonly outputSha256?: string;
        readonly width?: number;
        readonly height?: number;
        readonly alphaBounds?: unknown;
        readonly reviewChecks?: Readonly<Record<string, boolean>>;
        readonly rejectedAttempts?: readonly {
          readonly candidate: string;
          readonly candidateSha256?: string;
          readonly notes?: string;
        }[];
      }
    >
  >;
}

function assertAccepted(): void {
  for (const id of newIds) {
    const record = generated.records[id];
    if (record?.status !== "ACCEPTED")
      throw new Error(`Accepted Ruleset 6 UI asset missing: ${id}`);
    if (Object.values(record.reviewChecks ?? {}).some((value) => !value))
      throw new Error(`Incomplete review flags: ${id}`);
  }
  for (const faction of ["original", "candy"] as const)
    for (const tech of techIds) outputFor(`ui-tech-${faction}-${tech}`);
}

async function sampleGateSheet(): Promise<void> {
  const ids = [
    ["ui-hud-coin", 24],
    ["ui-action-redevelop", 48],
    ["ui-tech-fieldcraft", 64],
  ] as const;
  const overlays: OverlayOptions[] = [
    {
      input: title("Serial sample gate · enlarged / native / minimum", 1080),
      left: 0,
      top: 8,
    },
  ];
  for (const [index, [id, minimum]] of ids.entries()) {
    const x = index * 360;
    overlays.push({ input: label(id, 360), left: x, top: 56 });
    overlays.push({
      input: await resized(id, 244, true),
      left: x + 12,
      top: 94,
    });
    overlays.push({
      input: await panelIcon(id, minimum, "#f8f2df", 84),
      left: x + 260,
      top: 110,
    });
    overlays.push({
      input: await panelIcon(id, minimum, "#171722", 84),
      left: x + 260,
      top: 194,
    });
    overlays.push({ input: caption(hashLabel(id), 360), left: x, top: 350 });
  }
  await canvas(1080, 400, overlays, "sample-gate-native-enlarged-minimum.png");
}

async function hudMatrix(): Promise<void> {
  const sizes = [16, 24, 32] as const;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "HUD · 16/24/32 · light / dark / high contrast / grayscale",
        960,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, id] of hudIds.entries()) {
    overlays.push({ input: caption(id, 210), left: 0, top: 58 + row * 88 });
    let column = 0;
    for (const size of sizes) {
      for (const mode of ["light", "dark", "contrast", "gray"] as const) {
        overlays.push({
          input: await stateCell(id, size, mode, "normal", 58),
          left: 214 + column * 60,
          top: 54 + row * 88,
        });
        column += 1;
      }
    }
  }
  await canvas(960, 594, overlays, "hud-size-contrast-grayscale.png");
}

async function actionMatrix(): Promise<void> {
  const states = ["normal", "disabled", "focus", "selected", "locked"] as const;
  const overlays: OverlayOptions[] = [
    {
      input: title("Action and reward symbols · 32/48 · semantic states", 1120),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, id] of actionIds.entries()) {
    overlays.push({ input: caption(id, 230), left: 0, top: 58 + row * 82 });
    for (const [column, state] of states.entries()) {
      overlays.push({
        input: await stateCell(
          id,
          column === 1 ? 32 : 48,
          column % 2 === 0 ? "dark" : "light",
          state,
          78,
        ),
        left: 236 + column * 82,
        top: 54 + row * 82,
      });
      overlays.push({
        input: await stateCell(id, 48, "gray", state, 78),
        left: 650 + column * 82,
        top: 54 + row * 82,
      });
    }
  }
  await canvas(1120, 806, overlays, "action-reward-states-grayscale.png");
}

async function technologyTree(faction: "original" | "candy"): Promise<void> {
  const overlays: OverlayOptions[] = [
    {
      input: title(
        `${faction.toUpperCase()} explicit 25-node tree · one-city 5/7/9 cost fixture`,
        1400,
      ),
      left: 0,
      top: 8,
    },
  ];
  const branches = ["settlement", "wilds", "industry", "mobility", "warfare"];
  for (const [column, branch] of branches.entries()) {
    const branchTechs = techIds.slice(column * 5, column * 5 + 5);
    const branchLeft = 5 + column * 278;
    overlays.push({ input: caption(branch, 272), left: branchLeft, top: 50 });
    overlays.push({
      input: technologyBranchConnectors(),
      left: branchLeft,
      top: 72,
    });
    for (const [index, tech] of branchTechs.entries()) {
      const id = `ui-tech-${faction}-${tech}`;
      const position = [
        { left: 71, top: 0 },
        { left: 3, top: 196 },
        { left: 3, top: 392 },
        { left: 139, top: 196 },
        { left: 139, top: 392 },
      ][index];
      if (position === undefined) throw new Error("Unexpected branch size");
      const state =
        index === 0
          ? column === 0
            ? "researched"
            : "available"
          : "unavailable";
      const tier = index === 0 ? 1 : index === 1 || index === 3 ? 2 : 3;
      overlays.push({
        input: await techCard(
          id,
          tech,
          state,
          state === "researched" ? null : 3 + tier * 2,
        ),
        left: branchLeft + position.left,
        top: 72 + position.top,
      });
    }
  }
  await canvas(1400, 660, overlays, `technology-tree-${faction}.png`);
}

async function technologyAccessibility(): Promise<void> {
  const representative = [
    "ui-tech-original-farming",
    "ui-tech-original-fieldcraft",
    "ui-tech-original-metallurgy",
    "ui-tech-candy-scouting",
    "ui-tech-candy-fortification",
  ] as const;
  const overlays: OverlayOptions[] = [
    {
      input: title(
        "Five branches · color-vision and grayscale simulation",
        1050,
      ),
      left: 0,
      top: 8,
    },
  ];
  for (const [row, id] of representative.entries()) {
    overlays.push({ input: caption(id, 280), left: 0, top: 62 + row * 112 });
    for (const [column, mode] of [
      "normal",
      "gray",
      "protan",
      "deutan",
    ].entries())
      overlays.push({
        input: await visionCell(id, mode as VisionMode, 96),
        left: 288 + column * 184,
        top: 54 + row * 112,
      });
  }
  await canvas(1050, 630, overlays, "five-branch-color-vision.png");
}

async function responsiveMatrix(): Promise<void> {
  const configs = [
    { width: 320, dpr: 1, zoom: 2, label: "320px · 200% · DPR1" },
    { width: 600, dpr: 2, zoom: 1, label: "600px · DPR2" },
    { width: 1024, dpr: 1, zoom: 1, label: "1024px · DPR1" },
  ] as const;
  const overlays: OverlayOptions[] = [
    {
      input: title("Responsive technology/action compositions", 1152),
      left: 0,
      top: 8,
    },
  ];
  let top = 58;
  for (const config of configs) {
    const height = responsivePanelHeight(config.width);
    overlays.push({
      input: await responsivePanel(
        config.width,
        config.dpr,
        config.zoom,
        config.label,
      ),
      left: Math.round((1152 - config.width) / 2),
      top,
    });
    top += height + 12;
  }
  await canvas(1152, top, overlays, "responsive-320-600-1024-dpr-zoom.png");
}

async function responsiveDpr2Native(): Promise<void> {
  const cssWidth = 600;
  const cssHeight = responsivePanelHeight(cssWidth);
  const panel = await responsivePanel(
    cssWidth,
    1,
    1,
    "600px CSS viewport · native DPR2 backing store",
  );
  await sharp(panel)
    .resize(cssWidth * 2, cssHeight * 2, { kernel: sharp.kernel.nearest })
    .png()
    .toFile(path.join(reviewRoot, "responsive-600-dpr2-native.png"));
}

async function responsivePanel(
  width: number,
  dpr: number,
  zoom: number,
  panelLabel: string,
): Promise<Buffer> {
  const height = responsivePanelHeight(width);
  const cardWidth = width < 500 ? width - 24 : Math.floor((width - 36) / 2);
  const overlays: OverlayOptions[] = [
    { input: label(panelLabel, width), left: 0, top: 10 },
  ];
  const ids = [
    "ui-tech-original-gathering",
    "ui-tech-original-fieldcraft",
    "ui-tech-candy-marksmanship",
    "ui-action-clear-forest",
    "ui-action-replant-forest",
    "ui-hud-negative-population",
  ];
  for (const [index, id] of ids.entries()) {
    const x = 12 + (width < 500 ? 0 : (index % 2) * (cardWidth + 12));
    const y = 54 + (width < 500 ? index : Math.floor(index / 2)) * 92;
    overlays.push({
      input: await responsiveCard(id, cardWidth, zoom),
      left: x,
      top: y,
    });
  }
  const image = await sharp({
    create: { width, height, channels: 4, background: "#101e1d" },
  })
    .composite(overlays)
    .png()
    .toBuffer();
  return dpr === 1
    ? image
    : sharp(image)
        .resize(width * dpr, height * dpr, { kernel: sharp.kernel.nearest })
        .resize(width, height, { kernel: sharp.kernel.nearest })
        .png()
        .toBuffer();
}

function responsivePanelHeight(width: number): number {
  return width < 500 ? 650 : 340;
}

async function responsiveCard(
  id: string,
  width: number,
  zoom: number,
): Promise<Buffer> {
  const size = Math.min(64, Math.round(48 * zoom));
  const icon = await resized(id, size);
  return sharp({
    create: { width, height: 78, channels: 4, background: "#222430" },
  })
    .composite([
      { input: icon, left: 8, top: Math.round((78 - size) / 2) },
      {
        input: svgText(
          id.replace("ui-", ""),
          Math.max(1, width - size - 20),
          50,
          12,
          "#f8f2df",
        ),
        left: size + 14,
        top: 14,
      },
    ])
    .png()
    .toBuffer();
}

type VisionMode = "normal" | "gray" | "protan" | "deutan";

async function visionCell(
  id: string,
  mode: VisionMode,
  size: number,
): Promise<Buffer> {
  let image = sharp(outputFor(id)).resize(size, size, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (mode === "gray") image = image.grayscale();
  if (mode === "protan")
    image = image.recomb([
      [0.567, 0.433, 0],
      [0.558, 0.442, 0],
      [0, 0.242, 0.758],
    ]);
  if (mode === "deutan")
    image = image.recomb([
      [0.625, 0.375, 0],
      [0.7, 0.3, 0],
      [0, 0.3, 0.7],
    ]);
  const icon = await image.png().toBuffer();
  return sharp({
    create: { width: 176, height: 104, channels: 4, background: "#171722" },
  })
    .composite([
      { input: icon, left: 40, top: 4 },
      { input: svgText(mode, 176, 18, 11, "#f8f2df"), left: 0, top: 84 },
    ])
    .png()
    .toBuffer();
}

async function techCard(
  id: string,
  name: string,
  state: string,
  cost: number | null,
): Promise<Buffer> {
  const colors: Record<string, string> = {
    researched: "#266846",
    available: "#705615",
    unavailable: "#252832",
  };
  const icon = await resizedViewport(
    id,
    technologyViewport.width,
    technologyViewport.height,
  );
  const stroke =
    state === "researched"
      ? "#b5ffd0"
      : state === "available"
        ? "#ffe891"
        : "#d4dcdb";
  const border = Buffer.from(
    `<svg width="130" height="178" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="124" height="172" rx="10" fill="none" stroke="${stroke}" stroke-width="${state === "researched" ? 5 : 3}" ${state === "unavailable" ? 'stroke-dasharray="7 5"' : ""}/>${state === "researched" ? '<rect x="8" y="8" width="114" height="162" rx="7" fill="none" stroke="#b5ffd0" stroke-width="2"/>' : ""}</svg>`,
  );
  return sharp({
    create: {
      width: 130,
      height: 178,
      channels: 4,
      background: colors[state] ?? "#343641",
    },
  })
    .composite([
      { input: icon, left: 9, top: 5 },
      { input: svgText(name, 122, 18, 9, "#f8f2df"), left: 4, top: 139 },
      ...(cost === null
        ? []
        : [
            {
              input: svgText(`${cost} Coins`, 122, 16, 9, "#ffe891"),
              left: 4,
              top: 156,
            },
          ]),
      { input: border, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

function technologyBranchConnectors(): Buffer {
  return Buffer.from(
    '<svg width="272" height="570" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#d4dcdb" stroke-width="2"><path d="M136 178 V187 H68 M136 187 H204 M68 187 V196 M204 187 V196 M68 374 V392 M204 374 V392"/></g></svg>',
  );
}

async function stateCell(
  id: string,
  size: number,
  mode: "light" | "dark" | "contrast" | "gray",
  state: "normal" | "disabled" | "focus" | "selected" | "locked",
  extent: number,
): Promise<Buffer> {
  const bg =
    mode === "light"
      ? "#f8f2df"
      : mode === "contrast"
        ? "#000000"
        : mode === "gray"
          ? "#d0d0d0"
          : "#171722";
  let pipeline = sharp(outputFor(id)).resize(size, size, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (mode === "gray") pipeline = pipeline.grayscale();
  if (state === "disabled" || state === "locked")
    pipeline = pipeline.modulate({ brightness: 0.58, saturation: 0.3 });
  const icon = await pipeline.png().toBuffer();
  const stroke =
    state === "focus"
      ? "#75f7ff"
      : state === "selected"
        ? "#ffd85e"
        : state === "locked"
          ? "#8b8b92"
          : "#536566";
  const border = Buffer.from(
    `<svg width="${extent}" height="${extent}" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="${extent - 4}" height="${extent - 4}" rx="8" fill="none" stroke="${stroke}" stroke-width="${state === "focus" ? 4 : 2}" ${state === "locked" ? 'stroke-dasharray="4 3"' : ""}/></svg>`,
  );
  return sharp({
    create: { width: extent, height: extent, channels: 4, background: bg },
  })
    .composite([
      {
        input: icon,
        left: Math.round((extent - size) / 2),
        top: Math.round((extent - size) / 2),
        ...(state === "disabled" ? { blend: "over" as const } : {}),
      },
      { input: border, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

async function panelIcon(
  id: string,
  size: number,
  background: string,
  extent: number,
): Promise<Buffer> {
  const icon = await resized(id, size);
  return sharp({
    create: { width: extent, height: extent, channels: 4, background },
  })
    .composite([
      {
        input: icon,
        left: Math.round((extent - size) / 2),
        top: Math.round((extent - size) / 2),
      },
    ])
    .png()
    .toBuffer();
}

async function resized(
  id: string,
  size: number,
  nearest = false,
): Promise<Buffer> {
  return sharp(outputFor(id))
    .resize(size, size, {
      fit: "contain",
      kernel: nearest ? sharp.kernel.nearest : sharp.kernel.lanczos3,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function resizedViewport(
  id: string,
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp(outputFor(id))
    .resize(width, height, {
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

function outputFor(id: string): string {
  if (
    id === "ui-hud-road" ||
    id === "ui-tech-original-roads" ||
    id === "ui-tech-candy-roads"
  ) {
    const road = roadManifest.records.find(
      (record) => record.id === "terrain-road-mask-0101" && record.accepted,
    );
    if (road === undefined)
      throw new Error("Accepted straight Road mask missing");
    return path.join(root, road.output);
  }
  const sourceId = aliases.get(id)?.source ?? id;
  const recipe = recipes.get(sourceId);
  if (recipe === undefined) throw new Error(`Review mapping missing: ${id}`);
  if (generated.records[sourceId]?.status !== "ACCEPTED")
    throw new Error(`Review source is not accepted: ${sourceId}`);
  return path.join(root, recipe.output);
}

function hashLabel(id: string): string {
  const sourceId = aliases.get(id)?.source ?? id;
  return `${generated.records[sourceId]?.outputSha256?.slice(0, 12) ?? "missing"} · ${generated.records[sourceId]?.width}x${generated.records[sourceId]?.height}`;
}

async function writeEvidence(): Promise<void> {
  const artifacts = [
    "sample-gate-native-enlarged-minimum.png",
    "hud-size-contrast-grayscale.png",
    "action-reward-states-grayscale.png",
    "technology-tree-original.png",
    "technology-tree-candy.png",
    "five-branch-color-vision.png",
    "responsive-320-600-1024-dpr-zoom.png",
    "responsive-600-dpr2-native.png",
  ];
  const artifactHashes: Record<string, string> = {};
  for (const file of artifacts) {
    const bytes = await readFile(path.join(reviewRoot, file));
    artifactHashes[file] = createHash("sha256").update(bytes).digest("hex");
  }
  const evidence = {
    schemaVersion: 1,
    gateOrder: {
      samples: ["ui-hud-coin", "ui-action-redevelop", "ui-tech-fieldcraft"],
      representativeBranches: [
        "ui-tech-original-farming",
        "ui-tech-original-fieldcraft",
        "ui-tech-original-metallurgy",
        "ui-tech-candy-scouting",
        "ui-tech-candy-drill",
      ],
      batches: [
        ["ui-hud-population", "ui-hud-negative-population", "ui-hud-capacity"],
        [
          "ui-action-clear-forest",
          "ui-action-replant-forest",
          "ui-reward-expand",
        ],
        ["ui-action-heal", "ui-action-recover", "ui-action-wait"],
        ["ui-action-promote", "ui-action-end-turn"],
        ["ui-tech-maneuver", "ui-tech-fortification", "ui-tech-recovery"],
      ],
    },
    inventory: {
      explicitTechnologyKeys: 50,
      reusedTechnologyKeys: 42,
      generatedAbstractTechnologyKeys: 8,
      generatedAbstractTechnologySources: 4,
      newRasterSources: newIds.length,
      hudMappings: hudIds,
    },
    generated: Object.fromEntries(
      newIds.map((id) => {
        const record = generated.records[id];
        return [
          id,
          {
            sha256: record?.outputSha256,
            width: record?.width,
            height: record?.height,
            alphaBounds: record?.alphaBounds,
            rejectedAttempts: record?.rejectedAttempts ?? [],
          },
        ];
      }),
    ),
    review: {
      sizes: [16, 24, 32, 48, 64, "112x130 technology viewport"],
      surfaces: ["light", "dark", "high-contrast"],
      simulations: ["grayscale", "protan", "deutan"],
      states: ["normal", "disabled", "focus", "selected", "locked"],
      technologyCardStates: ["researched", "available", "unavailable"],
      technologyCardVisibleContent:
        "112x130px icon viewport, name, and Coin cost only while unresearched",
      technologyLayout:
        "prerequisite-derived root fork with two tier-2 and aligned tier-3 continuations",
      viewports: [320, 600, 1024],
      zoom: [1, 2],
      dpr: [1, 2],
      factions: ["ORIGINAL_BASELINE", "CANDY_BASELINE_V1"],
      clearReplantShapeRedundancy: "axe-and-stump versus sapling-and-trowel",
      codeNative: [
        "Move and Attack map targeting",
        "cluster and contributor geometry",
        "Road connectivity",
        "signed calculations and population squares",
        "focus, selected, disabled and locked states",
        "Charge, projectile, Heal, Push and Breach effects",
      ],
    },
    artifacts: artifactHashes,
  };
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(reviewRoot, "README.md"),
    `# Ruleset 6 technology, economy, and action UI review\n\nGenerated deterministically by \`npm run art:ruleset6-tech-economy-ui-review\`. The sheets cover the serial three-sample gate, 16/24/32/48/64px use plus the exact 112 x 130 technology viewport, light/dark/high-contrast, grayscale and color-vision simulations, semantic states, 320/600/1024px layouts, 200% zoom, DPR 1/2, and both explicit 25-node faction trees.\n\nClear Forest and Replant Forest remain shape-distinct (axe/stump versus sapling/trowel). Move/Attack targeting and dynamic states remain code-native; every visible contextual action and reward resolves through the explicit runtime inventory.\n`,
    "utf8",
  );
}

async function canvas(
  width: number,
  height: number,
  overlays: OverlayOptions[],
  file: string,
): Promise<void> {
  await sharp({ create: { width, height, channels: 4, background: "#203332" } })
    .composite(overlays)
    .png()
    .toFile(path.join(reviewRoot, file));
}

function title(value: string, width: number): Buffer {
  return svgText(value, width, 44, 22, "#f8f2df", 800);
}

function label(value: string, width: number): Buffer {
  return svgText(value, width, 32, 14, "#f8f2df", 700);
}

function caption(value: string, width: number): Buffer {
  return svgText(value, width, 28, 11, "#cfe0d8", 600);
}

function svgText(
  value: string,
  width: number,
  height: number,
  size: number,
  fill: string,
  weight = 700,
): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="${width / 2}" y="${Math.round(height * 0.68)}" text-anchor="middle" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${escapeXml(value)}</text></svg>`,
  );
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
