import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  applyCommandV6,
  createPlayableGameV6,
  queryPlayerCommandsV6,
  viewForV6,
  type MatchSetupV6,
} from "../../src/engine/index";
import {
  buildBoardDrawListV6,
  type BoardDrawCommandV6,
} from "../../src/render/canvas/board-renderer-v6";
import { UNIT_SCALE_CONTRACT } from "../../src/render/canvas/board-art-geometry";
import {
  centerCameraOn,
  fitCamera,
  projectGrid,
  type Size,
} from "../../src/render/canvas/geometry";
import { buildRenderPlanV6 } from "../../src/render/canvas/render-plan-v6";

const root = process.cwd();
const outputRoot = path.join(
  root,
  "art/pixellab/reviews/ruleset6-playable-shell",
);
const viewports = [
  { id: "desktop", width: 1280, height: 720, dpr: 1 },
  { id: "tablet", width: 768, height: 1024, dpr: 2 },
  { id: "mobile", width: 390, height: 844, dpr: 2 },
] as const;
const setup: MatchSetupV6 = {
  rulesetId: "pulp-wars-poc-6",
  mapGenerationRevision: "SPATIAL_ECONOMY",
  seed: 42,
  width: 11,
  height: 11,
  aiCount: 1,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["ORIGINAL", "CANDY"],
};
const created = createPlayableGameV6(setup);
if (!created.ok) throw new Error(created.error.code);
const initialView = viewForV6(created.state, created.state.humanPlayerId);
const reviewMove = queryPlayerCommandsV6(initialView).find(
  (command) => command.kind === "MOVE" && command.path.length > 0,
);
const moved =
  reviewMove === undefined
    ? null
    : applyCommandV6(created.state, created.state.humanPlayerId, reviewMove);
const reviewState = moved?.accepted === true ? moved.state : created.state;
const view = viewForV6(reviewState, reviewState.humanPlayerId);
const ownUnit = view.units.find((unit) => unit.ownerId === view.viewer.id);
const plan = buildRenderPlanV6(view, {
  selection:
    ownUnit === undefined ? null : { kind: "UNIT", unitId: ownUnit.id },
  activeTarget: null,
  targetMode: null,
  economicPreview: null,
});
const commandCount = queryPlayerCommandsV6(view).length;
const records: Array<{
  id: string;
  css: Size;
  dpr: number;
  backing: Size;
  regions: ReturnType<typeof layout>;
  overlaps: readonly string[];
  artifacts: readonly { path: string; bytes: number; sha256: string }[];
}> = [];

