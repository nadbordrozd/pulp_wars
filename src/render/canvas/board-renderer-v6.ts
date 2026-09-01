import type { FactionIdV6, UnitRoleId } from "../../engine/index";
import {
  UNIT_SCALE_CONTRACT,
  anchoredDestinationRect,
  type DestinationRect,
} from "./board-art-geometry";
import {
  chocolateWallCoverageV6,
  cityCoverageV6,
  improvementCoverageV6,
  roadCoverageV6,
  resourceCoverageV6,
  siteCoverageV6,
  terrainCoverageV6,
  unitCoverageV6,
  type AssetCoverageStatusV6,
  type AssetCoverageV6,
} from "./asset-coverage-v6";
import {
  TILE_HEIGHT,
  TILE_WIDTH,
  projectGrid,
  worldToScreen,
  type CameraState,
  type Point,
  type Size,
} from "./geometry";
import {
  compareEntriesV6,
  type BoardRenderPlanV6,
  type RenderPlanEntryV6,
} from "./render-plan-v6";
import { readinessSpriteOpacity } from "./readiness-presentation";
import type {
  CombatAnimationFrameV6,
  CombatPresentationV6,
  CombatSpriteSnapshotV6,
  CombatWallSnapshotV6,
} from "./combat-presentation-v6";

export interface Ruleset6AcceptedImageResolver {
  readonly resolve: (assetId: string) => CanvasImageSource | null;
}

export interface DrawBoardV6Options {
  readonly context: CanvasRenderingContext2D;
  readonly viewport: Size;
  readonly camera: CameraState;
  readonly plan: BoardRenderPlanV6;
  readonly devicePixelRatio: number;
  readonly images?: Ruleset6AcceptedImageResolver;
  readonly readinessElapsedMs?: number;
  readonly reducedMotion?: boolean;
  readonly combatPresentation?: CombatPresentationV6 | null;
  readonly combatFrame?: CombatAnimationFrameV6 | null;
}

export interface BuildBoardDrawListV6Options {
  readonly viewport: Size;
  readonly camera: CameraState;
  readonly plan: BoardRenderPlanV6;
  readonly readinessElapsedMs?: number;
  readonly reducedMotion?: boolean;
  readonly combatPresentation?: CombatPresentationV6 | null;
  readonly combatFrame?: CombatAnimationFrameV6 | null;
}

export interface DrawCoverageLabelV6 {
  readonly entryKey: string;
  readonly semanticId: string;
  readonly status: AssetCoverageStatusV6;
  readonly assetId: string | null;
  readonly production: boolean;
}

interface DrawCommandBaseV6 {
  readonly entryKey: string;
}

export type BoardDrawCommandV6 =
  | (DrawCommandBaseV6 & {
      readonly kind: "IMAGE";
      readonly assetId: string;
      readonly publicPath: string;
      readonly destination: DestinationRect;
      readonly alpha: number;
      readonly fallback: readonly BoardDrawCommandV6[];
    })
  | (DrawCommandBaseV6 & {
      readonly kind: "POLYGON";
      readonly points: readonly Point[];
      readonly fill: string;
      readonly stroke: string | null;
      readonly lineWidth: number;
      readonly alpha: number;
      readonly dash: readonly number[];
    })
  | (DrawCommandBaseV6 & {
      readonly kind: "ELLIPSE";
      readonly center: Point;
      readonly radiusX: number;
      readonly radiusY: number;
      readonly fill: string;
      readonly stroke: string | null;
      readonly lineWidth: number;
      readonly alpha: number;
    })
  | (DrawCommandBaseV6 & {
      readonly kind: "LINE";
      readonly points: readonly Point[];
      readonly stroke: string;
      readonly lineWidth: number;
      readonly alpha: number;
      readonly dash: readonly number[];
    })
  | (DrawCommandBaseV6 & {
      readonly kind: "RECT";
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly fill: string;
      readonly stroke: string | null;
      readonly lineWidth: number;
      readonly alpha: number;
    })
  | (DrawCommandBaseV6 & {
      readonly kind: "TEXT";
      readonly at: Point;
      readonly text: string;
      readonly fill: string;
      readonly fontSize: number;
      readonly weight: 600 | 700 | 800;
      readonly align: CanvasTextAlign;
      readonly baseline: CanvasTextBaseline;
      readonly alpha: number;
    });

export interface BoardDrawListV6 {
  readonly commands: readonly BoardDrawCommandV6[];
  readonly coverage: readonly DrawCoverageLabelV6[];
}

export interface UnitVisibleFootprintV6 {
  readonly width: number;
  readonly height: number;
  readonly rearTileOcclusionRatio: number;
  readonly scaleClass: "standard" | "siege" | "giant";
}

const PLAYER_COLORS = ["#f06762", "#28b7a4", "#e2b63f", "#a277d2"] as const;
const INK = "#19282a";
const CANDY_INK = "#4b2639";
const WORLD_BODY_LAYER_V6 = 5;

/**
 * Deterministic visible placeholder envelopes. They sit inside the calibrated
 * raster contracts and are intentionally smaller than accepted Forest and
 * Mountain bodies. Camera zoom and DPR are presentation-only multipliers.
 */
export function unitVisibleFootprintV6(
  role: UnitRoleId,
): UnitVisibleFootprintV6 {
  if (role === "BREACHER") {
    return {
      width: 68,
      height: 66,
      rearTileOcclusionRatio: 0.1,
      scaleClass: "siege",
    };
  }
  if (role === "JUGGERNAUT") {
    return {
      width: 80,
      height: 88,
      rearTileOcclusionRatio: 0.16,
      scaleClass: "giant",
    };
  }
  return {
    width: 42,
    height: 56,
    rearTileOcclusionRatio: 0.06,
    scaleClass: "standard",
  };
}

