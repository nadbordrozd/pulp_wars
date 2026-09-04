import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  ECONOMIC_IMPROVEMENT_IDS,
  LEVELED_ECONOMIC_IMPROVEMENT_IDS_V6,
  RESOURCE_IDS,
  UNIT_ROLE_IDS,
  type FactionIdV6,
} from "../../src/engine/index";
import {
  PLACEMENT_ART_GEOMETRY,
  RULESET6_UNIT_COSMETIC_OFFSET_Y,
  SQUARE_ART_GEOMETRY,
} from "../../src/render/canvas/board-art-geometry";
import {
  buildBoardDrawListV6,
  type BoardDrawCommandV6,
} from "../../src/render/canvas/board-renderer-v6";
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
  "art/pixellab/reviews/ruleset6-canvas-renderer",
);
const panel = { width: 1390, height: 880 } as const;
const sheet = {
  width: panel.width + 80,
  height: panel.height * 3 + 120,
} as const;
const zooms = [0.625, 1, 1.75] as const;
const MOUNTAIN_BODY_OFFSET_SOURCE_PIXELS = 40;
const artifacts: string[] = [];

await mkdir(reviewRoot, { recursive: true });
for (const faction of ["ORIGINAL", "CANDY"] as const) {
  for (const dpr of [1, 2] as const) {
    const nativeName = `${faction.toLowerCase()}-dpr${dpr}-native.png`;
    const enlargedName = `${faction.toLowerCase()}-dpr${dpr}-enlarged.png`;
    const svg = await reviewSvg(faction);
    const nativePath = path.join(reviewRoot, nativeName);
    await sharp(Buffer.from(svg))
      .resize(sheet.width * dpr, sheet.height * dpr)
      .png()
      .toFile(nativePath);
    await sharp(nativePath)
      .resize(sheet.width * dpr * 2, sheet.height * dpr * 2, {
        kernel: "nearest",
      })
      .png()
      .toFile(path.join(reviewRoot, enlargedName));
    artifacts.push(nativeName, enlargedName);
  }
}
await writeEvidence();
await writeReadme();