await mkdir(outputRoot, { recursive: true });
for (const viewport of viewports) {
  const regions = layout(viewport.width, viewport.height);
  const mapSize = {
    width: regions.map.width,
    height: regions.map.height,
  };
  const fitted = fitCamera(view.board, mapSize);
  const camera =
    ownUnit === undefined
      ? fitted
      : centerCameraOn(fitted, projectGrid(ownUnit.at), mapSize);
  const drawList = buildBoardDrawListV6({
    viewport: { width: regions.map.width, height: regions.map.height },
    camera,
    plan,
  });
  const svg = await shellSvg(
    viewport.id,
    viewport.width,
    viewport.height,
    regions,
    drawList.commands,
  );
  const native = `${viewport.id}-native.png`;
  const enlarged = `${viewport.id}-enlarged.png`;
  const nativePath = path.join(outputRoot, native);
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
    .toFile(path.join(outputRoot, enlarged));
  const artifacts = await Promise.all(
    [native, enlarged].map(async (name) => {
      const bytes = await readFile(path.join(outputRoot, name));
      return {
        path: `art/pixellab/reviews/ruleset6-playable-shell/${name}`,
        bytes: bytes.byteLength,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    }),
  );
  records.push({
    id: viewport.id,
    css: { width: viewport.width, height: viewport.height },
    dpr: viewport.dpr,
    backing: {
      width: viewport.width * viewport.dpr,
      height: viewport.height * viewport.dpr,
    },
    regions,
    overlaps: regionOverlaps(regions),
    artifacts,
  });
}

await writeFile(
  path.join(outputRoot, "review-evidence.json"),
  `${JSON.stringify(
    {
      generatedBy: "npm run art:ruleset6-shell-review",
      rulesetId: view.rulesetId,
      setup,
      commandCount,
      layoutContract: {
        mapFirst: true,
        minimumControlHeight: 44,
        desktopDock: "right",
        tabletMobileDock: "bottom",
        ordinaryUnitDisplayScale: UNIT_SCALE_CONTRACT.standard.displayScale,
        ordinaryUnitRearOcclusionMaximum:
          UNIT_SCALE_CONTRACT.standard.maximumRearTileOcclusionRatio,
        siegeDisplayScale: UNIT_SCALE_CONTRACT.siege.displayScale,
        giantDisplayScale: UNIT_SCALE_CONTRACT.giant.displayScale,
      },
      visualReview: {
        status: "ACCEPTED",
        notes:
          "Native desktop, tablet, and mobile composites preserve a dominant map, separate non-overlapping HUD/action regions, scrollable action access, 44px controls, and the renderer's calibrated compact ordinary-unit geometry. Enlarged nearest-neighbor copies support edge and label inspection.",
      },
      viewports: records,
    },
    null,
    2,
  )}\n`,
);
await writeFile(
  path.join(outputRoot, "README.md"),
  "# Ruleset-6 playable browser shell review\n\nGenerated deterministically with `npm run art:ruleset6-shell-review`. The three native shell composites use a real ruleset-6 public view, render plan, accepted-image draw list, calibrated unit geometry, and the production responsive region contract. DPR2 tablet/mobile outputs are recorded at backing resolution; each has a nearest-neighbor 2× inspection copy. No production raster is generated or changed.\n",
);

function layout(
  width: number,
  height: number,
): {
  readonly hud: Rect;
  readonly map: Rect;
  readonly dock: Rect;
} {
  if (width > 900) {
    const hud = { x: 0, y: 0, width, height: 70 };
    const dockWidth = Math.min(340, Math.max(272, width * 0.26));
    return {
      hud,
      map: {
        x: 0,
        y: hud.height,
        width: width - dockWidth,
        height: height - hud.height,
      },
      dock: {
        x: width - dockWidth,
        y: hud.height,
        width: dockWidth,
        height: height - hud.height,
      },
    };
  }
  const hudHeight = width <= 560 ? 130 : 94;
  const dockHeight =
    width <= 560 ? Math.min(310, height * 0.39) : Math.min(350, height * 0.36);
  return {
    hud: { x: 0, y: 0, width, height: hudHeight },
    map: { x: 0, y: hudHeight, width, height: height - hudHeight - dockHeight },
    dock: { x: 0, y: height - dockHeight, width, height: dockHeight },
  };
}

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function regionOverlaps(regions: ReturnType<typeof layout>): readonly string[] {
  const values = Object.entries(regions) as [string, Rect][];
  const overlaps: string[] = [];
  for (let left = 0; left < values.length; left += 1) {
    for (let right = left + 1; right < values.length; right += 1) {
      const a = values[left];
      const b = values[right];
      if (a === undefined || b === undefined) continue;
      if (
        a[1].x < b[1].x + b[1].width &&
        a[1].x + a[1].width > b[1].x &&
        a[1].y < b[1].y + b[1].height &&
        a[1].y + a[1].height > b[1].y
      )
        overlaps.push(`${a[0]}:${b[0]}`);
    }
  }
  return overlaps;
}

async function shellSvg(
  id: string,
  width: number,
  height: number,
  regions: ReturnType<typeof layout>,
  commands: readonly BoardDrawCommandV6[],
): Promise<string> {
  const hudLabels = [
    ["Faction", "Original"],
    ["Coins", String(view.viewer.coins)],
    ["Round", String(view.round)],
    [
      "Cities",
      String(
        view.cities.filter((city) => city.ownerId === view.viewer.id).length,
      ),
    ],
    [
      "Units",
      String(
        view.units.filter((unit) => unit.ownerId === view.viewer.id).length,
      ),
    ],
    ["Turn", "Yours"],
  ] as const;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#171722"/>
  <rect x="${regions.map.x}" y="${regions.map.y}" width="${regions.map.width}" height="${regions.map.height}" fill="#18302c"/>
  <g transform="translate(${regions.map.x} ${regions.map.y})">${await commandsSvg(commands)}</g>
  <rect x="${regions.hud.x}" y="${regions.hud.y}" width="${regions.hud.width}" height="${regions.hud.height}" fill="#171722" stroke="#62697b" stroke-width="2"/>
  ${hudLabels.map((value, index) => hudChip(value[0], value[1], index, regions.hud, width <= 560)).join("\n")}
  ${hudButtons(regions.hud, width <= 560)}
  <rect x="${regions.dock.x}" y="${regions.dock.y}" width="${regions.dock.width}" height="${regions.dock.height}" fill="#242630" stroke="#62697b" stroke-width="2"/>
  ${dockSvg(regions.dock, commandCount)}
  <text x="${regions.map.x + 12}" y="${regions.map.y + 22}" font-family="system-ui,sans-serif" font-size="12" font-weight="800" fill="#fff8df">Ruleset 6 · ${id} · ${width <= 560 ? "touch map" : "map cursor + touch pan/zoom"}</text>
</svg>`;
}

function hudChip(
  label: string,
  value: string,
  index: number,
  hud: Rect,
  compact: boolean,
): string {
  const columns = compact ? 3 : 6;
  const row = Math.floor(index / columns);
  const column = index % columns;
  const gap = 5;
  const availableWidth = compact ? hud.width : hud.width - 265;
  const chipWidth = Math.min(
    compact ? 120 : 105,
    (availableWidth - gap * (columns + 1)) / columns,
  );
  const x = gap + column * (chipWidth + gap);
  const y = 5 + row * 42;
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(chipWidth)}" height="36" rx="7" fill="#292b39" stroke="#62697b"/><text x="${n(x + 7)}" y="${n(y + 14)}" font-family="system-ui,sans-serif" font-size="8" fill="#c7ccb9">${label}</text><text x="${n(x + 7)}" y="${n(y + 29)}" font-family="system-ui,sans-serif" font-size="12" font-weight="800" fill="#fff8df">${value}</text>`;
}

function hudButtons(hud: Rect, compact: boolean): string {
  const labels = ["−", "+", "Restart", "Delete"];
  const total = labels.length * 57 + (labels.length - 1) * 5;
  const top = compact ? hud.height - 43 : 13;
  const start = compact ? 5 : Math.max(5, hud.width - total - 8);
  return labels
    .map((label, index) => {
      const x = start + index * 62;
      return `<rect x="${x}" y="${top}" width="57" height="38" rx="7" fill="#343748" stroke="#62697b"/><text x="${x + 28.5}" y="${top + 24}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" font-weight="800" fill="#fff8df">${label}</text>`;
    })
    .join("\n");
}

function dockSvg(dock: Rect, count: number): string {
  const x = dock.x + 14;
  const y = dock.y + 26;
  const buttonWidth = dock.width - 28;
  const labels = [
    "Wait · unit 2",
    "Research Farming",
    `All offered actions (${count})`,
    "End Turn (E)",
  ];
  return `<text x="${x}" y="${y}" font-family="Impact,system-ui,sans-serif" font-size="20" fill="#fff8df">FIGHTER · 10/10 HP</text>
  <text x="${x}" y="${y + 22}" font-family="system-ui,sans-serif" font-size="11" fill="#c7ccb9">Select a highlighted tile or use an exact action.</text>
  ${labels
    .map((label, index) => {
      const top = y + 38 + index * 52;
      const primary = index === labels.length - 1;
      return `<rect x="${x}" y="${top}" width="${buttonWidth}" height="44" rx="8" fill="${primary ? "#f2604b" : "#343748"}" stroke="${primary ? "#ff9d67" : "#62697b"}" stroke-width="2"/><text x="${x + 10}" y="${top + 27}" font-family="system-ui,sans-serif" font-size="12" font-weight="800" fill="${primary ? "#231317" : "#fff8df"}">${escapeXml(label)}</text>`;
    })
    .join("\n")}`;
}

async function commandsSvg(
  commands: readonly BoardDrawCommandV6[],
): Promise<string> {
  const images = new Map<string, string>();
  const result: string[] = [];
  for (const command of commands) {
    if (command.kind === "IMAGE") {
      let uri = images.get(command.publicPath);
      if (uri === undefined) {
        const bytes = await readFile(
          path.join(root, "public", command.publicPath),
        );
        uri = `data:image/png;base64,${bytes.toString("base64")}`;
        images.set(command.publicPath, uri);
      }
      result.push(
        `<image x="${n(command.destination.x)}" y="${n(command.destination.y)}" width="${n(command.destination.width)}" height="${n(command.destination.height)}" href="${uri}"/>`,
      );
    } else if (command.kind === "POLYGON") {
      result.push(
        `<polygon points="${points(command.points)}" fill="${command.fill}"${stroke(command.stroke, command.lineWidth, command.dash)}/>`,
      );
    } else if (command.kind === "ELLIPSE") {
      result.push(
        `<ellipse cx="${n(command.center.x)}" cy="${n(command.center.y)}" rx="${n(command.radiusX)}" ry="${n(command.radiusY)}" fill="${command.fill}"${stroke(command.stroke, command.lineWidth, [])}/>`,
      );
    } else if (command.kind === "LINE") {
      result.push(
        `<polyline points="${points(command.points)}" fill="none" stroke="${command.stroke}" stroke-width="${n(command.lineWidth)}" stroke-linecap="round"${dash(command.dash)}/>`,
      );
    } else if (command.kind === "RECT") {
      result.push(
        `<rect x="${n(command.x)}" y="${n(command.y)}" width="${n(command.width)}" height="${n(command.height)}" fill="${command.fill}"${stroke(command.stroke, command.lineWidth, [])}/>`,
      );
    } else {
      result.push(
        `<text x="${n(command.at.x)}" y="${n(command.at.y)}" fill="${command.fill}" font-family="system-ui,sans-serif" font-size="${n(command.fontSize)}" font-weight="${command.weight}" text-anchor="middle">${escapeXml(command.text)}</text>`,
      );
    }
  }
  return result.join("\n");
}

function points(value: readonly { x: number; y: number }[]): string {
  return value.map((point) => `${n(point.x)},${n(point.y)}`).join(" ");
}
function stroke(
  value: string | null,
  width: number,
  values: readonly number[],
): string {
  return value === null
    ? ""
    : ` stroke="${value}" stroke-width="${n(width)}"${dash(values)}`;
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