export function buildBoardDrawListV6(
  options: BuildBoardDrawListV6Options,
): BoardDrawListV6 {
  const commands: BoardDrawCommandV6[] = [];
  const coverage: DrawCoverageLabelV6[] = [];
  const factions = factionByCoordinate(options.plan);
  const cityLevels = new Map(
    options.plan.entries
      .filter(
        (
          entry,
        ): entry is Extract<
          RenderPlanEntryV6,
          { readonly kind: "CITY_STATUS" }
        > => entry.kind === "CITY_STATUS",
      )
      .map((entry) => [entry.id, entry.details.level] as const),
  );
  const entries = combatEntries(options.plan, options.combatPresentation);
  const projectileCommands = combatProjectileCommands(
    options.camera,
    options.combatPresentation,
    options.combatFrame,
  );
  const deferredFog =
    projectileCommands.length === 0
      ? []
      : entries.filter((entry) => entry.kind === "FOG");
  const renderEntries =
    deferredFog.length === 0
      ? entries
      : entries.filter((entry) => entry.kind !== "FOG");
  const drawPlanEntry = (entry: RenderPlanEntryV6): void => {
    const center = worldToScreen(projectGrid(entry.at), options.camera);
    const faction =
      factions.get(coordinateKey(entry.at)) ??
      factionFromEntry(entry) ??
      "ORIGINAL";
    drawEntry(
      commands,
      coverage,
      entry,
      center,
      options.camera.zoom,
      faction,
      cityLevels.get(entry.id) ?? 1,
      options.readinessElapsedMs ?? 0,
      options.reducedMotion ?? false,
      combatEntryStyle(
        entry,
        options.camera,
        options.combatPresentation,
        options.combatFrame,
      ),
    );
  };
  let projectileEmitted = false;
  const emitProjectileLayer = (): void => {
    commands.push(...projectileCommands);
    for (const fog of deferredFog) drawPlanEntry(fog);
    projectileEmitted = true;
  };
  for (const entry of renderEntries) {
    if (!projectileEmitted && entry.layer > WORLD_BODY_LAYER_V6) {
      emitProjectileLayer();
    }
    drawPlanEntry(entry);
  }
  if (!projectileEmitted) emitProjectileLayer();
  return { commands, coverage };
}

export function drawBoardV6(options: DrawBoardV6Options): BoardDrawListV6 {
  const { context, viewport, devicePixelRatio } = options;
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  context.clearRect(0, 0, viewport.width, viewport.height);
  context.fillStyle = "#203936";
  context.fillRect(0, 0, viewport.width, viewport.height);
  const list = buildBoardDrawListV6(options);
  for (const command of list.commands)
    executeDrawCommandV6(context, command, options.images);
  return list;
}

export function executeDrawCommandV6(
  context: CanvasRenderingContext2D,
  command: BoardDrawCommandV6,
  images?: Ruleset6AcceptedImageResolver,
): void {
  if (command.kind === "IMAGE") {
    const image = images?.resolve(command.assetId) ?? null;
    if (image === null) {
      for (const fallback of command.fallback)
        executeDrawCommandV6(context, fallback, images);
      return;
    }
    context.save();
    context.globalAlpha = command.alpha;
    context.drawImage(
      image,
      command.destination.x,
      command.destination.y,
      command.destination.width,
      command.destination.height,
    );
    context.restore();
    return;
  }
  context.save();
  context.globalAlpha = command.alpha;
  if (command.kind === "TEXT") {
    context.fillStyle = command.fill;
    context.font = `${command.weight} ${command.fontSize}px system-ui, sans-serif`;
    context.textAlign = command.align;
    context.textBaseline = command.baseline;
    context.fillText(command.text, command.at.x, command.at.y);
  } else if (command.kind === "RECT") {
    context.fillStyle = command.fill;
    context.fillRect(command.x, command.y, command.width, command.height);
    if (command.stroke !== null) {
      context.strokeStyle = command.stroke;
      context.lineWidth = command.lineWidth;
      context.strokeRect(command.x, command.y, command.width, command.height);
    }
  } else if (command.kind === "ELLIPSE") {
    context.beginPath();
    context.ellipse(
      command.center.x,
      command.center.y,
      command.radiusX,
      command.radiusY,
      0,
      0,
      Math.PI * 2,
    );
    context.fillStyle = command.fill;
    context.fill();
    if (command.stroke !== null) {
      context.strokeStyle = command.stroke;
      context.lineWidth = command.lineWidth;
      context.stroke();
    }
  } else {
    context.beginPath();
    const first = command.points[0];
    if (first !== undefined) context.moveTo(first.x, first.y);
    for (const point of command.points.slice(1))
      context.lineTo(point.x, point.y);
    context.lineJoin = "round";
    context.lineCap = "round";
    context.setLineDash([...command.dash]);
    if (command.kind === "POLYGON") {
      context.closePath();
      context.fillStyle = command.fill;
      context.fill();
      if (command.stroke !== null) {
        context.strokeStyle = command.stroke;
        context.lineWidth = command.lineWidth;
        context.stroke();
      }
    } else {
      context.strokeStyle = command.stroke;
      context.lineWidth = command.lineWidth;
      context.stroke();
    }
  }
  context.restore();
}

