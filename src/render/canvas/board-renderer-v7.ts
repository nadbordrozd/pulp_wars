import { ACCEPTED_ART_URLS } from "../../assets/generated-art-manifest";
import {
  RULESET7_IMPROVEMENT_ART_IDS,
  RULESET7_RESOURCE_ART_IDS,
  RULESET7_UNIT_ART_IDS,
} from "../../assets/ruleset7-ui-art";
import type { CommandV7, CoordV7, PlayerViewV7 } from "../../engine/index";
import { queryCombatPreviewV7 } from "../../engine/index";
import {
  RULESET6_UNIT_ART_GEOMETRY,
  SETTLEMENT_ART_GEOMETRY,
  SQUARE_ART_GEOMETRY,
  anchoredDestinationRect,
  cityArtLevel,
  type SourceGeometry,
} from "./board-art-geometry";
import { drawRegisteredImageGlow } from "./board-renderer-v6";
import {
  TILE_HEIGHT,
  TILE_WIDTH,
  type CameraState,
  type Size,
} from "./geometry";
import { readinessUnitStyleV6 } from "./readiness-presentation";
import { selectionJumpOffsetCssPx } from "./selection-jump-presentation";
import { RULESET7_TACTICAL_UI_SYMBOL_BY_ID } from "../../assets/ruleset7-tactical-ui-symbols";
import {
  blackoutTargetsV7,
  defectionLinksV7,
  defectionTargetsV7,
  pursuitPresentationV7,
  tacticalAttachmentsV7,
  playerLabelV7,
  type TacticalTargetModeV7,
} from "../tactical-presentation-v7";

export type BoardSelectionV7 =
  | { readonly kind: "TILE"; readonly at: CoordV7 }
  | { readonly kind: "UNIT"; readonly unitId: number }
  | { readonly kind: "CITY"; readonly cityId: number };

export interface BoardRenderInteractionV7 {
  readonly selection: BoardSelectionV7 | null;
  readonly selectedUnitId: number | null;
  readonly selectedAchievement: "ENGINEER" | "MUSTER" | null;
  readonly cursor?: CoordV7 | null;
  readonly tacticalTargetMode?: TacticalTargetModeV7 | null;
}

export interface MapCommandTargetV7 {
  readonly at: CoordV7;
  readonly command: CommandV7;
  readonly family:
    "MOVE" | "ATTACK" | "PURSUIT" | "MONUMENT" | "DEFECTION" | "BLACKOUT";
  readonly previewLabel?: string;
  readonly semanticLabel?: string;
}

export interface BoardRenderPlanEntryV7 {
  readonly key: string;
  readonly layer: number;
  readonly at: CoordV7;
  readonly kind:
    | "FOG"
    | "TERRAIN"
    | "ROAD"
    | "RESOURCE"
    | "IMPROVEMENT"
    | "SITE"
    | "TREASURE"
    | "CITY"
    | "UNIT"
    | "VALUE"
    | "TARGET"
    | "REACH"
    | "STATUS"
    | "LINK"
    | "SELECTION"
    | "CURSOR";
  readonly assetId?: string;
  readonly label?: string;
  readonly ownerId?: number | null;
  readonly hp?: number;
  readonly maxHp?: number;
  readonly value?: number;
  readonly target?: MapCommandTargetV7;
  readonly population?: number;
  readonly ready?: boolean;
  readonly ownerColor?: string;
  readonly ownerSeat?: number;
  readonly statusId?: string;
  readonly pulse?: boolean;
  readonly linkTo?: CoordV7;
  readonly attachmentSlot?: number;
}

export interface BoardRenderPlanV7 {
  readonly version: 7;
  readonly entries: readonly BoardRenderPlanEntryV7[];
  readonly targets: readonly MapCommandTargetV7[];
}

const PLAYER_COLORS = {
  CORAL: "#f06762",
  TEAL: "#28b7a4",
  GOLD: "#e2b63f",
  VIOLET: "#a277d2",
} as const;

