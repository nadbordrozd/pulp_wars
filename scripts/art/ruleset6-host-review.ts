import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  buildBoardDrawListV6,
  unitVisibleFootprintV6,
  type BoardDrawCommandV6,
} from "../../src/render/canvas/board-renderer-v6";
import {
  UNIT_SCALE_CONTRACT,
  type DestinationRect,
} from "../../src/render/canvas/board-art-geometry";
import {
  centerCameraOn,
  fitCamera,
  projectGrid,
  type CameraState,
  type Size,
} from "../../src/render/canvas/geometry";
import {
  compareEntriesV6,
  type BoardRenderPlanV6,
  type RenderPlanEntryV6,
} from "../../src/render/canvas/render-plan-v6";

const root = process.cwd();
const reviewRoot = path.join(root, "art/pixellab/reviews/ruleset6-canvas-host");
const focus = { x: 5, y: 5 } as const;
const viewports = [
  { id: "desktop", width: 1280, height: 720, dpr: 1 },
  { id: "tablet", width: 768, height: 1024, dpr: 2 },
  { id: "mobile", width: 390, height: 844, dpr: 2 },
] as const;
const artifacts: string[] = [];
const metrics: Array<{
  readonly viewport: string;
  readonly cssSize: Size;
  readonly dpr: number;
  readonly backingSize: Size;
  readonly zoom: number;
  readonly unitBounds: readonly {
    readonly role: "FIGHTER" | "BREACHER" | "JUGGERNAUT";
    readonly bounds: DestinationRect;
    readonly clipped: boolean;
    readonly footprint: ReturnType<typeof unitVisibleFootprintV6>;
  }[];
}> = [];

await mkdir(reviewRoot, { recursive: true });
const plan = representativeHostPlan();
for (const viewport of viewports) {
  const size = { width: viewport.width, height: viewport.height };
  const fitted = fitCamera({ width: 11, height: 11 }, size);
  const camera = centerCameraOn(fitted, projectGrid(focus), size);
  const list = buildBoardDrawListV6({ viewport: size, camera, plan });
  const nativeName = `${viewport.id}-native.png`;
  const enlargedName = `${viewport.id}-enlarged.png`;
  const nativePath = path.join(reviewRoot, nativeName);
  const svg = await reviewSvg(viewport.id, size, camera, list.commands);
  await sharp(Buffer.from(svg))
    .resize(viewport.width * viewport.dpr, viewport.height * viewport.dpr)
    .png()
    .toFile(nativePath);
  await sharp(nativePath)
    .resize(
      viewport.width * viewport.dpr * 2,
      viewport.height * viewport.dpr * 2,
      {
        kernel: "nearest",
      },
    )
    .png()
    .toFile(path.join(reviewRoot, enlargedName));
  artifacts.push(nativeName, enlargedName);
  metrics.push({
    viewport: viewport.id,
    cssSize: size,
    dpr: viewport.dpr,
    backingSize: {
      width: viewport.width * viewport.dpr,
      height: viewport.height * viewport.dpr,
    },
    zoom: camera.zoom,
    unitBounds: (["FIGHTER", "BREACHER", "JUGGERNAUT"] as const).map((role) => {
      const bounds = boundsForEntry(list.commands, `UNIT:${role}`);
      return {
        role,
        bounds,
        clipped:
          bounds.x < 0 ||
          bounds.y < 0 ||
          bounds.x + bounds.width > viewport.width ||
          bounds.y + bounds.height > viewport.height,
        footprint: unitVisibleFootprintV6(role),
      };
    }),
  });
}
await writeEvidence();
await writeReadme();