function drawEntry(
  commands: BoardDrawCommandV6[],
  coverage: DrawCoverageLabelV6[],
  entry: RenderPlanEntryV6,
  center: Point,
  zoom: number,
  faction: FactionIdV6,
  cityLevel: number,
  readinessElapsedMs: number,
  reducedMotion: boolean,
  combatStyle: { readonly offset: Point; readonly alpha: number } | null,
): void {
  const ownerColor = ownerColorFor(entry.ownerId);
  switch (entry.kind) {
    case "TERRAIN":
      addCoveredAsset(
        commands,
        coverage,
        entry.key,
        terrainCoverageV6("GRASS", faction, entry.variant),
        center,
        zoom,
        () => groundFallback(entry.key, center, zoom, faction, entry.variant),
      );
      return;
    case "TERRAIN_BODY":
      addCoveredAsset(
        commands,
        coverage,
        entry.key,
        terrainCoverageV6(entry.details.terrain, faction, entry.variant),
        center,
        zoom,
        () =>
          terrainBodyFallback(entry.key, center, zoom, entry.details.terrain),
      );
      return;
    case "RESOURCE":
      addCoveredAsset(
        commands,
        coverage,
        entry.key,
        resourceCoverageV6(entry.details.resource, faction),
        center,
        zoom,
        (item) =>
          badgeFallback(
            entry.key,
            center,
            zoom,
            item.status === "PLACEHOLDER"
              ? item.label
              : resourceShort(entry.details.resource),
            resourceColor(entry.details.resource),
            item.status === "PLACEHOLDER",
            -18,
          ),
      );
      return;
    case "IMPROVEMENT":
      addCoveredAsset(
        commands,
        coverage,
        entry.key,
        improvementCoverageV6(entry.details.improvement),
        center,
        zoom,
        (item) =>
          buildingFallback(
            entry.key,
            center,
            zoom,
            item.status === "PLACEHOLDER"
              ? item.label
              : entry.details.improvement,
            item.status === "PLACEHOLDER",
          ),
      );
      return;
    case "SITE":
      if (entry.details.site !== "VILLAGE") return;
      addCoveredAsset(
        commands,
        coverage,
        entry.key,
        siteCoverageV6(entry.details.site),
        center,
        zoom,
        (item) =>
          buildingFallback(entry.key, center, zoom, item.semanticId, false),
      );
      return;
    case "CITY_BACK":
      addCoveredAsset(
        commands,
        coverage,
        entry.key,
        cityCoverageV6(entry.details.faction, cityLevel),
        center,
        zoom,
        (item) =>
          cityFallback(
            entry.key,
            center,
            zoom,
            entry.details.faction,
            cityLevel,
            item.status === "PLACEHOLDER",
          ),
      );
      return;
    case "CITY_FRONT":
      return;
    case "CHOCOLATE_WALL": {
      const spriteCenter = transformedCenter(center, combatStyle);
      addCoveredAsset(
        commands,
        coverage,
        entry.key,
        chocolateWallCoverageV6(),
        spriteCenter,
        zoom,
        () => wallFallback(entry.key, spriteCenter, zoom),
        combatStyle?.alpha ?? 1,
      );
      return;
    }
    case "UNIT": {
      const spriteOpacity =
        entry.details.readiness === "PULSE"
          ? readinessSpriteOpacity(readinessElapsedMs, reducedMotion)
          : 1;
      const spriteCenter = transformedCenter(center, combatStyle);
      addCoveredAsset(
        commands,
        coverage,
        entry.key,
        unitCoverageV6(entry.details.faction, entry.details.role),
        spriteCenter,
        zoom,
        (item) =>
          unitFallback(
            entry.key,
            spriteCenter,
            zoom,
            entry.details.faction,
            entry.details.role,
            item.status === "PLACEHOLDER",
            ownerColor,
          ),
        spriteOpacity * (combatStyle?.alpha ?? 1),
      );
      return;
    }
    case "FOG":
      commands.push(...fogCommands(entry.key, center, zoom));
      return;
    case "OWNERSHIP":
      commands.push(
        diamond(entry.key, center, zoom, `${ownerColor}24`, ownerColor, 2),
      );
      return;
    case "ROAD":
      addCoveredAsset(
        commands,
        coverage,
        entry.key,
        roadCoverageV6(),
        center,
        zoom,
        () => [
          ...roadCommands(entry.key, center, zoom),
          ...placeholderMark(
            entry.key,
            center.x + 42 * zoom,
            center.y - 14 * zoom,
            zoom,
          ),
        ],
      );
      return;
    case "UNKNOWN_RESOURCE":
      // Hidden resource content has no world marker. Ordinary terrain is the
      // complete technology-safe visual projection.
      return;
    case "CONTACT_SHADOW":
      commands.push(
        ellipse(
          entry.key,
          center.x,
          center.y - 2 * zoom,
          25 * zoom,
          7 * zoom,
          "#102322",
          null,
          0,
          0.34,
        ),
      );
      return;
    case "SELECTION":
      commands.push(
        diamond(entry.key, center, zoom, "#48e9f12d", "#75f7ff", 5),
      );
      return;
    case "CITY_TERRITORY_BOUNDARY":
      commands.push(
        territoryEdge(entry.key, center, zoom, entry.details.edge, ownerColor),
      );
      return;
    case "MOVE_TARGET":
      commands.push(...targetCommands(entry.key, center, zoom, "#75e36b", "M"));
      return;
    case "ATTACK_TARGET":
      commands.push(...targetCommands(entry.key, center, zoom, "#ff6876", "!"));
      return;
    case "ROLL_TARGET":
      commands.push(...targetCommands(entry.key, center, zoom, "#ff8dc8", "↻"));
      return;
    case "HEAL_TARGET":
      commands.push(...targetCommands(entry.key, center, zoom, "#61e1b1", "+"));
      return;
    case "WALL_TARGET":
      commands.push(...targetCommands(entry.key, center, zoom, "#c78a58", "W"));
      return;
    case "ABILITY_TARGET":
      commands.push(...targetCommands(entry.key, center, zoom, "#8ad3ff", "A"));
      return;
    case "ECONOMIC_TARGET":
      commands.push(...targetCommands(entry.key, center, zoom, "#ffd85e", "C"));
      return;
    case "TRAIN_TARGET":
      commands.push(...targetCommands(entry.key, center, zoom, "#be9dff", "T"));
      return;
    case "CHOICE_TARGET":
      commands.push(...targetCommands(entry.key, center, zoom, "#fff1a1", "?"));
      return;
    case "MOVE_PATH":
      commands.push(...pathStep(entry.key, center, zoom, "#75e36b"));
      return;
    case "ROLL_PATH":
      commands.push(...pathStep(entry.key, center, zoom, "#ff8dc8"));
      return;
    case "ECONOMIC_VALUE":
      commands.push(...economicValue(entry, center, zoom));
      return;
    case "ECONOMIC_CONTRIBUTOR":
      commands.push(...economicContributor(entry, center, zoom));
      return;
    case "ECONOMIC_PAIR_AXIS":
      commands.push(...economicAxis(entry, center, zoom));
      return;
    case "UNIT_STATUS":
      commands.push(...unitStatus(entry, center, zoom, ownerColor));
      return;
    case "CHOCOLATE_WALL_STATUS":
      commands.push(
        ...healthBar(
          entry.key,
          center,
          zoom,
          entry.details.hp,
          10,
          "#b87947",
          -6,
        ),
      );
      return;
    case "CITY_STATUS":
      commands.push(...cityStatus(entry, center, zoom, ownerColor));
  }
}