export function buildBoardRenderPlanV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  interaction: BoardRenderInteractionV7,
): BoardRenderPlanV7 {
  const entries: BoardRenderPlanEntryV7[] = [];
  for (const tile of view.board.tiles) {
    if (!tile.explored) {
      entries.push({
        key: `fog:${tile.at.x},${tile.at.y}`,
        kind: "FOG",
        layer: 0,
        at: tile.at,
      });
      continue;
    }
    entries.push({
      key: `terrain:${tile.at.x},${tile.at.y}`,
      kind: "TERRAIN",
      layer: 1,
      at: tile.at,
      assetId:
        tile.terrain === "GRASS"
          ? `terrain-square-original-grass-${variant(tile.at, 4)}`
          : tile.terrain === "FOREST"
            ? `terrain-square-original-forest-${variant(tile.at, 4)}`
            : `terrain-square-original-mountain-${variant(tile.at, 3)}`,
      ownerId: tile.territoryOwnerId,
      ...ownerPresentation(view, tile.territoryOwnerId),
    });
    if (tile.road)
      entries.push({
        key: `road:${tile.at.x},${tile.at.y}`,
        kind: "ROAD",
        layer: 2,
        at: tile.at,
        assetId: roadAssetId(view, tile.at),
      });
    if (tile.resource !== null && tile.resource !== "UNKNOWN_RESOURCE")
      entries.push({
        key: `resource:${tile.at.x},${tile.at.y}`,
        kind: "RESOURCE",
        layer: 3,
        at: tile.at,
        assetId: RULESET7_RESOURCE_ART_IDS[tile.resource],
      });
    if (tile.improvement !== null)
      entries.push({
        key: `improvement:${tile.at.x},${tile.at.y}`,
        kind: "IMPROVEMENT",
        layer: 4,
        at: tile.at,
        assetId: RULESET7_IMPROVEMENT_ART_IDS[tile.improvement],
        label: title(tile.improvement),
      });
    if (tile.site === "VILLAGE")
      entries.push({
        key: `site:${tile.at.x},${tile.at.y}`,
        kind: "SITE",
        layer: 4,
        at: tile.at,
        assetId: "building-village",
        label: "Village",
      });
  }
  for (const city of view.cities)
    entries.push({
      key: `city:${city.id}`,
      kind: "CITY",
      layer: 4,
      at: city.at,
      ownerId: city.ownerId,
      ...ownerPresentation(view, city.ownerId),
      label: `${city.isCapital ? "Capital" : "City"} ${city.id}`,
      value: city.level,
      population: city.population,
      assetId: `building-city-${cityArtLevel(city.level)}`,
    });
  for (const at of view.treasureChests)
    entries.push({
      key: `treasure:${at.x},${at.y}`,
      kind: "TREASURE",
      layer: 4,
      at,
      assetId: "building-treasure-chest",
      label: "Treasure",
    });
  for (const unit of view.units)
    entries.push({
      key: `unit:${unit.id}`,
      kind: "UNIT",
      layer: 5,
      at: unit.at,
      ownerId: unit.ownerId,
      ...ownerPresentation(view, unit.ownerId),
      hp: unit.hp,
      maxHp: unit.maxHp,
      assetId: RULESET7_UNIT_ART_IDS[unit.role],
      label: title(unit.role),
      ready:
        unit.ownerId === view.viewer.id &&
        !unit.activation.handled &&
        commands.some(
          (command) => command.kind === "MOVE" && command.unitId === unit.id,
        ),
    });
  for (const value of view.improvementValues)
    entries.push({
      key: `value:${value.at.x},${value.at.y}`,
      kind: "VALUE",
      layer: 6,
      at: value.at,
      value: value.level,
      label: value.measure,
    });
  for (const link of defectionLinksV7(view))
    entries.push({
      key: link.key,
      kind: "LINK",
      layer: 6,
      at: link.from,
      linkTo: link.to,
      label: link.phase,
    });
  const attachmentSlots = new Map<string, number>();
  for (const attachment of tacticalAttachmentsV7(view)) {
    const coordKey = `${attachment.at.x},${attachment.at.y}`;
    const slot = attachmentSlots.get(coordKey) ?? 0;
    attachmentSlots.set(coordKey, slot + 1);
    entries.push({
      key: attachment.key,
      kind: "STATUS",
      layer: 6,
      at: attachment.at,
      statusId: attachment.symbolId,
      label: attachment.label,
      pulse: attachment.pulse,
      attachmentSlot: slot,
    });
  }
  const pursuit = pursuitPresentationV7(view, commands);
  if (pursuit !== null && interaction.selectedUnitId === pursuit.unitId)
    for (const unitId of pursuit.laterTargetUnitIds) {
      const target = view.units.find((unit) => unit.id === unitId);
      if (target !== undefined)
        entries.push({
          key: `pursuit-reach:${unitId}`,
          kind: "REACH",
          layer: 7,
          at: target.at,
          label: "Reachable after a canonical Pursue path",
        });
    }
  const targets = dedupeMapTargets(
    mapTargets(
      view,
      commands,
      interaction.selectedUnitId,
      interaction.selectedAchievement,
      interaction.tacticalTargetMode ?? null,
    ),
  );
  const focusedPursuit = targets.find(
    (target) =>
      target.family === "PURSUIT" &&
      target.command.kind === "PURSUE" &&
      interaction.cursor !== null &&
      interaction.cursor !== undefined &&
      same(target.at, interaction.cursor),
  );
  if (focusedPursuit?.command.kind === "PURSUE")
    for (const [index, at] of focusedPursuit.command.path.entries()) {
      if (index === focusedPursuit.command.path.length - 1) continue;
      entries.push({
        key: `pursuit-path:${focusedPursuit.command.unitId}:${index}:${at.x},${at.y}`,
        kind: "REACH",
        layer: 8,
        at,
        label: `Pursue step ${index + 1} of ${focusedPursuit.command.path.length}`,
      });
    }
  for (const target of targets)
    entries.push({
      key: `target:${target.family}:${target.at.x},${target.at.y}`,
      kind: "TARGET",
      layer: 7,
      at: target.at,
      target,
    });
  const selectedAt = selectionCoord(view, interaction.selection);
  if (selectedAt !== null)
    entries.push({
      key: `selection:${selectedAt.x},${selectedAt.y}`,
      kind: "SELECTION",
      layer: 8,
      at: selectedAt,
    });
  if (interaction.cursor !== undefined && interaction.cursor !== null)
    entries.push({
      key: `cursor:${interaction.cursor.x},${interaction.cursor.y}`,
      kind: "CURSOR",
      layer: 9,
      at: interaction.cursor,
    });
  entries.sort(
    (a, b) =>
      a.at.y - b.at.y ||
      a.at.x - b.at.x ||
      a.layer - b.layer ||
      a.key.localeCompare(b.key),
  );
  return { version: 7, entries, targets };
}

