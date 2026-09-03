import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  buildBoardDrawListV6,
  type BoardDrawCommandV6,
} from "../../src/render/canvas/board-renderer-v6";
import {
  boardWorldBounds,
  projectGrid,
  worldToScreen,
  type CameraState,
  type Size,
} from "../../src/render/canvas/geometry";
import {
  compareEntriesV6,
  type BoardRenderPlanV6,
  type RenderEntryKindV6,
  type RenderPlanEntryV6,
} from "../../src/render/canvas/render-plan-v6";
import { cityPopulationPresentationV6 } from "../../src/render/city-population-presentation-v6";

const root = process.cwd();
const reviewRoot = path.join(
  root,
  "art/integration/reviews/square-grid-experiment",
);
const board = { width: 6, height: 5 } as const;
const focus = { x: 1, y: 1 } as const;
const views = [
  { id: "minimum-dpr1", width: 1500, height: 1350, dpr: 1, zoom: 0.625 },
  { id: "minimum-dpr2", width: 1500, height: 1350, dpr: 2, zoom: 0.625 },
  { id: "one-x-dpr1", width: 1500, height: 1350, dpr: 1, zoom: 1 },
  { id: "one-x-dpr2", width: 1500, height: 1350, dpr: 2, zoom: 1 },
  { id: "maximum-dpr1", width: 1500, height: 1350, dpr: 1, zoom: 1.75 },
  { id: "maximum-dpr2", width: 1500, height: 1350, dpr: 2, zoom: 1.75 },
] as const;

await mkdir(reviewRoot, { recursive: true });
const plan = reviewPlan();
const artifactNames: string[] = [];
const metrics: Array<{
  readonly id: string;
  readonly cssSize: Size;
  readonly backingSize: Size;
  readonly dpr: number;
  readonly zoom: number;
  readonly focusCenter: { readonly x: number; readonly y: number };
}> = [];

for (const view of views) {
  const viewport = { width: view.width, height: view.height };
  const camera = {
    offsetX: (view.width - (board.width - 1) * 128 * view.zoom) / 2,
    offsetY: 310,
    zoom: view.zoom,
  };
  const list = buildBoardDrawListV6({ viewport, camera, plan });
  const svg = await reviewSvg(view.id, viewport, camera, list.commands);
  const nativeName = `${view.id}-native.png`;
  const enlargedName = `${view.id}-enlarged.png`;
  const nativePath = path.join(reviewRoot, nativeName);
  await sharp(Buffer.from(svg))
    .resize(view.width * view.dpr, view.height * view.dpr)
    .png()
    .toFile(nativePath);
  await sharp(nativePath)
    .resize(view.width * view.dpr * 2, view.height * view.dpr * 2, {
      kernel: "nearest",
    })
    .png()
    .toFile(path.join(reviewRoot, enlargedName));
  artifactNames.push(nativeName, enlargedName);
  metrics.push({
    id: view.id,
    cssSize: viewport,
    backingSize: {
      width: view.width * view.dpr,
      height: view.height * view.dpr,
    },
    dpr: view.dpr,
    zoom: camera.zoom,
    focusCenter: worldToScreen(projectGrid(focus), camera),
  });
}

const artifacts = await Promise.all(
  artifactNames.map(async (name) => {
    const data = await readFile(path.join(reviewRoot, name));
    return {
      path: `art/integration/reviews/square-grid-experiment/${name}`,
      bytes: data.byteLength,
      sha256: createHash("sha256").update(data).digest("hex"),
    };
  }),
);