function combatEntries(
  plan: BoardRenderPlanV6,
  presentation: CombatPresentationV6 | null | undefined,
): readonly RenderPlanEntryV6[] {
  if (presentation === undefined || presentation === null) return plan.entries;
  const snapshots = [presentation.attacker, presentation.target].filter(
    (sprite): sprite is CombatSpriteSnapshotV6 => sprite !== null,
  );
  const byId = new Map(snapshots.map((sprite) => [sprite.id, sprite] as const));
  const seen = new Set<number>();
  const entries = plan.entries.map((entry) => {
    if (entry.kind !== "UNIT") return entry;
    const snapshot = byId.get(entry.id as CombatSpriteSnapshotV6["id"]);
    if (snapshot === undefined) return entry;
    seen.add(entry.id);
    return combatUnitEntry(snapshot, entry.key, entry.variant);
  });
  for (const snapshot of snapshots) {
    if (!seen.has(snapshot.id)) {
      entries.push(
        combatUnitEntry(
          snapshot,
          `COMBAT_UNIT:${presentation.key}:${snapshot.id}`,
          0,
        ),
      );
    }
  }
  const wall = presentation.targetWall;
  if (
    wall !== null &&
    !entries.some(
      (entry) => entry.kind === "CHOCOLATE_WALL" && entry.id === wall.id,
    )
  ) {
    entries.push(combatWallEntry(wall, presentation.key));
  }
  return entries.sort(compareEntriesV6);
}

function combatUnitEntry(
  sprite: CombatSpriteSnapshotV6,
  key: string,
  variant: number,
): Extract<RenderPlanEntryV6, { readonly kind: "UNIT" }> {
  return {
    key,
    kind: "UNIT",
    at: sprite.at,
    id: sprite.id,
    ownerId: sprite.ownerId,
    variant,
    layer: 5,
    details: {
      faction: sprite.faction,
      role: sprite.role,
      readiness: "OPAQUE",
    },
  };
}

function combatWallEntry(
  wall: CombatWallSnapshotV6,
  presentationKey: string,
): Extract<RenderPlanEntryV6, { readonly kind: "CHOCOLATE_WALL" }> {
  return {
    key: `COMBAT_WALL:${presentationKey}:${wall.id}`,
    kind: "CHOCOLATE_WALL",
    at: wall.at,
    id: wall.id,
    ownerId: wall.ownerId,
    variant: 0,
    layer: 5,
    details: {
      faction: wall.faction,
      hp: wall.hp,
    },
  };
}

function combatEntryStyle(
  entry: RenderPlanEntryV6,
  camera: CameraState,
  presentation: CombatPresentationV6 | null | undefined,
  frame: CombatAnimationFrameV6 | null | undefined,
): { readonly offset: Point; readonly alpha: number } | null {
  if (
    (entry.kind !== "UNIT" && entry.kind !== "CHOCOLATE_WALL") ||
    presentation === undefined ||
    presentation === null ||
    frame === undefined ||
    frame === null
  ) {
    return null;
  }
  if (entry.kind === "CHOCOLATE_WALL") {
    const damaged =
      presentation.targetWall?.id === entry.id && presentation.wallDamaged;
    return {
      offset: {
        x: damaged ? frame.shake * camera.zoom : 0,
        y: 0,
      },
      alpha: damaged ? frame.damagedOpacity : 1,
    };
  }
  const damaged = presentation.damaged.some((sprite) => sprite.id === entry.id);
  const shake = damaged ? frame.shake * camera.zoom : 0;
  if (entry.id !== presentation.attacker.id) {
    return {
      offset: { x: shake, y: 0 },
      alpha: damaged ? frame.damagedOpacity : 1,
    };
  }
  const source = worldToScreen(projectGrid(presentation.attacker.at), camera);
  const target = worldToScreen(projectGrid(presentation.targetAt), camera);
  return {
    offset: {
      x: (target.x - source.x) * frame.attackerTravel + shake,
      y: (target.y - source.y) * frame.attackerTravel,
    },
    alpha: damaged ? frame.damagedOpacity : 1,
  };
}

function transformedCenter(
  center: Point,
  style: { readonly offset: Point; readonly alpha: number } | null,
): Point {
  return style === null
    ? center
    : { x: center.x + style.offset.x, y: center.y + style.offset.y };
}

function combatProjectileCommands(
  camera: CameraState,
  presentation: CombatPresentationV6 | null | undefined,
  frame: CombatAnimationFrameV6 | null | undefined,
): readonly BoardDrawCommandV6[] {
  if (
    presentation?.kind !== "RANGED" ||
    presentation.projectile === null ||
    frame === undefined ||
    frame === null ||
    frame.projectileOpacity <= 0
  ) {
    return [];
  }
  const sourceGround = worldToScreen(
    projectGrid(presentation.attacker.at),
    camera,
  );
  const targetGround = worldToScreen(
    projectGrid(presentation.targetAt),
    camera,
  );
  const from = {
    x: sourceGround.x,
    y: sourceGround.y - 36 * camera.zoom,
  };
  const to = {
    x: targetGround.x,
    y:
      targetGround.y -
      (presentation.targetWall === null ? 34 : 22) * camera.zoom,
  };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  const ux = distance === 0 ? 1 : dx / distance;
  const uy = distance === 0 ? 0 : dy / distance;
  const px = -uy;
  const py = ux;
  const tip = {
    x: from.x + dx * frame.projectileTravel,
    y: from.y + dy * frame.projectileTravel,
  };
  const key = `COMBAT_PROJECTILE:${presentation.key}`;
  if (presentation.projectile === "GUMBALL") {
    const radius = clampNumber(5.5 * camera.zoom, 4, 8);
    const trail = clampNumber(16 * camera.zoom, 10, 24);
    return [
      line(
        key,
        [
          { x: tip.x - ux * trail, y: tip.y - uy * trail },
          { x: tip.x - ux * radius, y: tip.y - uy * radius },
        ],
        "#ff91bf",
        clampNumber(3 * camera.zoom, 2, 5),
        frame.projectileOpacity * 0.72,
      ),
      ellipse(
        key,
        tip.x,
        tip.y,
        radius,
        radius,
        "#e83f8f",
        CANDY_INK,
        clampNumber(2 * camera.zoom, 1.5, 3),
        frame.projectileOpacity,
      ),
      ellipse(
        key,
        tip.x - radius * 0.28,
        tip.y - radius * 0.28,
        radius * 0.24,
        radius * 0.24,
        "#fff0f6",
        null,
        0,
        frame.projectileOpacity,
      ),
    ];
  }
  const shaftLength = clampNumber(18 * camera.zoom, 11, 28);
  const headLength = clampNumber(7 * camera.zoom, 5, 10);
  const headHalfWidth = clampNumber(4 * camera.zoom, 3, 6);
  const shaftEnd = {
    x: tip.x - ux * headLength,
    y: tip.y - uy * headLength,
  };
  return [
    line(
      key,
      [
        {
          x: shaftEnd.x - ux * shaftLength,
          y: shaftEnd.y - uy * shaftLength,
        },
        shaftEnd,
      ],
      "#f4d291",
      clampNumber(3 * camera.zoom, 2, 4.5),
      frame.projectileOpacity,
    ),
    polygon(
      key,
      [
        tip,
        {
          x: shaftEnd.x + px * headHalfWidth,
          y: shaftEnd.y + py * headHalfWidth,
        },
        {
          x: shaftEnd.x - px * headHalfWidth,
          y: shaftEnd.y - py * headHalfWidth,
        },
      ],
      "#e9edf0",
      INK,
      clampNumber(1.5 * camera.zoom, 1, 2.5),
      frame.projectileOpacity,
    ),
  ];
}

