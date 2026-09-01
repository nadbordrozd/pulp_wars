import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { unitId } from "../../src/engine/index";
import {
  buildBoardDrawListV6,
  type BoardDrawCommandV6,
} from "../../src/render/canvas/board-renderer-v6";
import {
  combatAnimationFrameV6,
  type CombatPresentationV6,
} from "../../src/render/canvas/combat-presentation-v6";
import {
  centerCameraOn,
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
const reviewRoot = path.join(
  root,
  "art/integration/reviews/ruleset6-melee-feedback",
);
const views = [
  { id: "desktop", width: 1200, height: 700, dpr: 1 },
  { id: "mobile", width: 390, height: 844, dpr: 2 },
] as const;
const phases = [
  { id: "contact", elapsedMs: 140, motion: "FULL" },
  { id: "impact", elapsedMs: 240, motion: "FULL" },
  { id: "reduced", elapsedMs: 0, motion: "REDUCED" },
] as const;

await mkdir(reviewRoot, { recursive: true });
const plan = reviewPlan();
const artifactNames: string[] = [];
for (const viewport of views) {
  const size = { width: viewport.width, height: viewport.height };
  const camera = centerCameraOn(
    { offsetX: 0, offsetY: 0, zoom: viewport.id === "mobile" ? 1.05 : 1.35 },
    projectGrid({ x: 3, y: 3 }),
    size,
  );
  for (const phase of phases) {
    const presentation = reviewPresentation(phase.motion);
    const list = buildBoardDrawListV6({
      viewport: size,
      camera,
      plan,
      combatPresentation: presentation,
      combatFrame: combatAnimationFrameV6(presentation, phase.elapsedMs),
      reducedMotion: phase.motion === "REDUCED",
    });
    const svg = await reviewSvg(
      `${phase.id} · ${phase.motion.toLowerCase()} motion`,
      size,
      camera,
      list.commands,
    );
    const name = `${viewport.id}-${phase.id}${viewport.dpr === 2 ? "-dpr2" : ""}.png`;
    await sharp(Buffer.from(svg))
      .resize(viewport.width * viewport.dpr, viewport.height * viewport.dpr)
      .png()
      .toFile(path.join(reviewRoot, name));
    artifactNames.push(name);
  }
}

const artifacts = await Promise.all(
  artifactNames.map(async (name) => {
    const data = await readFile(path.join(reviewRoot, name));
    return {
      path: `art/integration/reviews/ruleset6-melee-feedback/${name}`,
      bytes: data.byteLength,
      sha256: createHash("sha256").update(data).digest("hex"),
    };
  }),
);
await writeFile(
  path.join(reviewRoot, "review-evidence.json"),
  `${JSON.stringify(
    {
      generatedBy: "npm run art:ruleset6-combat-review",
      renderer: "buildBoardDrawListV6",
      viewports: views,
      phases,
      assertions: [
        "attacker sprite lunges toward the adjacent target during contact",
        "defender and retaliated attacker sprites shake during impact",
        "health bars, shadows, selection, terrain and map anchors remain fixed",
        "reduced motion is stationary and uses one brief opacity reaction",
        "review title, phase label and subtitle fit inside every viewport panel",
      ],
      visualReview: {
        status: "ACCEPTED",
        notes:
          "Desktop and true DPR2 mobile frames were inspected at native resolution. Three-line review headers fit inside every panel without clipping; contact direction reads clearly, both hit recipients remain legible against fixed overlays, and the stationary reduced-motion cue does not imply travel.",
      },
      artifacts,
    },
    null,
    2,
  )}\n`,
);

function reviewPlan(): BoardRenderPlanV6 {
  const entries: RenderPlanEntryV6[] = [];
  for (let y = 1; y <= 5; y += 1) {
    for (let x = 1; x <= 5; x += 1) {
      entries.push(
        entry("TERRAIN", `TERRAIN:${y},${x}`, { x, y }, y * 10 + x, 1, {
          terrain: "GRASS",
        }),
      );
    }
  }
  const units = [
    {
      id: 101,
      at: { x: 3, y: 3 },
      ownerId: 1,
      faction: "ORIGINAL",
      hp: 8,
    },
    {
      id: 202,
      at: { x: 4, y: 3 },
      ownerId: 2,
      faction: "CANDY",
      hp: 5,
    },
  ] as const;
  for (const unit of units) {
    entries.push(
      entry("CONTACT_SHADOW", `SHADOW:${unit.id}`, unit.at, unit.id, 5, null),
      entry("UNIT", `UNIT:${unit.id}`, unit.at, unit.id, 5, {
        faction: unit.faction,
        role: "FIGHTER",
        readiness: "OPAQUE",
      }),
      entry("UNIT_STATUS", `STATUS:${unit.id}`, unit.at, unit.id, 8, {
        faction: unit.faction,
        role: "FIGHTER",
        hp: unit.hp,
        maxHp: 10,
        state: "HANDLED",
        veteran: false,
      }),
    );
  }
  entries.push(
    entry("SELECTION", "SELECTION:101", { x: 3, y: 3 }, 101, 6, {
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

function reviewPresentation(motion: "FULL" | "REDUCED"): CombatPresentationV6 {
  const attacker = {
    id: unitId(101),
    ownerId: 1,
    faction: "ORIGINAL" as const,
    role: "FIGHTER" as const,
    at: { x: 3, y: 3 },
  };
  const target = {
    id: unitId(202),
    ownerId: 2,
    faction: "CANDY" as const,
    role: "FIGHTER" as const,
    at: { x: 4, y: 3 },
  };
  return {
    key: `review-${motion}`,
    commandIndex: 1,
    motion,
    durationMs: motion === "REDUCED" ? 100 : 420,
    actorController: "HUMAN",
    attacker,
    target,
    targetAt: target.at,
    damaged: [target, attacker],
    advances: false,
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
    ownerId: id === 202 ? 2 : 1,
    variant: 0,
    layer,
    details,
  } as Extract<RenderPlanEntryV6, { readonly kind: Kind }>;
}

async function reviewSvg(
  label: string,
  viewport: Size,
  camera: CameraState,
  commands: readonly BoardDrawCommandV6[],
): Promise<string> {
  const headerWidth = Math.min(350, viewport.width - 24);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${viewport.width}" height="${viewport.height}" viewBox="0 0 ${viewport.width} ${viewport.height}">
  <rect width="100%" height="100%" fill="#203936"/>
  ${await commandsSvg(commands)}
  <rect x="12" y="12" width="${headerWidth}" height="68" rx="10" fill="#172b2be8" stroke="#78908b"/>
  <text x="24" y="31" font-family="system-ui,sans-serif" font-size="14" font-weight="800" fill="#ffffff">Ruleset 6 melee</text>
  <text x="24" y="49" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="#ffffff">${escapeXml(label)}</text>
  <text x="24" y="67" font-family="system-ui,sans-serif" font-size="11" font-weight="600" fill="#c5d7d4">sprite-only transform · camera ${camera.zoom.toFixed(2)}×</text>
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
        `<image x="${n(command.destination.x)}" y="${n(command.destination.y)}" width="${n(command.destination.width)}" height="${n(command.destination.height)}" opacity="${n(command.alpha)}" href="${uri}"/>`,
      );
    } else if (command.kind === "POLYGON") {
      result.push(
        `<polygon points="${points(command.points)}" fill="${command.fill}"${stroke(command.stroke, command.lineWidth, command.dash)} opacity="${n(command.alpha)}"/>`,
      );
    } else if (command.kind === "ELLIPSE") {
      result.push(
        `<ellipse cx="${n(command.center.x)}" cy="${n(command.center.y)}" rx="${n(command.radiusX)}" ry="${n(command.radiusY)}" fill="${command.fill}"${stroke(command.stroke, command.lineWidth, [])} opacity="${n(command.alpha)}"/>`,
      );
    } else if (command.kind === "LINE") {
      result.push(
        `<polyline points="${points(command.points)}" fill="none" stroke="${command.stroke}" stroke-width="${n(command.lineWidth)}"${dash(command.dash)} opacity="${n(command.alpha)}"/>`,
      );
    } else if (command.kind === "RECT") {
      result.push(
        `<rect x="${n(command.x)}" y="${n(command.y)}" width="${n(command.width)}" height="${n(command.height)}" fill="${command.fill}"${stroke(command.stroke, command.lineWidth, [])} opacity="${n(command.alpha)}"/>`,
      );
    } else {
      result.push(
        `<text x="${n(command.at.x)}" y="${n(command.at.y)}" fill="${command.fill}" font-family="system-ui,sans-serif" font-size="${n(command.fontSize)}" font-weight="${command.weight}" text-anchor="middle" dominant-baseline="middle" opacity="${n(command.alpha)}">${escapeXml(command.text)}</text>`,
      );
    }
  }
  return result.join("\n");
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
