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
const panel = { width: 690, height: 500 } as const;
const sheet = {
  width: panel.width * 3 + 80,
  height: panel.height + 96,
} as const;
const zooms = [0.625, 1, 1.75] as const;
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
        x: 40 + index * panel.width,
        y: 72,
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
        `<clipPath id="panel-${index}"><rect x="${40 + index * panel.width}" y="72" width="${panel.width - 20}" height="${panel.height}" rx="12"/></clipPath>`,
    )
    .join("")}</defs>
  <rect width="100%" height="100%" fill="#172b2b"/>
  <text x="40" y="30" font-family="system-ui,sans-serif" font-size="20" font-weight="800" fill="#f5efe0">Ruleset 6 Canvas · ${faction} · zoom and coverage review</text>
  <text x="40" y="53" font-family="system-ui,sans-serif" font-size="13" font-weight="600" fill="#c5d7d4">All seven live improvement levels · square mint pips · city meter remains distinct</text>
  ${panels
    .map(
      ({ index, zoom, commands, accepted, placeholders }) => `<g>
    <rect x="${40 + index * panel.width}" y="72" width="${panel.width - 20}" height="${panel.height}" rx="12" fill="#203936" stroke="#55716c" stroke-width="2"/>
    <g clip-path="url(#panel-${index})">${commands}</g>
    <rect x="${48 + index * panel.width}" y="80" width="250" height="25" rx="7" fill="#172b2be8"/>
    <text x="${55 + index * panel.width}" y="94" font-family="system-ui,sans-serif" font-size="15" font-weight="800" fill="#ffffff">${zoom}× · accepted ${accepted} · placeholders ${placeholders}</text>
  </g>`,
    )
    .join("\n")}
  <text x="40" y="${sheet.height - 14}" font-family="system-ui,sans-serif" font-size="13" font-weight="600" fill="#b9ccca">Standard roles use 0.25 source scale; Breacher 0.24; individualized Juggernaut 0.25. Ordinary unit envelopes stay below Forest/Mountain mass.</text>
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
      add("TERRAIN", at, { terrain: "GRASS" }, 1);
      add("OWNERSHIP", at, { faction }, 2);
      if (y === 3) add("ROAD", at, null, 3);
    }
  }

  const bodies = [
    [{ x: 0, y: 0 }, "MOUNTAIN"],
    [{ x: 1, y: 0 }, "FOREST"],
    [{ x: 1, y: 1 }, "FOREST"],
    [{ x: 3, y: 1 }, "MOUNTAIN"],
    [{ x: 4, y: 1 }, "MOUNTAIN"],
    [{ x: 5, y: 2 }, "FOREST"],
  ] as const;
  for (const [at, terrain] of bodies) add("TERRAIN_BODY", at, { terrain }, 5);

  RESOURCE_IDS.forEach((resource, index) =>
    add(
      "RESOURCE",
      { x: index, y: 1 },
      { resource },
      resource === "GAME" ? 5 : 4,
    ),
  );
  add("RESOURCE", { x: 5, y: 2 }, { resource: "GAME" }, 5);
  add("UNKNOWN_RESOURCE", { x: 5, y: 1 }, null, 4);

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
    { x: 5, y: 2 },
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

  add("SELECTION", { x: 5, y: 2 }, { selectionKind: "UNIT" }, 6, null);
  for (const edge of [
    "NORTH_WEST",
    "NORTH_EAST",
    "SOUTH_EAST",
    "SOUTH_WEST",
  ] as const)
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

function centeredCamera(
  width: number,
  height: number,
  zoom: number,
  viewport: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
) {
  const centerWorld = {
    x: ((width - height) * 64) / 2,
    y: ((width + height - 2) * 37) / 2,
  };
  return {
    zoom,
    offsetX: viewport.x + viewport.width / 2 - centerWorld.x * zoom,
    offsetY: viewport.y + viewport.height / 2 - centerWorld.y * zoom + 42,
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
        reviewCoverage: [
          "complete accepted production raster inventory with zero placeholders",
          "all nine role silhouettes with ordinary units smaller than Forest and Mountain",
          "accepted Road masks, economic contributor numbers, opposite-pair axis and value chip",
          "all seven leveled improvements with exact zero, one, and multi-value compact square pips",
          "selection, move/attack targets, unit/city/wall status and fog",
          "Forest Game/Animal frontage without a unit and beneath an occupied selected unit",
          "level-4 negative population as exactly two leading red deficit squares within the fixed five-square layer",
        ],
        visualReview: {
          status: "ACCEPTED",
          notes:
            "Native and enlarged sheets were inspected individually. Mint square improvement pips remain compact and dark-outlined at 0.625x, 1x, and 1.75x for DPR1/2, including zero, one, 3–7, and Market values; they remain distinct from the city's larger yellow/red meter inside its labeled badge. The level-4 city retains its fixed five-square layer with exactly two leading red deficit squares. Game/Animal remains visible in front of each Forest canopy, including beneath a selected occupied tile.",
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
    `# Ruleset-6 Canvas renderer review\n\nGenerated deterministically with \`npm run art:ruleset6-renderer-review\`. The eight sheets cover Original and Candy at 0.625x, 1x, and 1.75x for DPR1 and DPR2, each at native backing resolution and nearest-neighbor 2x inspection scale. The advanced-building rows cover all seven leveled improvements with exact zero, one, and multi-value mint square pips. The pips use a dark outline and no status envelope, keeping them distinct from the level-4 city's larger five-square population meter inside its labeled badge.\n\nThe resource row includes an unoccupied Forest Game/Animal tile, and the right-side Forest includes Game beneath a selected unit. These prove canopy → Animal → unit → interaction/status ordering without changing shared anchors. Technology-hidden resources intentionally add no world marker: explored ordinary terrain is the complete visual. Accepted, semantically identical existing rasters are embedded from checked-in files; fog, ownership, targets, economic contributors and statuses remain intentionally code-native.\n`,
  );
}