function clampNumber(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function addCoveredAsset(
  commands: BoardDrawCommandV6[],
  labels: DrawCoverageLabelV6[],
  entryKey: string,
  item: AssetCoverageV6,
  center: Point,
  zoom: number,
  fallback: (item: AssetCoverageV6) => readonly BoardDrawCommandV6[],
  alpha = 1,
): void {
  labels.push({
    entryKey,
    semanticId: item.semanticId,
    status: item.status,
    assetId: item.status === "ACCEPTED" ? item.assetId : null,
    production: item.production,
  });
  const fallbackCommands = fallback(item).map((command) =>
    withCommandAlpha(command, alpha),
  );
  if (item.status === "PLACEHOLDER") {
    commands.push(...fallbackCommands);
    return;
  }
  commands.push({
    kind: "IMAGE",
    entryKey,
    assetId: item.assetId,
    publicPath: item.publicPath,
    destination: anchoredDestinationRect(center, zoom, item.geometry),
    alpha,
    fallback: fallbackCommands,
  });
}

function withCommandAlpha(
  command: BoardDrawCommandV6,
  alpha: number,
): BoardDrawCommandV6 {
  if (command.kind === "IMAGE") {
    return {
      ...command,
      alpha: command.alpha * alpha,
      fallback: command.fallback.map((fallback) =>
        withCommandAlpha(fallback, alpha),
      ),
    };
  }
  return { ...command, alpha: command.alpha * alpha };
}

function groundFallback(
  key: string,
  center: Point,
  zoom: number,
  faction: FactionIdV6,
  variant: number,
): readonly BoardDrawCommandV6[] {
  const fill = faction === "CANDY" ? "#8fa75d" : "#79ad61";
  return [
    diamond(key, center, zoom, fill, "#28483d", 2),
    ellipse(
      key,
      center.x + ((variant % 3) - 1) * 12 * zoom,
      center.y + 8 * zoom,
      14 * zoom,
      4 * zoom,
      faction === "CANDY" ? "#df9eb0" : "#d4df79",
      null,
      0,
      0.32,
    ),
  ];
}

function terrainBodyFallback(
  key: string,
  center: Point,
  zoom: number,
  terrain: "FOREST" | "MOUNTAIN",
): readonly BoardDrawCommandV6[] {
  if (terrain === "FOREST") {
    return [-24, 0, 24].flatMap((dx) => [
      line(
        key,
        [p(center, dx - 3, -4, zoom), p(center, dx - 3, -42, zoom)],
        "#5e4a31",
        7 * zoom,
      ),
      ellipse(
        key,
        center.x + dx * zoom,
        center.y - 48 * zoom,
        20 * zoom,
        25 * zoom,
        "#3f8052",
        INK,
        3 * zoom,
      ),
    ]);
  }
  return [
    polygon(
      key,
      [
        p(center, -48, 8, zoom),
        p(center, -8, -91, zoom),
        p(center, 49, 8, zoom),
      ],
      "#858d96",
      INK,
      4 * zoom,
    ),
    polygon(
      key,
      [
        p(center, -8, -91, zoom),
        p(center, -25, -49, zoom),
        p(center, -3, -59, zoom),
        p(center, 14, -44, zoom),
      ],
      "#c4cccf",
      null,
      0,
    ),
  ];
}

function buildingFallback(
  key: string,
  center: Point,
  zoom: number,
  label: string,
  missing: boolean,
): readonly BoardDrawCommandV6[] {
  const short = label
    .replaceAll("_", " ")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 3);
  return [
    rect(
      key,
      center.x - 23 * zoom,
      center.y - 35 * zoom,
      46 * zoom,
      30 * zoom,
      "#d5aa64",
      INK,
      3 * zoom,
    ),
    polygon(
      key,
      [
        p(center, -28, -35, zoom),
        p(center, 0, -55, zoom),
        p(center, 28, -35, zoom),
      ],
      "#9d5f48",
      INK,
      3 * zoom,
    ),
    text(
      key,
      center.x,
      center.y - 20 * zoom,
      short,
      "#18272a",
      clampText(10 * zoom),
      800,
    ),
    ...(missing
      ? placeholderMark(key, center.x + 23 * zoom, center.y - 49 * zoom, zoom)
      : []),
  ];
}

function cityFallback(
  key: string,
  center: Point,
  zoom: number,
  faction: FactionIdV6,
  level: number,
  missing: boolean,
): readonly BoardDrawCommandV6[] {
  const fill = faction === "CANDY" ? "#e68dae" : "#d5aa64";
  return [
    rect(
      key,
      center.x - 38 * zoom,
      center.y - 46 * zoom,
      76 * zoom,
      40 * zoom,
      fill,
      faction === "CANDY" ? CANDY_INK : INK,
      4 * zoom,
    ),
    polygon(
      key,
      [
        p(center, -44, -46, zoom),
        p(center, 0, -76, zoom),
        p(center, 44, -46, zoom),
      ],
      faction === "CANDY" ? "#fff0c7" : "#9e6450",
      INK,
      4 * zoom,
    ),
    text(
      key,
      center.x,
      center.y - 25 * zoom,
      `L${Math.max(1, level)}`,
      INK,
      clampText(12 * zoom),
      800,
    ),
    ...(missing
      ? placeholderMark(key, center.x + 38 * zoom, center.y - 66 * zoom, zoom)
      : []),
  ];
}

function wallFallback(
  key: string,
  center: Point,
  zoom: number,
): readonly BoardDrawCommandV6[] {
  return [-1, 0, 1].map((index) =>
    rect(
      key,
      center.x + (index * 22 - 10) * zoom,
      center.y - (25 + Math.abs(index) * 3) * zoom,
      23 * zoom,
      18 * zoom,
      "#7f482d",
      "#3f241d",
      3 * zoom,
    ),
  );
}