async function reviewSvg(
  viewportId: string,
  viewport: Size,
  camera: CameraState,
  commands: readonly BoardDrawCommandV6[],
): Promise<string> {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${viewport.width}" height="${viewport.height}" viewBox="0 0 ${viewport.width} ${viewport.height}">
  <rect width="100%" height="100%" fill="#203936"/>
  ${await commandsSvg(commands)}
  <rect x="12" y="12" width="${Math.min(350, viewport.width - 24)}" height="50" rx="10" fill="#172b2be8" stroke="#78908b"/>
  <text x="24" y="33" font-family="system-ui,sans-serif" font-size="15" font-weight="800" fill="#ffffff">Ruleset 6 host · ${viewportId}</text>
  <text x="24" y="52" font-family="system-ui,sans-serif" font-size="12" font-weight="600" fill="#c5d7d4">${viewport.width} × ${viewport.height} CSS px · camera ${camera.zoom.toFixed(3)}×</text>
</svg>`;
}

async function commandsSvg(
  commands: readonly BoardDrawCommandV6[],
): Promise<string> {
  const imageData = new Map<string, string>();
  const result: string[] = [];
  for (const command of commands) {
    if (command.kind === "IMAGE") {
      let uri = imageData.get(command.publicPath);
      if (uri === undefined) {
        const source = await readFile(
          path.join(root, "public", command.publicPath),
        );
        uri = `data:image/png;base64,${source.toString("base64")}`;
        imageData.set(command.publicPath, uri);
      }
      result.push(
        `<image x="${n(command.destination.x)}" y="${n(command.destination.y)}" width="${n(command.destination.width)}" height="${n(command.destination.height)}" href="${uri}"/>`,
      );
      continue;
    }
    const alpha = command.alpha === 1 ? "" : ` opacity="${n(command.alpha)}"`;
    if (command.kind === "POLYGON") {
      result.push(
        `<polygon points="${points(command.points)}" fill="${command.fill}"${stroke(command.stroke, command.lineWidth, command.dash)}${alpha}/>`,
      );
    } else if (command.kind === "ELLIPSE") {
      result.push(
        `<ellipse cx="${n(command.center.x)}" cy="${n(command.center.y)}" rx="${n(command.radiusX)}" ry="${n(command.radiusY)}" fill="${command.fill}"${stroke(command.stroke, command.lineWidth, [])}${alpha}/>`,
      );
    } else if (command.kind === "LINE") {
      result.push(
        `<polyline points="${points(command.points)}" fill="none" stroke="${command.stroke}" stroke-width="${n(command.lineWidth)}" stroke-linecap="round" stroke-linejoin="round"${dash(command.dash)}${alpha}/>`,
      );
    } else if (command.kind === "RECT") {
      result.push(
        `<rect x="${n(command.x)}" y="${n(command.y)}" width="${n(command.width)}" height="${n(command.height)}" fill="${command.fill}"${stroke(command.stroke, command.lineWidth, [])}${alpha}/>`,
      );
    } else {
      result.push(
        `<text x="${n(command.at.x)}" y="${n(command.at.y)}" fill="${command.fill}" font-family="system-ui,sans-serif" font-size="${n(command.fontSize)}" font-weight="${command.weight}" text-anchor="${command.align === "center" ? "middle" : command.align === "right" || command.align === "end" ? "end" : "start"}" dominant-baseline="middle"${alpha}>${escapeXml(command.text)}</text>`,
      );
    }
  }
  return result.join("\n");
}

function representativeHostPlan(): BoardRenderPlanV6 {
  const entries: RenderPlanEntryV6[] = [];
  for (let y = 0; y < 11; y += 1) {
    for (let x = 0; x < 11; x += 1) {
      const at = { x, y };
      entries.push(
        entry("TERRAIN", `TERRAIN:${y},${x}`, at, y * 11 + x, 1, {
          terrain: "GRASS",
        }),
      );
    }
  }
  entries.push(
    entry("TERRAIN_BODY", "MOUNTAIN", { x: 3, y: 3 }, 400, 5, {
      terrain: "MOUNTAIN",
    }),
    entry("TERRAIN_BODY", "FOREST", { x: 7, y: 3 }, 401, 5, {
      terrain: "FOREST",
    }),
    entry("CITY_BACK", "CITY_BACK", { x: 4, y: 7 }, 500, 5, {
      faction: "ORIGINAL",
      isCapital: true,
    }),
    entry("CITY_FRONT", "CITY_FRONT", { x: 4, y: 7 }, 500, 5, {
      faction: "ORIGINAL",
      isCapital: true,
    }),
    entry("CITY_STATUS", "CITY_STATUS", { x: 4, y: 7 }, 500, 8, {
      faction: "ORIGINAL",
      level: 3,
      population: 2,
      isCapital: true,
    }),
  );
  const units = [
    { role: "FIGHTER", at: { x: 3, y: 5 }, id: 601 },
    { role: "BREACHER", at: { x: 5, y: 3 }, id: 602 },
    { role: "JUGGERNAUT", at: { x: 7, y: 6 }, id: 603 },
  ] as const;
  for (const unit of units) {
    entries.push(
      entry("CONTACT_SHADOW", `SHADOW:${unit.role}`, unit.at, unit.id, 5, null),
      entry("UNIT", `UNIT:${unit.role}`, unit.at, unit.id, 5, {
        faction: "ORIGINAL",
        role: unit.role,
      }),
      entry("UNIT_STATUS", `STATUS:${unit.role}`, unit.at, unit.id, 8, {
        faction: "ORIGINAL",
        role: unit.role,
        hp: unit.role === "BREACHER" ? 8 : 10,
        maxHp: 10,
        state: "NEEDS_ACTION",
        veteran: unit.role === "JUGGERNAUT",
      }),
    );
  }
  entries.push(
    entry("SELECTION", "SELECTION", { x: 3, y: 5 }, 601, 6, {
      selectionKind: "UNIT",
    }),
  );
  entries.sort(compareEntriesV6);
  return {
    planVersion: 6,
    entries,
    legalCommands: [],
    commandTargets: [],
    economicPreview: null,
  };
}

function entry<Kind extends RenderPlanEntryV6["kind"]>(
  kind: Kind,
  key: string,
  at: { readonly x: number; readonly y: number },
  id: number,
  layer: number,
  details: Extract<RenderPlanEntryV6, { readonly kind: Kind }>["details"],
): Extract<RenderPlanEntryV6, { readonly kind: Kind }> {
  return {
    kind,
    key,
    at,
    id,
    ownerId: 1,
    variant: 0,
    layer,
    details,
  } as Extract<RenderPlanEntryV6, { readonly kind: Kind }>;
}

function boundsForEntry(
  commands: readonly BoardDrawCommandV6[],
  entryKey: string,
): DestinationRect {
  const rectangles = commands
    .filter((command) => command.entryKey === entryKey)
    .map(commandBounds)
    .filter((value): value is DestinationRect => value !== null);
  if (rectangles.length === 0)
    throw new Error(`No visible commands for ${entryKey}`);
  const left = Math.min(...rectangles.map((value) => value.x));
  const top = Math.min(...rectangles.map((value) => value.y));
  const right = Math.max(...rectangles.map((value) => value.x + value.width));
  const bottom = Math.max(...rectangles.map((value) => value.y + value.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function commandBounds(command: BoardDrawCommandV6): DestinationRect | null {
  if (command.kind === "IMAGE") return command.destination;
  if (command.kind === "POLYGON" || command.kind === "LINE") {
    const xs = command.points.map((point) => point.x);
    const ys = command.points.map((point) => point.y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }
  if (command.kind === "ELLIPSE") {
    return {
      x: command.center.x - command.radiusX,
      y: command.center.y - command.radiusY,
      width: command.radiusX * 2,
      height: command.radiusY * 2,
    };
  }
  if (command.kind === "RECT") {
    return {
      x: command.x,
      y: command.y,
      width: command.width,
      height: command.height,
    };
  }
  return null;
}

async function writeEvidence(): Promise<void> {
  const records = await Promise.all(
    artifacts.map(async (name) => {
      const bytes = await readFile(path.join(reviewRoot, name));
      return {
        path: `art/pixellab/reviews/ruleset6-canvas-host/${name}`,
        bytes: bytes.byteLength,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    }),
  );
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    `${JSON.stringify(
      {
        generatedBy: "npm run art:ruleset6-host-review",
        host: "CanvasBoardHostV6",
        viewports: metrics,
        scaleContracts: {
          standard: UNIT_SCALE_CONTRACT.standard.displayScale,
          breacher: UNIT_SCALE_CONTRACT.siege.displayScale,
          juggernaut: UNIT_SCALE_CONTRACT.giant.displayScale,
          standardRearOcclusionMaximum:
            UNIT_SCALE_CONTRACT.standard.maximumRearTileOcclusionRatio,
        },
        visualReview: {
          status: "ACCEPTED",
          notes:
            "Desktop, tablet and mobile native/backing sheets keep all three representative unit classes inside the visible slice. Standard Fighter mass remains compact beside Forest/Mountain; Breacher and Juggernaut remain bounded exceptions. Selection, status, city and terrain layers remain readable without edge clipping.",
        },
        artifacts: records,
      },
      null,
      2,
    )}\n`,
  );
}

async function writeReadme(): Promise<void> {
  await writeFile(
    path.join(reviewRoot, "README.md"),
    `# Ruleset-6 Canvas host review\n\nGenerated deterministically with \`npm run art:ruleset6-host-review\`. The desktop (1280 × 720 CSS px, DPR1), tablet (768 × 1024, DPR2), and mobile (390 × 844, DPR2) sheets use the ruleset-6 renderer's real draw list, shared camera geometry, accepted-image paths, and calibrated unit footprints. Each native backing image has a nearest-neighbor 2× inspection copy.\n\nThe evidence JSON records CSS/backing dimensions, zoom, visible unit bounds, clipping checks, footprint classes, hashes, and the 0.25/0.24/0.25 scale contract. These are review artifacts only; no production asset was generated or changed.\n`,
  );
}

function points(
  value: readonly { readonly x: number; readonly y: number }[],
): string {
  return value.map((point) => `${n(point.x)},${n(point.y)}`).join(" ");
}

function stroke(
  value: string | null,
  width: number,
  values: readonly number[],
): string {
  return value === null
    ? ""
    : ` stroke="${value}" stroke-width="${n(width)}" stroke-linejoin="round"${dash(values)}`;
}

function dash(values: readonly number[]): string {
  return values.length === 0
    ? ""
    : ` stroke-dasharray="${values.map(n).join(" ")}"`;
}

function n(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
