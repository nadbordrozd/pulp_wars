import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  cityCoverageV6,
  improvementCoverageV6,
  resourceCoverageV6,
  terrainCoverageV6,
  unitCoverageV6,
  type AssetCoverageV6,
} from "../../src/render/canvas/asset-coverage-v6";
import {
  SELECTION_IDENTITY_ARTWORK_VIEWPORT_V6,
  selectionIdentityArtworkFrameV6,
  selectionIdentityArtworkLayoutV6,
} from "../../src/render/dom/selection-identity-v6";

const root = process.cwd();
const outputRoot = path.join(
  root,
  "art/pixellab/reviews/ruleset6-selection-identities",
);
const samples = [
  {
    id: "game-original",
    label: "Game · Original",
    artwork: resourceCoverageV6("GAME", "ORIGINAL"),
  },
  {
    id: "game-candy",
    label: "Game · Candy",
    artwork: resourceCoverageV6("GAME", "CANDY"),
  },
  {
    id: "fertile-ground",
    label: "Fertile Ground",
    artwork: resourceCoverageV6("FERTILE_GROUND", "ORIGINAL"),
  },
  {
    id: "fighter",
    label: "Fighter",
    artwork: unitCoverageV6("ORIGINAL", "FIGHTER"),
  },
  {
    id: "city",
    label: "Original City · L2",
    artwork: cityCoverageV6("ORIGINAL", 2),
  },
  {
    id: "mountain",
    label: "Mountain",
    artwork: terrainCoverageV6("MOUNTAIN", "ORIGINAL", 0),
  },
  {
    id: "farm",
    label: "Farm",
    artwork: improvementCoverageV6("FARM"),
  },
] as const;

const generated = JSON.parse(
  await readFile(
    path.join(root, "scripts/art/pixellab-generated.json"),
    "utf8",
  ),
) as {
  readonly records: Readonly<
    Record<
      string,
      {
        readonly alphaBounds?: {
          readonly left: number;
          readonly top: number;
          readonly right: number;
          readonly bottom: number;
        };
      }
    >
  >;
};