function unitFallback(
  key: string,
  center: Point,
  zoom: number,
  faction: FactionIdV6,
  role: UnitRoleId,
  missing: boolean,
  ownerColor: string,
): readonly BoardDrawCommandV6[] {
  const footprint = unitVisibleFootprintV6(role);
  const width = footprint.width * zoom;
  const height = footprint.height * zoom;
  const bodyBottom = center.y - 6 * zoom;
  const bodyTop = bodyBottom - height;
  const outline = faction === "CANDY" ? CANDY_INK : INK;
  const body = faction === "CANDY" ? "#e78dac" : "#e1bd76";
  const commands: BoardDrawCommandV6[] = [
    ellipse(
      key,
      center.x,
      bodyTop + width * 0.26,
      width * 0.23,
      width * 0.23,
      body,
      outline,
      3 * zoom,
    ),
    polygon(
      key,
      [
        { x: center.x - width * 0.32, y: bodyBottom - height * 0.55 },
        { x: center.x + width * 0.32, y: bodyBottom - height * 0.55 },
        { x: center.x + width * 0.42, y: bodyBottom },
        { x: center.x - width * 0.42, y: bodyBottom },
      ],
      body,
      outline,
      3 * zoom,
    ),
    line(
      key,
      [
        { x: center.x - width * 0.2, y: bodyBottom },
        { x: center.x - width * 0.29, y: center.y + 3 * zoom },
      ],
      outline,
      4 * zoom,
    ),
    line(
      key,
      [
        { x: center.x + width * 0.2, y: bodyBottom },
        { x: center.x + width * 0.29, y: center.y + 3 * zoom },
      ],
      outline,
      4 * zoom,
    ),
    ellipse(
      key,
      center.x + width * 0.33,
      bodyTop + height * 0.58,
      width * 0.13,
      width * 0.13,
      ownerColor,
      outline,
      2 * zoom,
    ),
  ];
  if (role === "BREACHER") {
    commands.push(
      line(
        key,
        [p(center, -28, -26, zoom), p(center, 31, -53, zoom)],
        "#6f503b",
        8 * zoom,
      ),
      ellipse(
        key,
        center.x + 31 * zoom,
        center.y - 53 * zoom,
        10 * zoom,
        10 * zoom,
        "#40342f",
        INK,
        2 * zoom,
      ),
    );
  } else if (role === "JUGGERNAUT") {
    commands.push(
      polygon(
        key,
        [
          p(center, -38, -29, zoom),
          p(center, 0, -54, zoom),
          p(center, 38, -29, zoom),
          p(center, 0, -10, zoom),
        ],
        ownerColor,
        outline,
        3 * zoom,
      ),
    );
  } else {
    commands.push(
      text(
        key,
        center.x,
        bodyTop + height * 0.58,
        role.slice(0, 1),
        outline,
        clampText(10 * zoom),
        800,
      ),
    );
  }
  if (missing)
    commands.push(
      ...placeholderMark(
        key,
        center.x + width * 0.42,
        bodyTop + 2 * zoom,
        zoom,
      ),
    );
  return commands;
}

function fogCommands(
  key: string,
  center: Point,
  zoom: number,
): readonly BoardDrawCommandV6[] {
  return [
    diamond(key, center, zoom, "#263638", "#18282b", 2),
    line(
      key,
      [p(center, -38, 8, zoom), p(center, -4, -20, zoom)],
      "#5c6b6c",
      4 * zoom,
      0.45,
      [5 * zoom, 6 * zoom],
    ),
    line(
      key,
      [p(center, 0, 20, zoom), p(center, 35, -8, zoom)],
      "#5c6b6c",
      4 * zoom,
      0.45,
      [5 * zoom, 6 * zoom],
    ),
  ];
}

function roadCommands(
  key: string,
  center: Point,
  zoom: number,
): readonly BoardDrawCommandV6[] {
  return [
    line(
      key,
      [
        p(center, -45, 0, zoom),
        p(center, 0, -25, zoom),
        p(center, 45, 0, zoom),
      ],
      "#3d3129",
      9 * zoom,
    ),
    line(
      key,
      [
        p(center, -45, 0, zoom),
        p(center, 0, -25, zoom),
        p(center, 45, 0, zoom),
      ],
      "#c9a36a",
      5 * zoom,
    ),
  ];
}

function targetCommands(
  key: string,
  center: Point,
  zoom: number,
  color: string,
  label: string,
): readonly BoardDrawCommandV6[] {
  return [
    diamond(key, center, zoom, `${color}28`, color, 4, [7 * zoom, 4 * zoom]),
    ellipse(
      key,
      center.x,
      center.y - 2 * zoom,
      11 * zoom,
      11 * zoom,
      "#172627",
      color,
      2 * zoom,
      0.94,
    ),
    text(
      key,
      center.x,
      center.y - 2 * zoom,
      label,
      "#ffffff",
      clampText(11 * zoom),
      800,
    ),
  ];
}

function pathStep(
  key: string,
  center: Point,
  zoom: number,
  color: string,
): readonly BoardDrawCommandV6[] {
  return [
    ellipse(
      key,
      center.x,
      center.y,
      5 * zoom,
      5 * zoom,
      color,
      INK,
      1.5 * zoom,
    ),
  ];
}

function economicValue(
  entry: Extract<RenderPlanEntryV6, { readonly kind: "ECONOMIC_VALUE" }>,
  center: Point,
  zoom: number,
): readonly BoardDrawCommandV6[] {
  const detail = entry.details;
  const recurring = detail.coinIncomeDeltaByCity.reduce(
    (sum, item) => sum + item.delta,
    0,
  );
  return [
    rect(
      entry.key,
      center.x - 35 * zoom,
      center.y + 11 * zoom,
      70 * zoom,
      18 * zoom,
      "#142c2be8",
      "#ffd85e",
      2 * zoom,
    ),
    text(
      entry.key,
      center.x,
      center.y + 20 * zoom,
      `−${detail.cost} ◉  +${detail.resultingContribution}P${recurring === 0 ? "" : ` +${recurring}C`}`,
      "#fff3b5",
      clampText(9 * zoom),
      700,
    ),
  ];
}