export interface BoardImageResolverV7 {
  resolve(assetId: string): CanvasImageSource | null;
}

export function drawBoardV7(input: {
  readonly context: CanvasRenderingContext2D;
  readonly viewport: Size;
  readonly devicePixelRatio: number;
  readonly camera: CameraState;
  readonly plan: BoardRenderPlanV7;
  readonly images: BoardImageResolverV7;
  readonly readinessElapsedMs?: number;
  readonly reducedMotion?: boolean;
  readonly highContrast?: boolean;
  readonly selectionJump?: {
    readonly unitId: number;
    readonly elapsedMs: number;
    readonly speed: "NORMAL" | "FAST";
  } | null;
  readonly clear?: boolean;
  readonly sceneAlpha?: number;
  readonly impact?: {
    readonly at: CoordV7;
    readonly shakeCssPx: number;
    readonly flashAlpha: number;
  } | null;
  readonly statusPulse?: {
    readonly at: CoordV7;
    readonly progress: number;
    readonly statusId: string;
  } | null;
}): void {
  const { context, viewport, devicePixelRatio, camera } = input;
  const sceneAlpha = input.sceneAlpha ?? 1;
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  if (input.clear !== false) {
    context.clearRect(0, 0, viewport.width, viewport.height);
    context.fillStyle = "#173632";
    context.fillRect(0, 0, viewport.width, viewport.height);
  }
  context.save();
  context.globalAlpha = sceneAlpha;
  for (const entry of input.plan.entries) {
    if (entry.kind === "LINK") continue;
    const impacted =
      input.impact !== null &&
      input.impact !== undefined &&
      (entry.kind === "UNIT" || entry.kind === "CITY") &&
      same(entry.at, input.impact.at);
    const x =
      camera.offsetX +
      entry.at.x * TILE_WIDTH * camera.zoom +
      (impacted ? (input.impact?.shakeCssPx ?? 0) : 0) * camera.zoom;
    const y = camera.offsetY + entry.at.y * TILE_HEIGHT * camera.zoom;
    const size = TILE_WIDTH * camera.zoom;
    const left = x - size / 2;
    const top = y - size / 2;
    if (entry.kind === "FOG") {
      context.fillStyle = "#1c2a2e";
      context.fillRect(left, top, size, size);
      context.strokeStyle = "#33464b";
      context.strokeRect(left, top, size, size);
      continue;
    }
    if (entry.kind === "TERRAIN") {
      context.fillStyle =
        entry.ownerColor === undefined ? "#65965b" : `${entry.ownerColor}55`;
      context.fillRect(left, top, size, size);
    }
    if (
      entry.kind === "TARGET" ||
      entry.kind === "REACH" ||
      entry.kind === "SELECTION" ||
      entry.kind === "CURSOR"
    ) {
      context.save();
      context.lineWidth =
        (entry.kind === "SELECTION"
          ? 5
          : entry.kind === "CURSOR"
            ? 3
            : entry.kind === "REACH"
              ? 2
              : 4) * camera.zoom;
      context.strokeStyle =
        entry.kind === "SELECTION"
          ? "#fff6b0"
          : entry.kind === "CURSOR"
            ? "#ffffff"
            : entry.kind === "REACH"
              ? "#ffd34e"
              : entry.target?.family === "ATTACK"
                ? "#ff655f"
                : entry.target?.family === "DEFECTION"
                  ? "#ffd34e"
                  : entry.target?.family === "BLACKOUT"
                    ? "#da8fff"
                    : "#64e6cf";
      context.setLineDash(
        entry.kind === "TARGET" || entry.kind === "REACH"
          ? [9 * camera.zoom, 5 * camera.zoom]
          : entry.kind === "CURSOR"
            ? [3 * camera.zoom, 3 * camera.zoom]
            : [],
      );
      context.strokeRect(
        left + 4 * camera.zoom,
        top + 4 * camera.zoom,
        size - 8 * camera.zoom,
        size - 8 * camera.zoom,
      );
      if (entry.target?.previewLabel !== undefined) {
        context.setLineDash([]);
        context.fillStyle = "#171722dd";
        context.fillRect(
          x - 45 * camera.zoom,
          y + 39 * camera.zoom,
          90 * camera.zoom,
          18 * camera.zoom,
        );
        context.fillStyle = "#fff8df";
        context.font = `${700} ${10 * camera.zoom}px system-ui`;
        context.textAlign = "center";
        context.fillText(entry.target.previewLabel, x, y + 52 * camera.zoom);
      }
      context.restore();
      continue;
    }
    if (entry.kind === "STATUS") {
      const pulse =
        input.statusPulse !== null &&
        input.statusPulse !== undefined &&
        same(entry.at, input.statusPulse.at) &&
        entry.statusId === input.statusPulse.statusId &&
        !(input.reducedMotion ?? false)
          ? 1 + 0.22 * Math.sin(input.statusPulse.progress * Math.PI)
          : 1;
      const symbolSize = 22 * camera.zoom * pulse;
      const slot = entry.attachmentSlot ?? 0;
      const statusX = x + (30 - slot * 24) * camera.zoom;
      const statusY = y - 39 * camera.zoom;
      context.save();
      drawTacticalSymbolOnCanvas(
        context,
        entry.statusId,
        statusX - symbolSize / 2,
        statusY - symbolSize / 2,
        symbolSize,
        input.highContrast ?? false,
      );
      context.restore();
      continue;
    }
    if (entry.assetId !== undefined) {
      const image = input.images.resolve(entry.assetId);
      if (image !== null) {
        let rect = anchoredDestinationRect(
          { x, y },
          camera.zoom,
          geometryFor(entry),
        );
        let alpha = 1;
        if (entry.kind === "UNIT") {
          const readiness = entry.ready
            ? readinessUnitStyleV6(
                input.readinessElapsedMs ?? 0,
                input.reducedMotion ?? false,
                input.highContrast ?? false,
              )
            : null;
          const scale = readiness?.scale ?? 1;
          const jump =
            input.selectionJump?.unitId === Number(entry.key.slice(5))
              ? selectionJumpOffsetCssPx(
                  input.selectionJump.elapsedMs,
                  input.selectionJump.speed,
                  input.reducedMotion ?? false,
                ) * camera.zoom
              : 0;
          rect = {
            x: rect.x - (rect.width * (scale - 1)) / 2,
            y: rect.y - rect.height * (scale - 1) + jump,
            width: rect.width * scale,
            height: rect.height * scale,
          };
          alpha = readiness?.opacity ?? 1;
          if (readiness !== null)
            drawRegisteredImageGlow(context, image, rect, {
              color: readiness.glow.color,
              alpha: readiness.glow.alpha,
              blur: readiness.glow.blurCssPx * camera.zoom,
            });
        }
        context.save();
        context.globalAlpha = alpha * sceneAlpha;
        context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
        context.restore();
      }
    }
    if (entry.kind === "TERRAIN" && entry.ownerColor !== undefined) {
      context.save();
      context.strokeStyle = entry.ownerColor;
      context.lineWidth = 3 * camera.zoom;
      context.setLineDash([8 * camera.zoom, 5 * camera.zoom]);
      context.strokeRect(
        left + 2 * camera.zoom,
        top + 2 * camera.zoom,
        size - 4 * camera.zoom,
        size - 4 * camera.zoom,
      );
      context.restore();
    }
    if (
      (entry.kind === "UNIT" || entry.kind === "CITY") &&
      entry.ownerColor !== undefined
    ) {
      context.fillStyle = entry.ownerColor;
      context.strokeStyle = "#171722";
      context.lineWidth = 2 * camera.zoom;
      context.fillRect(
        x - 31 * camera.zoom,
        y + 13 * camera.zoom,
        18 * camera.zoom,
        18 * camera.zoom,
      );
      context.strokeRect(
        x - 31 * camera.zoom,
        y + 13 * camera.zoom,
        18 * camera.zoom,
        18 * camera.zoom,
      );
      context.fillStyle = "#171722";
      context.font = `${800} ${11 * camera.zoom}px system-ui`;
      context.textAlign = "center";
      context.fillText(
        String((entry.ownerSeat ?? 0) + 1),
        x - 22 * camera.zoom,
        y + 27 * camera.zoom,
      );
    }
    if (entry.kind === "CITY") {
      const width = Math.max(1, (entry.value ?? 1) + 1);
      const positive = Math.max(0, Math.min(width, entry.population ?? 0));
      const negative = Math.max(0, Math.min(width, -(entry.population ?? 0)));
      for (let index = 0; index < width; index += 1) {
        context.fillStyle =
          index < positive
            ? "#ffd34e"
            : index < negative
              ? "#ff6b68"
              : "#fff8df";
        context.strokeStyle = "#19282a";
        context.lineWidth = camera.zoom;
        context.fillRect(
          x - (width * 5 * camera.zoom) / 2 + index * 5 * camera.zoom,
          y + 34 * camera.zoom,
          4 * camera.zoom,
          4 * camera.zoom,
        );
        context.strokeRect(
          x - (width * 5 * camera.zoom) / 2 + index * 5 * camera.zoom,
          y + 34 * camera.zoom,
          4 * camera.zoom,
          4 * camera.zoom,
        );
      }
    }
    if (
      entry.kind === "UNIT" &&
      entry.hp !== undefined &&
      entry.maxHp !== undefined
    ) {
      context.fillStyle = "#101718";
      context.fillRect(
        x - 25 * camera.zoom,
        y + 25 * camera.zoom,
        50 * camera.zoom,
        7 * camera.zoom,
      );
      context.fillStyle = "#65d889";
      context.fillRect(
        x - 24 * camera.zoom,
        y + 26 * camera.zoom,
        48 * (entry.hp / entry.maxHp) * camera.zoom,
        5 * camera.zoom,
      );
    }
    if (entry.kind === "VALUE") {
      const count = Math.max(0, Math.min(24, entry.value ?? 0));
      context.fillStyle = entry.label === "CAPACITY" ? "#71cfef" : "#8ce5b2";
      for (let index = 0; index < count; index += 1) {
        const column = index % 8;
        const row = Math.floor(index / 8);
        context.fillRect(
          x - 30 * camera.zoom + column * 8 * camera.zoom,
          y + (38 + row * 8) * camera.zoom,
          6 * camera.zoom,
          6 * camera.zoom,
        );
      }
    }
  }
  const publicLinks = input.plan.entries.filter(
    (entry) => entry.kind === "LINK" && entry.linkTo !== undefined,
  );
  if (publicLinks.length > 0) {
    context.save();
    for (const entry of input.plan.entries) {
      const exclusion = tacticalLinkExclusionRect(entry, camera);
      if (exclusion === null) continue;
      context.beginPath();
      context.rect(0, 0, viewport.width, viewport.height);
      context.rect(exclusion.x, exclusion.y, exclusion.width, exclusion.height);
      context.clip("evenodd");
    }
    for (const link of publicLinks) drawPublicLink(context, camera, link);
    context.restore();
  }
  const statusPulse = input.statusPulse;
  if (
    statusPulse !== null &&
    statusPulse !== undefined &&
    !input.plan.entries.some(
      (entry) =>
        entry.kind === "STATUS" &&
        entry.statusId === statusPulse.statusId &&
        same(entry.at, statusPulse.at),
    )
  ) {
    const x = camera.offsetX + statusPulse.at.x * TILE_WIDTH * camera.zoom;
    const y = camera.offsetY + statusPulse.at.y * TILE_HEIGHT * camera.zoom;
    const pulse = input.reducedMotion
      ? 1
      : 1 + 0.22 * Math.sin(statusPulse.progress * Math.PI);
    const size = 22 * camera.zoom * pulse;
    drawTacticalSymbolOnCanvas(
      context,
      statusPulse.statusId,
      x + 30 * camera.zoom - size / 2,
      y - 39 * camera.zoom - size / 2,
      size,
      input.highContrast ?? false,
    );
  }
  if (input.impact !== null && input.impact !== undefined) {
    const x =
      camera.offsetX +
      input.impact.at.x * TILE_WIDTH * camera.zoom +
      input.impact.shakeCssPx * camera.zoom;
    const y = camera.offsetY + input.impact.at.y * TILE_HEIGHT * camera.zoom;
    context.save();
    context.globalAlpha = input.impact.flashAlpha * sceneAlpha;
    context.fillStyle = "#fff2a8";
    context.beginPath();
    context.arc(x, y, 34 * camera.zoom, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  context.restore();
}

function drawPublicLink(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  entry: BoardRenderPlanEntryV7,
): void {
  if (entry.linkTo === undefined) return;
  const x = camera.offsetX + entry.at.x * TILE_WIDTH * camera.zoom;
  const y = camera.offsetY + entry.at.y * TILE_HEIGHT * camera.zoom;
  const toX = camera.offsetX + entry.linkTo.x * TILE_WIDTH * camera.zoom;
  const toY = camera.offsetY + entry.linkTo.y * TILE_HEIGHT * camera.zoom;
  context.save();
  context.strokeStyle = entry.label === "ARMED" ? "#ffd34e" : "#71cfef";
  context.lineWidth = 3 * camera.zoom;
  context.setLineDash([7 * camera.zoom, 5 * camera.zoom]);
  context.beginPath();
  context.moveTo(x, y - 22 * camera.zoom);
  context.lineTo(toX, toY - 22 * camera.zoom);
  context.stroke();
  context.restore();
}

function tacticalLinkExclusionRect(
  entry: BoardRenderPlanEntryV7,
  camera: CameraState,
): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} | null {
  const x = camera.offsetX + entry.at.x * TILE_WIDTH * camera.zoom;
  const y = camera.offsetY + entry.at.y * TILE_HEIGHT * camera.zoom;
  if (entry.kind === "STATUS") {
    const slot = entry.attachmentSlot ?? 0;
    const size = 26 * camera.zoom;
    return {
      x: x + (30 - slot * 24) * camera.zoom - size / 2,
      y: y - 39 * camera.zoom - size / 2,
      width: size,
      height: size,
    };
  }
  if (entry.kind !== "UNIT" && entry.kind !== "CITY") return null;
  const sprite = anchoredDestinationRect(
    { x, y },
    camera.zoom,
    geometryFor(entry),
  );
  const annotationLeft = x - 34 * camera.zoom;
  const annotationTop = y + 10 * camera.zoom;
  const annotationRight = x + 34 * camera.zoom;
  const annotationBottom = y + 36 * camera.zoom;
  const padding = 3 * camera.zoom;
  const left = Math.min(sprite.x, annotationLeft) - padding;
  const top = Math.min(sprite.y, annotationTop) - padding;
  const right = Math.max(sprite.x + sprite.width, annotationRight) + padding;
  const bottom = Math.max(sprite.y + sprite.height, annotationBottom) + padding;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function createBoardImageResolverV7(
  documentRoot: Document,
  redraw: () => void,
): BoardImageResolverV7 {
  const cache = new Map<string, { image: HTMLImageElement; ready: boolean }>();
  return {
    resolve(assetId) {
      const source = ACCEPTED_ART_URLS[assetId];
      if (source === undefined) return null;
      let record = cache.get(assetId);
      if (record === undefined) {
        const image = documentRoot.createElement("img");
        record = { image, ready: false };
        cache.set(assetId, record);
        image.addEventListener("load", () => {
          const current = cache.get(assetId);
          if (current !== undefined) current.ready = true;
          redraw();
        });
        image.src = source;
      }
      return record.ready ? record.image : null;
    },
  };
}

function mapTargets(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  selectedUnitId: number | null,
  selectedAchievement: "ENGINEER" | "MUSTER" | null,
  tacticalTargetMode: TacticalTargetModeV7 | null,
): MapCommandTargetV7[] {
  if (tacticalTargetMode?.kind === "DEFECTION")
    return defectionTargetsV7(
      view,
      commands,
      tacticalTargetMode.sourceUnitId,
    ).flatMap((target): readonly MapCommandTargetV7[] => {
      const first = target.choices[0];
      return first === undefined
        ? []
        : [
            {
              at: target.at,
              command: first.command,
              family: "DEFECTION",
              previewLabel: `${target.choices.length} home ${target.choices.length === 1 ? "city" : "cities"}`,
              semanticLabel: `Defection target. ${playerLabelV7(view, first.preview.replyBoundary.playerId)} replies at their next accepted End Turn; ${playerLabelV7(view, first.preview.earliestResolutionBoundary.playerId)} resolves at a later Start Turn. ${title(first.preview.cityOccupantSiegeConsequence)}.`,
            },
          ];
    });
  if (tacticalTargetMode?.kind === "BLACKOUT")
    return blackoutTargetsV7(
      view,
      commands,
      tacticalTargetMode.sourceUnitId,
    ).map((target) => ({
      at: target.at,
      command: target.command,
      family: "BLACKOUT",
      previewLabel: "City blackout",
      semanticLabel:
        "Blackout target. Pending until the city's next owner Start Turn; future income denial is capped at 3 Coins and exact amount is not predicted.",
    }));
  return commands.flatMap((command): readonly MapCommandTargetV7[] => {
    if (
      command.kind === "BUILD_MONUMENT" &&
      command.achievement === selectedAchievement
    )
      return [{ at: command.at, command, family: "MONUMENT" }];
    if (selectedUnitId === null) return [];
    if (
      (command.kind === "MOVE" || command.kind === "PURSUE") &&
      command.unitId === selectedUnitId
    ) {
      const at = command.path.at(-1);
      return at === undefined
        ? []
        : [
            {
              at,
              command,
              family: command.kind === "MOVE" ? "MOVE" : "PURSUIT",
              ...(command.kind === "PURSUE"
                ? {
                    semanticLabel: `Pursue ${command.path.length} ${command.path.length === 1 ? "cell" : "cells"}: ${command.path.map((step) => `${step.x},${step.y}`).join(" then ")}`,
                  }
                : {}),
            },
          ];
    }
    if (command.kind === "ATTACK" && command.unitId === selectedUnitId) {
      const target = view.units.find(
        (unit) => unit.id === command.targetUnitId,
      );
      if (target === undefined) return [];
      const preview = queryCombatPreviewV7(
        view,
        command.unitId,
        command.targetUnitId,
      );
      return [
        {
          at: target.at,
          command,
          family: "ATTACK",
          previewLabel:
            preview === null
              ? "Damage uncertain"
              : `Deal ${preview.damageToDefender} · take ${preview.damageToAttacker}`,
        },
      ];
    }
    return [];
  });
}

function dedupeMapTargets(
  targets: readonly MapCommandTargetV7[],
): MapCommandTargetV7[] {
  const seen = new Set<string>();
  return targets.filter((target) => {
    const key = `${target.family}:${target.at.x},${target.at.y}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function drawTacticalSymbolOnCanvas(
  context: CanvasRenderingContext2D,
  statusId: string | undefined,
  left: number,
  top: number,
  size: number,
  highContrast: boolean,
): void {
  if (
    statusId === undefined ||
    !(statusId in RULESET7_TACTICAL_UI_SYMBOL_BY_ID)
  )
    return;
  const id = statusId as keyof typeof RULESET7_TACTICAL_UI_SYMBOL_BY_ID;
  const definition = RULESET7_TACTICAL_UI_SYMBOL_BY_ID[id];
  const tones = highContrast
    ? {
        ink: "#ffffff",
        paper: "#000000",
        slate: "#000000",
        bronze: "#ffffff",
        coral: "#ffffff",
      }
    : {
        ink: "#f8f2df",
        paper: "#6f5a34",
        slate: "#31565e",
        bronze: "#755020",
        coral: "#7b3836",
      };
  const scale = size / 24;
  const point = (value: number): number => value * scale;
  context.save();
  context.translate(left, top);
  for (const primitive of definition.primitives) {
    const stroke = highContrast
      ? "#ffffff"
      : tones[primitive.kind === "line" ? primitive.tone : primitive.stroke];
    context.strokeStyle = stroke;
    context.lineWidth = point(
      primitive.kind === "line" ? primitive.width : 1.5,
    );
    context.lineCap = "round";
    context.lineJoin = "round";
    if (primitive.kind === "line") {
      context.beginPath();
      context.moveTo(point(primitive.x1), point(primitive.y1));
      context.lineTo(point(primitive.x2), point(primitive.y2));
      context.stroke();
    } else if (primitive.kind === "circle") {
      context.fillStyle = tones[primitive.fill];
      context.beginPath();
      context.arc(
        point(primitive.cx),
        point(primitive.cy),
        point(primitive.radius),
        0,
        Math.PI * 2,
      );
      context.fill();
      context.stroke();
    } else if (primitive.kind === "rect") {
      context.fillStyle = tones[primitive.fill];
      context.beginPath();
      context.roundRect(
        point(primitive.x),
        point(primitive.y),
        point(primitive.width),
        point(primitive.height),
        point(primitive.radius),
      );
      context.fill();
      context.stroke();
    } else {
      const first = primitive.points[0];
      if (first === undefined) continue;
      context.fillStyle = tones[primitive.fill];
      context.beginPath();
      context.moveTo(point(first[0]), point(first[1]));
      for (const [x, y] of primitive.points.slice(1))
        context.lineTo(point(x), point(y));
      context.closePath();
      context.fill();
      context.stroke();
    }
  }
  context.restore();
}

function geometryFor(entry: BoardRenderPlanEntryV7): SourceGeometry {
  if (entry.kind === "TERRAIN")
    return entry.assetId?.includes("grass")
      ? SQUARE_ART_GEOMETRY.ground
      : SQUARE_ART_GEOMETRY.tallTerrain;
  if (entry.kind === "RESOURCE") return SQUARE_ART_GEOMETRY.resource;
  if (entry.kind === "ROAD") return SQUARE_ART_GEOMETRY.ground;
  if (entry.kind === "TREASURE") return SQUARE_ART_GEOMETRY.treasure;
  if (entry.kind === "SITE") return SETTLEMENT_ART_GEOMETRY.village;
  if (entry.kind === "CITY")
    return SETTLEMENT_ART_GEOMETRY.cities[cityArtLevel(entry.value ?? 1)];
  if (entry.kind === "UNIT") {
    if (
      entry.assetId === RULESET7_UNIT_ART_IDS.CATAPULT ||
      entry.assetId === RULESET7_UNIT_ART_IDS.BREACHER
    )
      return RULESET6_UNIT_ART_GEOMETRY.siege;
    if (entry.assetId === RULESET7_UNIT_ART_IDS.JUGGERNAUT)
      return RULESET6_UNIT_ART_GEOMETRY.giant;
    return RULESET6_UNIT_ART_GEOMETRY.standard;
  }
  if (entry.kind === "IMPROVEMENT") {
    if (entry.assetId === RULESET7_IMPROVEMENT_ART_IDS.LUMBER_CAMP)
      return SQUARE_ART_GEOMETRY.lumberCamp;
    if (entry.assetId === RULESET7_IMPROVEMENT_ART_IDS.SAWMILL)
      return SQUARE_ART_GEOMETRY.sawmill;
    if (
      [
        "WINDMILL",
        "FORGE",
        "STONEWORKS",
        "WORKSHOP",
        "GRAND_WORKS",
        "MARKET",
        "BARRACKS",
        "MONUMENT",
      ].some(
        (name) =>
          entry.assetId ===
          RULESET7_IMPROVEMENT_ART_IDS[
            name as keyof typeof RULESET7_IMPROVEMENT_ART_IDS
          ],
      )
    )
      return SQUARE_ART_GEOMETRY.processor;
    return SQUARE_ART_GEOMETRY.lowImprovement;
  }
  return SQUARE_ART_GEOMETRY.ground;
}

function roadAssetId(view: PlayerViewV7, at: CoordV7): string {
  const bits = [
    { dx: 0, dy: -1, bit: 8 },
    { dx: 1, dy: 0, bit: 4 },
    { dx: 0, dy: 1, bit: 2 },
    { dx: -1, dy: 0, bit: 1 },
  ].reduce((mask, candidate) => {
    const tile = view.board.tiles.find(
      (entry) =>
        entry.at.x === at.x + candidate.dx &&
        entry.at.y === at.y + candidate.dy,
    );
    return tile?.explored === true && tile.road ? mask | candidate.bit : mask;
  }, 0);
  return `terrain-square-road-mask-${bits.toString(2).padStart(4, "0")}`;
}

function selectionCoord(
  view: PlayerViewV7,
  selection: BoardSelectionV7 | null,
): CoordV7 | null {
  if (selection === null) return null;
  if (selection.kind === "TILE") return selection.at;
  if (selection.kind === "UNIT")
    return view.units.find((unit) => unit.id === selection.unitId)?.at ?? null;
  return view.cities.find((city) => city.id === selection.cityId)?.at ?? null;
}

function ownerPresentation(
  view: PlayerViewV7,
  ownerId: number | null,
): { readonly ownerColor?: string; readonly ownerSeat?: number } {
  if (ownerId === null) return {};
  const player = view.players.find((candidate) => candidate.id === ownerId);
  return player === undefined
    ? {}
    : {
        ownerColor: PLAYER_COLORS[player.color],
        ownerSeat: player.seat,
      };
}

const title = (value: string): string =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
const variant = (at: CoordV7, count: number): number =>
  ((at.x * 31 + at.y * 17) % count) + 1;
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