await mkdir(outputRoot, { recursive: true });
const layouts = await Promise.all(
  samples.map(async (sample) => {
    if (sample.artwork.status !== "ACCEPTED") {
      throw new Error(`${sample.id}: accepted artwork required`);
    }
    const frame = selectionIdentityArtworkFrameV6(sample.artwork);
    if (frame === null) throw new Error(`${sample.id}: frame missing`);
    if (frame.mode === "VISIBLE_ALPHA") {
      const recorded = generated.records[sample.artwork.assetId]?.alphaBounds;
      if (recorded === undefined) {
        throw new Error(`${sample.id}: generated alpha bounds missing`);
      }
      if (
        frame.visibleBounds === null ||
        recorded.left !== frame.visibleBounds.left ||
        recorded.top !== frame.visibleBounds.top ||
        recorded.right !== frame.visibleBounds.right ||
        recorded.bottom !== frame.visibleBounds.bottom
      ) {
        throw new Error(`${sample.id}: framing metadata is stale`);
      }
    }
    const layout = selectionIdentityArtworkLayoutV6(frame);
    const bytes = await readFile(
      path.join(root, "public", sample.artwork.publicPath),
    );
    return {
      ...sample,
      frame,
      layout,
      bytes,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  }),
);

const viewports = [
  {
    id: "desktop",
    css: { width: 1280, height: 240 },
    dpr: 1,
    columns: 7,
    cardWidth: 172,
    cardHeight: 184,
    gap: 8,
  },
  {
    id: "mobile",
    css: { width: 390, height: 830 },
    dpr: 2,
    columns: 2,
    cardWidth: 180,
    cardHeight: 184,
    gap: 10,
  },
] as const;

const artifacts: Array<{
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly width: number;
  readonly height: number;
}> = [];
for (const viewport of viewports) {
  const svg = screenshotSvg(
    viewport.css.width,
    viewport.css.height,
    viewport.columns,
    viewport.cardWidth,
    viewport.cardHeight,
    viewport.gap,
  );
  const nativeName = `${viewport.id}-native.png`;
  const enlargedName = `${viewport.id}-enlarged.png`;
  const nativePath = path.join(outputRoot, nativeName);
  await sharp(Buffer.from(svg))
    .resize(
      viewport.css.width * viewport.dpr,
      viewport.css.height * viewport.dpr,
    )
    .png()
    .toFile(nativePath);
  await sharp(nativePath)
    .resize(
      viewport.css.width * viewport.dpr * 2,
      viewport.css.height * viewport.dpr * 2,
      { kernel: "nearest" },
    )
    .png()
    .toFile(path.join(outputRoot, enlargedName));
  for (const [name, width, height] of [
    [
      nativeName,
      viewport.css.width * viewport.dpr,
      viewport.css.height * viewport.dpr,
    ],
    [
      enlargedName,
      viewport.css.width * viewport.dpr * 2,
      viewport.css.height * viewport.dpr * 2,
    ],
  ] as const) {
    const bytes = await readFile(path.join(outputRoot, name));
    artifacts.push({
      path: path
        .relative(root, path.join(outputRoot, name))
        .replaceAll("\\", "/"),
      bytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      width,
      height,
    });
  }
}

await writeFile(
  path.join(outputRoot, "review-evidence.json"),
  `${JSON.stringify(
    {
      generatedBy: "npm run art:ruleset6-selection-identity-review",
      status: "READY_FOR_ORCHESTRATOR_REVIEW",
      viewport: SELECTION_IDENTITY_ARTWORK_VIEWPORT_V6,
      method:
        "Production selection framing calculator with exact accepted raster bytes; desktop DPR1 and mobile DPR2 layouts plus nearest-neighbor 2x inspection copies.",
      samples: layouts.map((sample) => ({
        id: sample.id,
        label: sample.label,
        frame: sample.frame,
        layout: sample.layout,
        sha256: sample.sha256,
        assetId: acceptedAssetId(sample.artwork),
        publicPath: acceptedPublicPath(sample.artwork),
        visibleWithinViewport:
          sample.layout.visible === null ||
          (sample.layout.visible.left >= 0 &&
            sample.layout.visible.top >= 0 &&
            sample.layout.visible.right <=
              SELECTION_IDENTITY_ARTWORK_VIEWPORT_V6.width &&
            sample.layout.visible.bottom <=
              SELECTION_IDENTITY_ARTWORK_VIEWPORT_V6.height),
      })),
      unchangedPresentationSamples: ["fighter", "city", "mountain", "farm"],
      artifacts,
    },
    null,
    2,
  )}\n`,
);
await writeFile(
  path.join(outputRoot, "README.md"),
  "# Ruleset-6 selection identity review\n\nGenerated deterministically with `npm run art:ruleset6-selection-identity-review`. The desktop DPR1 and true mobile-width DPR2 sheets exercise the production 112 × 130 selection framing calculation with exact accepted rasters. Game and Fertile Ground use visible-alpha containment; representative Fighter, city, Mountain, and Farm identities retain source-canvas containment. Each native output has a nearest-neighbor 2× inspection copy. No production raster is generated or changed.\n",
);

function screenshotSvg(
  width: number,
  height: number,
  columns: number,
  cardWidth: number,
  cardHeight: number,
  gap: number,
): string {
  const startX = (width - (columns * cardWidth + (columns - 1) * gap)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#182e2b"/>
    <text x="${width / 2}" y="24" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="#fff4dc">SELECTION IDENTITY · 112 × 130 CSS PX</text>
    ${layouts
      .map((sample, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = startX + column * (cardWidth + gap);
        const y = 38 + row * (cardHeight + gap);
        const viewportX = x + (cardWidth - 112) / 2;
        const viewportY = y + 6;
        const clipId = `clip-${sample.id}`;
        return `<g>
          <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="10" fill="#222430" stroke="#6d7977"/>
          <clipPath id="${clipId}"><rect x="${viewportX}" y="${viewportY}" width="112" height="130" rx="9"/></clipPath>
          <rect x="${viewportX}" y="${viewportY}" width="112" height="130" rx="9" fill="#081213" stroke="#ffffff" stroke-opacity=".3"/>
          <image href="data:image/png;base64,${sample.bytes.toString("base64")}" x="${viewportX + sample.layout.image.left}" y="${viewportY + sample.layout.image.top}" width="${sample.layout.image.width}" height="${sample.layout.image.height}" preserveAspectRatio="none" clip-path="url(#${clipId})"/>
          <text x="${x + cardWidth / 2}" y="${y + 153}" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#fff4dc">${escapeXml(sample.label)}</text>
          <text x="${x + cardWidth / 2}" y="${y + 170}" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#bcc8c5">${sample.frame.mode === "VISIBLE_ALPHA" ? "VISIBLE ALPHA" : "SOURCE CANVAS"}</text>
        </g>`;
      })
      .join("\n")}
  </svg>`;
}

function acceptedAssetId(artwork: AssetCoverageV6): string {
  if (artwork.status !== "ACCEPTED") throw new Error("Accepted art required");
  return artwork.assetId;
}

function acceptedPublicPath(artwork: AssetCoverageV6): string {
  if (artwork.status !== "ACCEPTED") throw new Error("Accepted art required");
  return artwork.publicPath;
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
}