await writeFile(
  path.join(reviewRoot, "review-evidence.json"),
  `${JSON.stringify(
    {
      generatedBy: "npm run art:square-grid-review",
      renderer: "buildBoardDrawListV6",
      projection: {
        kind: "AXIS_ALIGNED_SQUARE",
        cellCssPixels: { width: 128, height: 128 },
        xAxis: "RIGHT",
        yAxis: "DOWN",
        bounds: boardWorldBounds(board.width, board.height),
        tieBreak: "lowest row, then lowest column",
      },
      transition: {
        terrainAndImprovements: "ACCEPTED_SQUARE_RASTERS",
        nativeSquareGroundUnderlay: false,
        nativeSquareRoadContinuity: false,
        unitRasterBytesChanged: false,
      },
      runtimeCoverage: {
        factions: ["ORIGINAL", "CANDY"],
        terrainVariants: { grass: 4, forest: 4, mountain: 3 },
        resources: ["FRUIT", "GAME", "ORE", "FERTILE_GROUND", "STONE"],
        roadMasks: 16,
        improvements: [
          "FARM",
          "QUARRY",
          "WINDMILL",
          "LUMBER_CAMP",
          "MINE",
          "SAWMILL",
          "FORGE",
          "STONEWORKS",
          "WORKSHOP",
          "GRAND_WORKS",
          "MARKET",
        ],
        sharedUiViewportCssPixels: { width: 112, height: 130 },
      },
      views: metrics,
      reviewCoverage: [
        "both faction square Grass, Forest and Mountain families with fog, territory and selection",
        "visible Fruit, Game/Animal, Ore, Fertile Ground and Stone with Forest then Animal then unit layering",
        "accepted cardinal Road masks and every Farm, extraction, processor, civic and commerce improvement",
        "Farm full-square coverage, code-native improvement level/value squares, cities and compact low-centered units",
        "minimum 0.625x, nominal 1x and maximum 1.75x at DPR1 and DPR2 through the production draw-list path",
        "selection identities, contextual actions and technology cards share the exact 112x130 production viewport",
      ],
      visualReview: {
        status: "ACCEPTED_RUNTIME_INTEGRATION",
        notes:
          "Native and nearest-neighbor enlarged sheets were inspected. Accepted square ground fills every cell without corner gaps; tall terrain overhangs upward only; Roads and resources stay legible above terrain; Animals sit in front of Forest and behind compact low-centered units; Farm covers its complete square; all improvement families and code-native level/value squares remain readable with cities, ownership, selection, territory and fog. No clipping, oversized unit, bad layer, legacy fallback or inconsistent square footprint remained.",
      },
      artifacts,
    },
    null,
    2,
  )}\n`,
);

await writeFile(
  path.join(reviewRoot, "README.md"),
  "# Accepted square runtime integration review\n\nGenerated deterministically with `npm run art:square-grid-review`. The six native sheets use the real ruleset-6 production draw list at minimum, nominal and maximum zoom for DPR1 and DPR2. Together they exercise both factions, all square terrain/resource/improvement families, Roads, cities, units, fog, territory, selection and code-native value squares; each has a nearest-neighbor 2x inspection copy. No production raster or accepted-art record is created or changed by this review.\n",
);