function economicContributor(
  entry: Extract<RenderPlanEntryV6, { readonly kind: "ECONOMIC_CONTRIBUTOR" }>,
  center: Point,
  zoom: number,
): readonly BoardDrawCommandV6[] {
  return [
    diamond(entry.key, center, zoom, "transparent", "#ffd85e", 3, [
      5 * zoom,
      3 * zoom,
    ]),
    ellipse(
      entry.key,
      center.x - 31 * zoom,
      center.y - 9 * zoom,
      10 * zoom,
      10 * zoom,
      "#ffd85e",
      INK,
      2 * zoom,
    ),
    text(
      entry.key,
      center.x - 31 * zoom,
      center.y - 9 * zoom,
      String(entry.details.ordinal + 1),
      INK,
      clampText(9 * zoom),
      800,
    ),
  ];
}

function economicAxis(
  entry: Extract<RenderPlanEntryV6, { readonly kind: "ECONOMIC_PAIR_AXIS" }>,
  center: Point,
  zoom: number,
): readonly BoardDrawCommandV6[] {
  const vectors: Readonly<
    Record<typeof entry.details.axis, readonly [Point, Point]>
  > = {
    NORTH_SOUTH: [
      { x: 0, y: -31 },
      { x: 0, y: 31 },
    ],
    EAST_WEST: [
      { x: -54, y: 0 },
      { x: 54, y: 0 },
    ],
    NORTHEAST_SOUTHWEST: [
      { x: 39, y: -22 },
      { x: -39, y: 22 },
    ],
    NORTHWEST_SOUTHEAST: [
      { x: -39, y: -22 },
      { x: 39, y: 22 },
    ],
  };
  const [from, to] = vectors[entry.details.axis];
  return [
    line(
      entry.key,
      [p(center, from.x, from.y, zoom), p(center, to.x, to.y, zoom)],
      "#ffe873",
      4 * zoom,
      0.85,
      [6 * zoom, 3 * zoom],
    ),
  ];
}

function unitStatus(
  entry: Extract<RenderPlanEntryV6, { readonly kind: "UNIT_STATUS" }>,
  center: Point,
  zoom: number,
  ownerColor: string,
): readonly BoardDrawCommandV6[] {
  const footprint = unitVisibleFootprintV6(entry.details.role);
  const top = center.y - footprint.height * zoom - 13 * zoom;
  const result = [
    ...healthBar(
      entry.key,
      center,
      zoom,
      entry.details.hp,
      entry.details.maxHp,
      ownerColor,
      top - center.y,
    ),
  ];
  if (entry.details.veteran)
    result.push(
      text(
        entry.key,
        center.x + 27 * zoom,
        top + 3 * zoom,
        "◆",
        "#ffe071",
        clampText(10 * zoom),
        800,
      ),
    );
  if (entry.details.state === "HANDLED")
    result.push(
      text(
        entry.key,
        center.x - 28 * zoom,
        top + 3 * zoom,
        "✓",
        "#d3e6e5",
        clampText(10 * zoom),
        800,
      ),
    );
  return result;
}

function cityStatus(
  entry: Extract<RenderPlanEntryV6, { readonly kind: "CITY_STATUS" }>,
  center: Point,
  zoom: number,
  ownerColor: string,
): readonly BoardDrawCommandV6[] {
  const layer = entry.details.populationLayer;
  const squareSize = Math.max(3, Math.min(6, 5 * zoom));
  const gap = Math.max(1, Math.min(2, zoom));
  const columns = Math.min(12, layer.required);
  const rows = Math.ceil(layer.required / columns);
  const squaresWidth = columns * squareSize + (columns - 1) * gap;
  const badgeWidth = Math.max(42 * zoom, squaresWidth + 10);
  const rowHeight = squareSize + gap;
  const badgeHeight = 18 * zoom + rows * rowHeight + 5;
  const badgeX = center.x - badgeWidth / 2;
  const badgeY = center.y + 27 * zoom;
  const commands: BoardDrawCommandV6[] = [
    rect(
      entry.key,
      badgeX,
      badgeY,
      badgeWidth,
      badgeHeight,
      "#142625e8",
      ownerColor,
      Math.max(1, 2 * zoom),
    ),
    text(
      entry.key,
      center.x,
      badgeY + 9 * zoom,
      `${entry.details.isCapital ? "♛ " : ""}L${entry.details.level}`,
      "#ffffff",
      clampText(9 * zoom),
      700,
    ),
  ];
  const firstRowCount = Math.min(columns, layer.required);
  const firstRowWidth =
    firstRowCount * squareSize + Math.max(0, firstRowCount - 1) * gap;
  const startX = center.x - firstRowWidth / 2;
  const startY = badgeY + 15 * zoom;
  layer.squares.forEach((state, index) => {
    const row = Math.floor(index / columns);
    const rowCount = Math.min(columns, layer.required - row * columns);
    const rowWidth = rowCount * squareSize + Math.max(0, rowCount - 1) * gap;
    const rowX = row === 0 ? startX : center.x - rowWidth / 2;
    const x = rowX + (index % columns) * (squareSize + gap);
    const y = startY + row * rowHeight;
    commands.push(
      rect(
        `${entry.key}:population-square:${index}`,
        x,
        y,
        squareSize,
        squareSize,
        state === "FILLED"
          ? "#ffd85e"
          : state === "DEFICIT"
            ? "#ff6b6b"
            : "#203331",
        state === "DEFICIT" ? "#ffd0cc" : "#d3e6e5",
        Math.max(0.75, zoom),
      ),
    );
  });
  return commands;
}

function healthBar(
  key: string,
  center: Point,
  zoom: number,
  hp: number,
  maxHp: number,
  color: string,
  offsetY: number,
): readonly BoardDrawCommandV6[] {
  const width = Math.max(29, Math.min(46, 42 * zoom));
  const height = Math.max(5, Math.min(8, 6 * zoom));
  const x = center.x - width / 2;
  const y = center.y + offsetY;
  return [
    rect(key, x - 2, y - 2, width + 4, height + 4, "#142322", "#e8f0ed", 1),
    rect(
      key,
      x,
      y,
      width * Math.max(0, Math.min(1, hp / Math.max(1, maxHp))),
      height,
      color,
      null,
      0,
    ),
  ];
}

function badgeFallback(
  key: string,
  center: Point,
  zoom: number,
  label: string,
  color: string,
  missing: boolean,
  offsetY: number,
): readonly BoardDrawCommandV6[] {
  const radius = 17 * zoom;
  const y = center.y + offsetY * zoom;
  return [
    ellipse(key, center.x, y, radius, radius * 0.72, color, INK, 3 * zoom),
    text(
      key,
      center.x,
      y,
      label.slice(0, 4),
      "#152324",
      clampText(8 * zoom),
      800,
    ),
    ...(missing
      ? placeholderMark(key, center.x + radius * 0.75, y - radius * 0.7, zoom)
      : []),
  ];
}