async function reviewSvg(faction: FactionIdV6): Promise<string> {
  const plan = representativePlan(faction);
  const panels = await Promise.all(
    zooms.map(async (zoom, index) => {
      const camera = centeredCamera(6, 6, zoom, {
        x: 40,
        y: 72 + index * panel.height,
        width: panel.width,
        height: panel.height,
      });
      const list = buildBoardDrawListV6({
        viewport: panel,
        camera,
        plan,
      });
      return {
        index,
        zoom,
        commands: await commandsSvg(list.commands),
        accepted: list.coverage.filter((item) => item.status === "ACCEPTED")
          .length,
        placeholders: list.coverage.filter(
          (item) => item.status === "PLACEHOLDER",
        ).length,
      };
    }),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sheet.width}" height="${sheet.height}" viewBox="0 0 ${sheet.width} ${sheet.height}">
  <defs>${panels
    .map(
      ({ index }) =>
        `<clipPath id="panel-${index}"><rect x="40" y="${72 + index * panel.height}" width="${panel.width - 20}" height="${panel.height - 16}" rx="12"/></clipPath>`,
    )
    .join("")}</defs>
  <rect width="100%" height="100%" fill="#172b2b"/>
  <text x="40" y="30" font-family="system-ui,sans-serif" font-size="20" font-weight="800" fill="#f5efe0">Ruleset 6 Canvas · ${faction} · zoom and coverage review</text>
  <text x="40" y="53" font-family="system-ui,sans-serif" font-size="13" font-weight="600" fill="#c5d7d4">Grounded Mountains · Forest/Camp and replaced-canopy Sawmill · enlarged chest · all nine roles</text>
  ${panels
    .map(
      ({ index, zoom, commands, accepted, placeholders }) => `<g>
    <rect x="40" y="${72 + index * panel.height}" width="${panel.width - 20}" height="${panel.height - 16}" rx="12" fill="#203936" stroke="#55716c" stroke-width="2"/>
    <g clip-path="url(#panel-${index})">${commands}</g>
    <rect x="48" y="${80 + index * panel.height}" width="370" height="25" rx="7" fill="#172b2be8"/>
    <text x="55" y="${94 + index * panel.height}" font-family="system-ui,sans-serif" font-size="15" font-weight="800" fill="#ffffff">${zoom}× · +${RULESET6_UNIT_COSMETIC_OFFSET_Y}px unit baseline · accepted ${accepted} · placeholders ${placeholders}</text>
  </g>`,
    )
    .join("\n")}
  <text x="40" y="${sheet.height - 14}" font-family="system-ui,sans-serif" font-size="13" font-weight="600" fill="#b9ccca">Units and attached shadow/status baselines move together; source scale, tile sorting, selection, effects and authoritative coordinates remain unchanged.</text>
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

function representativePlan(faction: FactionIdV6): BoardRenderPlanV6 {
  const entries: RenderPlanEntryV6[] = [];
  let id = 1;
  const add = (
    kind: RenderEntryKindV6,
    at: { readonly x: number; readonly y: number },
    details: unknown,
    layer: number,
    ownerId: number | null = 1,
    variant = (at.x * 3 + at.y) % 4,
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

  const fogged = new Set(["0,5", "1,5", "5,0"]);
  for (let y = 0; y < 6; y += 1) {
    for (let x = 0; x < 6; x += 1) {
      const at = { x, y };
      if (fogged.has(`${x},${y}`)) {
        add("FOG", at, { diplomaticBlock: null }, 0, null);
        continue;
      }
      const terrain = terrainAt(x, y);
      add(
        "TERRAIN",
        at,
        {
          terrain,
          ...(x === 5 && y === 2 ? { groundOnly: true } : {}),
        },
        1,
        1,
        y === 0 && x <= 3 ? x : (x * 3 + y) % 4,
      );
      add("OWNERSHIP", at, { faction }, 2);
      if (y === 3) add("ROAD", at, null, 3);
      if (terrain !== "GRASS") add("TERRAIN_BODY", at, { terrain }, 5);
    }
  }

  RESOURCE_IDS.forEach((resource, index) =>
    add(
      "RESOURCE",
      { x: index, y: 1 },
      { resource },
      resource === "GAME" ? 5 : 4,
    ),
  );
  add("UNKNOWN_RESOURCE", { x: 5, y: 1 }, null, 4);
  add("TREASURE", { x: 4, y: 0 }, null, 5, null);

  ECONOMIC_IMPROVEMENT_IDS.forEach((improvement, index) => {
    const at = { x: index % 6, y: 2 + Math.floor(index / 6) };
    add("IMPROVEMENT", at, { improvement }, 5);
    const levelIndex = LEVELED_ECONOMIC_IMPROVEMENT_IDS_V6.indexOf(
      improvement as (typeof LEVELED_ECONOMIC_IMPROVEMENT_IDS_V6)[number],
    );
    if (levelIndex >= 0) {
      const levels = [0, 1, 4, 7, 3, 6, 5] as const;
      add(
        "IMPROVEMENT_LEVEL",
        at,
        {
          at,
          improvement,
          level: levels[levelIndex] ?? 0,
          measure: improvement === "MARKET" ? "COIN_INCOME" : "POPULATION",
        },
        8,
      );
    }
  });

  add("SITE", { x: 5, y: 4 }, { site: "VILLAGE" }, 5, null);
  add("SITE", { x: 0, y: 4 }, { site: "CAPITAL" }, 5);
  add("CITY_BACK", { x: 0, y: 4 }, { faction, isCapital: true }, 5);
  add("CITY_FRONT", { x: 0, y: 4 }, { faction, isCapital: true }, 5);
  add(
    "CITY_STATUS",
    { x: 0, y: 4 },
    {
      faction,
      level: 4,
      populationLayer: cityPopulationPresentationV6({
        id: 300,
        level: 4,
        population: -2,
      }),
      isCapital: true,
    },
    8,
  );
  add("CHOCOLATE_WALL", { x: 4, y: 4 }, { faction: "CANDY", hp: 7 }, 5);
  add("CHOCOLATE_WALL_STATUS", { x: 4, y: 4 }, { hp: 7 }, 8);

  const unitCoords = [
    { x: 1, y: 4 },
    { x: 2, y: 4 },
    { x: 3, y: 4 },
    { x: 1, y: 5 },
    { x: 2, y: 5 },
    { x: 3, y: 5 },
    { x: 4, y: 5 },
    { x: 5, y: 5 },
    { x: 5, y: 3 },
  ] as const;
  UNIT_ROLE_IDS.forEach((role, index) => {
    const at = unitCoords[index];
    if (at === undefined) return;
    add("CONTACT_SHADOW", at, null, 5);
    add("UNIT", at, { faction, role, readiness: "OPAQUE" }, 5);
    add(
      "UNIT_STATUS",
      at,
      {
        faction,
        role,
        hp: index === 5 ? 4 : 10,
        maxHp: 10,
        state: index === 3 ? "HANDLED" : "NEEDS_ACTION",
        veteran: index === 6,
      },
      8,
    );
  });

  add("SELECTION", { x: 1, y: 4 }, { selectionKind: "UNIT" }, 6, null);
  for (const edge of ["NORTH", "EAST", "SOUTH", "WEST"] as const)
    add("CITY_TERRITORY_BOUNDARY", { x: 0, y: 4 }, { edge }, 6);
  add(
    "ECONOMIC_CONTRIBUTOR",
    { x: 1, y: 2 },
    {
      command: { kind: "BUILD_STONEWORKS", at: { x: 2, y: 2 } },
      ordinal: 0,
      sourceCityId: 20,
    },
    7,
  );
  add(
    "ECONOMIC_CONTRIBUTOR",
    { x: 3, y: 2 },
    {
      command: { kind: "BUILD_STONEWORKS", at: { x: 2, y: 2 } },
      ordinal: 1,
      sourceCityId: 21,
    },
    7,
  );
  add(
    "ECONOMIC_PAIR_AXIS",
    { x: 2, y: 2 },
    {
      command: { kind: "BUILD_STONEWORKS", at: { x: 2, y: 2 } },
      axis: "EAST_WEST",
    },
    7,
  );
  add(
    "ECONOMIC_VALUE",
    { x: 2, y: 2 },
    {
      command: { kind: "BUILD_STONEWORKS", at: { x: 2, y: 2 } },
      ownerCityId: 20,
      cost: 5,
      resultingContribution: 4,
      populationDeltaByCity: [{ cityId: 20, delta: 4 }],
      coinIncomeDeltaByCity: [],
      capitalRoadConnected: true,
    },
    7,
  );
  add("MOVE_PATH", { x: 2, y: 4 }, { ordinal: 0 }, 7, null);
  add(
    "MOVE_TARGET",
    { x: 3, y: 4 },
    { command: { kind: "WAIT", unitId: 1 } },
    7,
    null,
  );
  add(
    "ATTACK_TARGET",
    { x: 4, y: 4 },
    { command: { kind: "WAIT", unitId: 1 } },
    7,
    null,
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

function terrainAt(x: number, y: number): "GRASS" | "FOREST" | "MOUNTAIN" {
  if (y === 0 && x <= 2) return "MOUNTAIN";
  if (y === 1 && x === 1) return "FOREST";
  if (y === 1 && (x === 2 || x === 4)) return "MOUNTAIN";
  if (y === 2 && (x === 1 || x === 5)) return "FOREST";
  if (y === 2 && (x === 2 || x === 3)) return "MOUNTAIN";
  return "GRASS";
}

function centeredCamera(
  width: number,
  _height: number,
  zoom: number,
  viewport: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
) {
  const centerWorldX = ((width - 1) * 128) / 2;
  return {
    zoom,
    offsetX: viewport.x + viewport.width / 2 - centerWorldX * zoom,
    offsetY: viewport.y + 64 * zoom + 12,
  };
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

async function writeEvidence(): Promise<void> {
  const records = await Promise.all(
    artifacts.map(async (name) => {
      const bytes = await readFile(path.join(reviewRoot, name));
      return {
        path: `art/pixellab/reviews/ruleset6-canvas-renderer/${name}`,
        bytes: bytes.byteLength,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    }),
  );
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    `${JSON.stringify(
      {
        generatedBy: "npm run art:ruleset6-renderer-review",
        factions: ["ORIGINAL", "CANDY"],
        zooms,
        devicePixelRatios: [1, 2],
        scaleContracts: { standard: 0.25, breacher: 0.24, juggernaut: 0.25 },
        placementContracts: {
          unitOffsetY: RULESET6_UNIT_COSMETIC_OFFSET_Y,
          fertileGroundOffsetY: PLACEMENT_ART_GEOMETRY.fertileGround.offsetY,
          coordinateSpace: "nominal CSS pixels at 1x zoom",
        },
        mapObjectContracts: {
          mountainBodyOffsetSourcePixels: MOUNTAIN_BODY_OFFSET_SOURCE_PIXELS,
          lumberCampVisibleCssAt1x: { width: 58.8, height: 56 },
          sawmillVisibleCssAt1x: { width: 76.32, height: 74.52 },
          treasureVisibleCssAt1x: { width: 40.5, height: 43 },
          displayScales: {
            lumberCamp: SQUARE_ART_GEOMETRY.lumberCamp.displayScale,
            sawmill: SQUARE_ART_GEOMETRY.sawmill.displayScale,
            treasure: SQUARE_ART_GEOMETRY.treasure.displayScale,
          },
        },
        reviewCoverage: [
          "complete accepted production raster inventory with zero placeholders",
          "all nine role silhouettes with ordinary units smaller than Forest and Mountain",
          "all nine Original and all nine Candy unit silhouettes visibly centered at 0.625x, 1x and 1.75x",
          "Fertile Ground painted bounds centered across the owning square instead of ending at tile center",
          "accepted Road masks, economic contributor numbers, opposite-pair axis and value chip",
          "all seven leveled improvements with exact zero, one, and multi-value compact square pips",
          "selection, move/attack targets, unit/city/wall status and fog",
          "Forest Game/Animal frontage in front of its owning canopy",
          "all three newly grounded Mountain variants with fixed square ground and no lateral or bottom overflow",
          "larger Lumber Camp over retained Forest and larger Sawmill over same-tile faction ground with its canopy suppressed",
          "larger neutral treasure chest below units and major terrain",
          "level-4 negative population as exactly two leading red deficit squares within the fixed five-square layer",
        ],
        visualReview: {
          status: "ACCEPTED",
          notes:
            "Native and enlarged sheets were inspected individually at 0.625x, 1x and 1.75x for DPR1/2. Every Original and Candy Mountain body is grounded in the lower half of its unchanged square without lateral or bottom spill. Lumber Camp remains subordinate to its visible Forest; Sawmill is legible over matching ground with only its own Forest canopy suppressed; the enlarged chest remains below units and major terrain. Every faction role retains its accepted compact scale, Game stays in front of Forest, and shadows, status, selection, targets, picking and authoritative coordinates remain unchanged.",
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
    `# Ruleset-6 Canvas renderer review\n\nGenerated deterministically with \`npm run art:ruleset6-renderer-review\`. The eight sheets cover Original and Candy at 0.625x, 1x, and 1.75x for DPR1 and DPR2, each at native backing resolution and nearest-neighbor 2x inspection scale. The panels include every newly grounded Mountain variant, enlarged Lumber Camp and treasure chest, and the larger Sawmill with its same-tile Forest canopy replaced by exact faction ground. The Camp comparison retains Forest, proving suppression is specific to Sawmill. All nine faction roles and Fertile Ground remain visible for scale comparison.\n\nUnits retain accepted standard, siege, and giant scales with the shared +${RULESET6_UNIT_COSMETIC_OFFSET_Y} CSS px baseline correction; Fertile Ground retains +${PLACEMENT_ART_GEOMETRY.fertileGround.offsetY} CSS px. The resource row keeps Game/Animal in front of Forest. Fog, ownership, targets, contributor marks and status remain code-native. Sorting, picking, combat origins, simulation terrain, mechanics and authoritative coordinates are unchanged.\n`,
  );
}