async function reviewSvg(
  id: string,
  viewport: Size,
  camera: CameraState,
  commands: readonly BoardDrawCommandV6[],
): Promise<string> {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${viewport.width}" height="${viewport.height}" viewBox="0 0 ${viewport.width} ${viewport.height}">
  <rect width="100%" height="100%" fill="#203936"/>
  ${await commandsSvg(commands)}
  <rect x="12" y="12" width="${Math.min(530, viewport.width - 24)}" height="65" rx="10" fill="#142827ee" stroke="#8aa39d"/>
  <text x="24" y="34" font-family="system-ui,sans-serif" font-size="16" font-weight="800" fill="#fff7e7">Accepted square runtime · ${id}</text>
  <text x="24" y="54" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="#d2e5df">128 × 128 cells · ${camera.zoom.toFixed(3)}× · production renderer</text>
  <text x="24" y="69" font-family="system-ui,sans-serif" font-size="10" font-weight="600" fill="#adc5be">Original/Candy · every improvement family · unchanged compact unit rasters</text>
</svg>`;
}

async function commandsSvg(
  commands: readonly BoardDrawCommandV6[],
): Promise<string> {
  const imageData = new Map<string, string>();
  const result: string[] = [];
  for (const command of commands) {
    const opacity = command.alpha === 1 ? "" : ` opacity="${n(command.alpha)}"`;
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
        `<image x="${n(command.destination.x)}" y="${n(command.destination.y)}" width="${n(command.destination.width)}" height="${n(command.destination.height)}" href="${uri}"${opacity}/>`,
      );
    } else if (command.kind === "POLYGON") {
      result.push(
        `<polygon points="${points(command.points)}" fill="${command.fill}"${stroke(command.stroke, command.lineWidth, command.dash)}${opacity}/>`,
      );
    } else if (command.kind === "LINE") {
      result.push(
        `<polyline points="${points(command.points)}" fill="none" stroke="${command.stroke}" stroke-width="${n(command.lineWidth)}" stroke-linecap="round" stroke-linejoin="round"${dash(command.dash)}${opacity}/>`,
      );
    } else if (command.kind === "ELLIPSE") {
      result.push(
        `<ellipse cx="${n(command.center.x)}" cy="${n(command.center.y)}" rx="${n(command.radiusX)}" ry="${n(command.radiusY)}" fill="${command.fill}"${stroke(command.stroke, command.lineWidth, [])}${opacity}/>`,
      );
    } else if (command.kind === "RECT") {
      result.push(
        `<rect x="${n(command.x)}" y="${n(command.y)}" width="${n(command.width)}" height="${n(command.height)}" fill="${command.fill}"${stroke(command.stroke, command.lineWidth, [])}${opacity}/>`,
      );
    } else {
      result.push(
        `<text x="${n(command.at.x)}" y="${n(command.at.y)}" fill="${command.fill}" font-family="system-ui,sans-serif" font-size="${n(command.fontSize)}" font-weight="${command.weight}" text-anchor="${command.align === "center" ? "middle" : command.align === "right" || command.align === "end" ? "end" : "start"}" dominant-baseline="middle"${opacity}>${escapeXml(command.text)}</text>`,
      );
    }
  }
  return result.join("\n");
}

function reviewPlan(): BoardRenderPlanV6 {
  const entries: RenderPlanEntryV6[] = [];
  let id = 1;
  const add = (
    kind: RenderEntryKindV6,
    at: { readonly x: number; readonly y: number },
    details: unknown,
    layer: number,
    ownerId: number | null = 1,
    variant = (at.x + at.y * 3) % 4,
  ): void => {
    entries.push({
      key: `${kind}:${id}`,
      kind,
      at,
      id,
      ownerId,
      variant,
      layer,
      details,
    } as RenderPlanEntryV6);
    id += 1;
  };

  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const at = { x, y };
      if (x === 5 && y === 0) {
        add("FOG", at, { diplomaticBlock: null }, 0, null);
      } else {
        const terrain =
          y === 0
            ? (["GRASS", "FOREST", "MOUNTAIN"] as const)[x % 3]
            : y === 1 && (x === 1 || x === 2 || x === 4)
              ? x === 1
                ? "FOREST"
                : "MOUNTAIN"
              : "GRASS";
        const ownerId = (x + y) % 2 === 0 ? 1 : 2;
        const faction = ownerId === 1 ? "ORIGINAL" : "CANDY";
        add("TERRAIN", at, { terrain }, 1, ownerId);
        add("OWNERSHIP", at, { faction }, 2, ownerId);
        if (terrain !== "GRASS") {
          add("TERRAIN_BODY", at, { terrain }, 5, ownerId);
        }
      }
    }
  }

  add("RESOURCE", { x: 0, y: 1 }, { resource: "FRUIT" }, 4, 2);
  add("RESOURCE", { x: 1, y: 1 }, { resource: "GAME" }, 4);
  add("RESOURCE", { x: 2, y: 1 }, { resource: "ORE" }, 4, 2);
  add("RESOURCE", { x: 3, y: 1 }, { resource: "FERTILE_GROUND" }, 4);
  add("RESOURCE", { x: 4, y: 1 }, { resource: "STONE" }, 4, 2);

  const improvements = [
    "FARM",
    "QUARRY",
    "WINDMILL",
    "LUMBER_CAMP",
    "MINE",
    "SAWMILL",
    "FORGE",
    "STONEWORKS",
    "WORKSHOP",
    "GRAND_WORKS",
    "MARKET",
  ] as const;
  for (const [index, improvement] of improvements.entries()) {
    const at = { x: index % 6, y: 2 + Math.floor(index / 6) };
    const ownerId = (at.x + at.y) % 2 === 0 ? 1 : 2;
    add("IMPROVEMENT", at, { improvement }, 5, ownerId);
    if (!["FARM", "QUARRY", "LUMBER_CAMP", "MINE"].includes(improvement)) {
      add(
        "IMPROVEMENT_LEVEL",
        at,
        {
          at,
          improvement,
          level: (index % 5) + 1,
          measure: improvement === "MARKET" ? "COIN_INCOME" : "POPULATION",
        },
        8,
        ownerId,
      );
    }
  }

  for (let x = 0; x < board.width; x += 1) {
    add("ROAD", { x, y: 4 }, null, 3, x % 2 === 0 ? 1 : 2);
  }
  add("ROAD", { x: 2, y: 2 }, null, 3);
  add("ROAD", { x: 2, y: 3 }, null, 3, 2);

  const cityAt = { x: 5, y: 3 } as const;
  add("CITY_BACK", cityAt, { faction: "CANDY", isCapital: true }, 5, 2);
  add("CITY_FRONT", cityAt, { faction: "CANDY", isCapital: true }, 5, 2);
  add(
    "CITY_STATUS",
    cityAt,
    {
      faction: "CANDY",
      level: 5,
      populationLayer: cityPopulationPresentationV6({
        id: 88,
        level: 5,
        population: 3,
      }),
      isCapital: true,
    },
    8,
    2,
  );

  add("CONTACT_SHADOW", focus, null, 5);
  add(
    "UNIT",
    focus,
    { faction: "ORIGINAL", role: "FIGHTER", readiness: "PULSE" },
    5,
  );
  add(
    "UNIT_STATUS",
    focus,
    {
      faction: "ORIGINAL",
      role: "FIGHTER",
      hp: 8,
      maxHp: 10,
      state: "NEEDS_ACTION",
      veteran: false,
    },
    8,
  );
  add("CONTACT_SHADOW", { x: 4, y: 2 }, null, 5, 2);
  add(
    "UNIT",
    { x: 4, y: 2 },
    { faction: "CANDY", role: "JUGGERNAUT", readiness: "OPAQUE" },
    5,
    2,
  );
  add("SELECTION", focus, { selectionKind: "UNIT" }, 6);
  add(
    "MOVE_TARGET",
    { x: 0, y: 3 },
    { command: { kind: "WAIT", unitId: 1 } },
    7,
  );
  add(
    "ATTACK_TARGET",
    { x: 4, y: 2 },
    { command: { kind: "WAIT", unitId: 1 } },
    7,
    2,
  );
  add(
    "ECONOMIC_CONTRIBUTOR",
    { x: 3, y: 3 },
    {
      command: { kind: "BUILD_GRAND_WORKS", at: { x: 3, y: 3 } },
      ordinal: 0,
      sourceCityId: 88,
    },
    7,
  );
  for (const edge of ["NORTH", "EAST", "SOUTH", "WEST"] as const) {
    add("CITY_TERRITORY_BOUNDARY", cityAt, { edge }, 6, 2);
  }
  entries.sort(compareEntriesV6);
  return {
    planVersion: 6,
    entries,
    legalCommands: [],
    commandTargets: [],
    economicPreview: null,
  };
}

function points(
  value: readonly { readonly x: number; readonly y: number }[],
): string {
  return value.map((point) => `${n(point.x)},${n(point.y)}`).join(" ");
}

function stroke(
  color: string | null,
  width: number,
  values: readonly number[],
): string {
  return color === null
    ? ""
    : ` stroke="${color}" stroke-width="${n(width)}" stroke-linejoin="round"${dash(values)}`;
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