function placeholderMark(
  key: string,
  x: number,
  y: number,
  zoom: number,
): readonly BoardDrawCommandV6[] {
  const size = Math.max(9, 12 * zoom);
  return [
    rect(
      key,
      x - size / 2,
      y - size / 2,
      size,
      size,
      "#ffdf62",
      "#372d1e",
      1.5,
    ),
    text(key, x, y, "P", "#372d1e", Math.max(7, 8 * zoom), 800),
  ];
}

function territoryEdge(
  key: string,
  center: Point,
  zoom: number,
  edge: "NORTH_WEST" | "NORTH_EAST" | "SOUTH_EAST" | "SOUTH_WEST",
  color: string,
): BoardDrawCommandV6 {
  const vertices = diamondPoints(center, zoom);
  const indexes: Readonly<Record<typeof edge, readonly [number, number]>> = {
    NORTH_WEST: [0, 1],
    NORTH_EAST: [1, 2],
    SOUTH_EAST: [2, 3],
    SOUTH_WEST: [3, 0],
  };
  const [start, end] = indexes[edge];
  return line(
    key,
    [vertices[start] ?? center, vertices[end] ?? center],
    color,
    Math.max(4, 6 * zoom),
  );
}

function diamond(
  key: string,
  center: Point,
  zoom: number,
  fill: string,
  stroke: string,
  lineWidth: number,
  dash: readonly number[] = [],
): BoardDrawCommandV6 {
  return polygon(
    key,
    diamondPoints(center, zoom),
    fill,
    stroke,
    Math.max(1, lineWidth * zoom),
    1,
    dash,
  );
}

function diamondPoints(center: Point, zoom: number): readonly Point[] {
  return [
    { x: center.x - (TILE_WIDTH / 2) * zoom, y: center.y },
    { x: center.x, y: center.y - (TILE_HEIGHT / 2) * zoom },
    { x: center.x + (TILE_WIDTH / 2) * zoom, y: center.y },
    { x: center.x, y: center.y + (TILE_HEIGHT / 2) * zoom },
  ];
}

function polygon(
  entryKey: string,
  points: readonly Point[],
  fill: string,
  stroke: string | null,
  lineWidth: number,
  alpha = 1,
  dash: readonly number[] = [],
): BoardDrawCommandV6 {
  return {
    kind: "POLYGON",
    entryKey,
    points,
    fill,
    stroke,
    lineWidth,
    alpha,
    dash,
  };
}

function ellipse(
  entryKey: string,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  fill: string,
  stroke: string | null,
  lineWidth: number,
  alpha = 1,
): BoardDrawCommandV6 {
  return {
    kind: "ELLIPSE",
    entryKey,
    center: { x, y },
    radiusX,
    radiusY,
    fill,
    stroke,
    lineWidth,
    alpha,
  };
}

function line(
  entryKey: string,
  points: readonly Point[],
  stroke: string,
  lineWidth: number,
  alpha = 1,
  dash: readonly number[] = [],
): BoardDrawCommandV6 {
  return { kind: "LINE", entryKey, points, stroke, lineWidth, alpha, dash };
}

function rect(
  entryKey: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  stroke: string | null,
  lineWidth: number,
  alpha = 1,
): BoardDrawCommandV6 {
  return {
    kind: "RECT",
    entryKey,
    x,
    y,
    width,
    height,
    fill,
    stroke,
    lineWidth,
    alpha,
  };
}

function text(
  entryKey: string,
  x: number,
  y: number,
  value: string,
  fill: string,
  fontSize: number,
  weight: 600 | 700 | 800,
): BoardDrawCommandV6 {
  return {
    kind: "TEXT",
    entryKey,
    at: { x, y },
    text: value,
    fill,
    fontSize,
    weight,
    align: "center",
    baseline: "middle",
    alpha: 1,
  };
}

function p(center: Point, x: number, y: number, zoom: number): Point {
  return { x: center.x + x * zoom, y: center.y + y * zoom };
}

function factionByCoordinate(
  plan: BoardRenderPlanV6,
): ReadonlyMap<string, FactionIdV6> {
  const result = new Map<string, FactionIdV6>();
  for (const entry of plan.entries) {
    const faction = factionFromEntry(entry);
    if (faction !== null) result.set(coordinateKey(entry.at), faction);
  }
  return result;
}

function factionFromEntry(entry: RenderPlanEntryV6): FactionIdV6 | null {
  switch (entry.kind) {
    case "OWNERSHIP":
    case "CHOCOLATE_WALL":
    case "CITY_BACK":
    case "CITY_FRONT":
    case "UNIT":
    case "UNIT_STATUS":
    case "CITY_STATUS":
      return entry.details.faction;
    default:
      return null;
  }
}

function coordinateKey(at: { readonly x: number; readonly y: number }): string {
  return `${at.x},${at.y}`;
}

function ownerColorFor(ownerId: number | null): string {
  if (ownerId === null) return "#9eaeac";
  return (
    PLAYER_COLORS[positiveModulo(ownerId - 1, PLAYER_COLORS.length)] ??
    PLAYER_COLORS[0]
  );
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function resourceShort(
  resource: "FRUIT" | "GAME" | "FERTILE_GROUND" | "ORE" | "STONE",
): string {
  return resource === "FERTILE_GROUND" ? "FERT" : resource;
}

function resourceColor(
  resource: "FRUIT" | "GAME" | "FERTILE_GROUND" | "ORE" | "STONE",
): string {
  const colors = {
    FRUIT: "#f56d65",
    GAME: "#b7784a",
    FERTILE_GROUND: "#a4c95d",
    ORE: "#ffd957",
    STONE: "#9da7ad",
  } as const;
  return colors[resource];
}

function clampText(value: number): number {
  return Math.max(7, Math.min(17, value));
}

export function unitScaleContractForRoleV6(role: UnitRoleId) {
  return role === "BREACHER"
    ? UNIT_SCALE_CONTRACT.siege
    : role === "JUGGERNAUT"
      ? UNIT_SCALE_CONTRACT.giant
      : UNIT_SCALE_CONTRACT.standard;
}
