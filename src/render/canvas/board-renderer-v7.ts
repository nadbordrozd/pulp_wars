import { ACCEPTED_ART_URLS } from "../../assets/generated-art-manifest";
import {
  RULESET7_IMPROVEMENT_ART_IDS,
  RULESET7_FARM_ART_IDS,
  resourceMapArtIdV7,
  RULESET7_UNIT_ART_IDS,
} from "../../assets/ruleset7-ui-art";
import type {
  CommandV7,
  CoordV7,
  ImprovementIdV7,
  PlayerViewV7,
} from "../../engine/index";
import { queryCombatPreviewV7 } from "../../engine/index";
import {
  RULESET6_UNIT_ART_GEOMETRY,
  RULESET7_CAPTAIN_ART_GEOMETRY,
  RULESET7_KNIGHT_ART_GEOMETRY,
  RULESET7_NAVAL_ART_GEOMETRY,
  SETTLEMENT_ART_GEOMETRY,
  SQUARE_ART_GEOMETRY,
  anchoredDestinationRect,
  cityArtLevel,
  type SourceGeometry,
} from "./board-art-geometry";
import { drawRegisteredImageGlow } from "./board-renderer-v6";
import type { BoardGlowCacheV7 } from "./glow-cache-v7";
import {
  TILE_HEIGHT,
  TILE_WIDTH,
  type CameraState,
  type Size,
  type TileEdge,
} from "./geometry";
import { readinessUnitStyleV6 } from "./readiness-presentation";
import { selectionJumpOffsetCssPx } from "./selection-jump-presentation";
import { RULESET7_TACTICAL_UI_SYMBOL_BY_ID } from "../../assets/ruleset7-tactical-ui-symbols";
import { tacticalAttachmentsV7 } from "../tactical-presentation-v7";

export type BoardSelectionV7 =
  | { readonly kind: "TILE"; readonly at: CoordV7 }
  | { readonly kind: "UNIT"; readonly unitId: number }
  | { readonly kind: "CITY"; readonly cityId: number };

export interface BoardRenderInteractionV7 {
  readonly selection: BoardSelectionV7 | null;
  readonly selectedUnitId: number | null;
  readonly selectedAchievement: null;
  readonly cursor?: CoordV7 | null;
}

export interface MapCommandTargetV7 {
  readonly at: CoordV7;
  readonly command: CommandV7;
  readonly family: "MOVE" | "ATTACK" | "MONUMENT" | "DISEMBARK";
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
    | "ROAD_JOIN"
    | "RESOURCE"
    | "IMPROVEMENT"
    | "FIELD_DEFENSE"
    | "SITE"
    | "TREASURE"
    | "CITY"
    | "UNIT"
    | "VALUE"
    | "TARGET"
    | "REACH"
    | "STATUS"
    | "LINK"
    | "WATER_BOUNDARY"
    | "TERRITORY_BOUNDARY"
    | "SELECTION"
    | "CURSOR";
  readonly assetId?: string;
  readonly roadNeighbors?: readonly CoordV7[];
  readonly roadJoins?: readonly (readonly [CoordV7, CoordV7])[];
  /** A pair Farm is cropped into one source half per authoritative cell. */
  readonly sourceCrop?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly farmPartner?: CoordV7;
  readonly label?: string;
  readonly ownerId?: number | null;
  readonly hp?: number;
  readonly maxHp?: number;
  readonly value?: number;
  readonly target?: MapCommandTargetV7;
  readonly population?: number;
  readonly ready?: boolean;
  readonly ownerColor?: string;
  readonly counterpartOwnerColor?: string;
  readonly ownerSeat?: number;
  readonly statusId?: string;
  readonly pulse?: boolean;
  readonly linkTo?: CoordV7;
  readonly attachmentSlot?: number;
  readonly edge?: TileEdge;
  readonly targetEdges?: readonly TileEdge[];
  readonly boundaryStyle?: "OWNER" | "CITY";
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

const TILE_EDGES: readonly TileEdge[] = ["NORTH", "EAST", "SOUTH", "WEST"];

export function buildBoardRenderPlanV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  interaction: BoardRenderInteractionV7,
): BoardRenderPlanV7 {
  const entries: BoardRenderPlanEntryV7[] = [];
  const farmPresentation = farmPresentationV7(view);
  const roadKeys = new Set(
    view.board.tiles
      .filter((tile) => tile.explored && tile.road)
      .map((tile) => coordKey(tile.at)),
  );
  const exploredKeys = new Set(
    view.board.tiles
      .filter((tile) => tile.explored)
      .map((tile) => coordKey(tile.at)),
  );
  const cityKeys = new Set(
    view.cities
      .filter((city) => exploredKeys.has(coordKey(city.at)))
      .map((city) => coordKey(city.at)),
  );
  for (const cityKey of cityKeys) roadKeys.add(cityKey);
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
          ? `terrain-ruleset7-original-grass-${variant(tile.at, 3)}`
          : tile.terrain === "FOREST"
            ? suppressesForestCanopyV7(tile.improvement)
              ? "terrain-ruleset7-original-grass-1"
              : `terrain-ruleset7-original-forest-${variant(tile.at, 4)}`
            : tile.terrain === "MOUNTAIN"
              ? `terrain-ruleset7-revision3-${tile.improvement === "MINE" ? "mined-" : ""}mountain-${variant(tile.at, 3)}`
              : tile.terrain === "SHALLOW_WATER"
                ? "terrain-ruleset7-water-shallow"
                : "terrain-ruleset7-water-deep",
      ownerId: tile.territoryOwnerId,
      ...ownerPresentation(view, tile.territoryOwnerId),
    });
    const joins: (readonly [CoordV7, CoordV7])[] = [];
    for (const dx of [-1, 1])
      for (const dy of [-1, 1]) {
        const horizontal = { x: tile.at.x + dx, y: tile.at.y };
        const vertical = { x: tile.at.x, y: tile.at.y + dy };
        if (
          roadKeys.has(coordKey(horizontal)) &&
          roadKeys.has(coordKey(vertical))
        )
          joins.push([horizontal, vertical]);
      }
    if (joins.length > 0)
      entries.push({
        key: `road-join:${tile.at.x},${tile.at.y}`,
        kind: "ROAD_JOIN",
        layer: tile.improvement === "MINE" ? 0.4 : 1.9,
        at: tile.at,
        roadJoins: joins,
      });
    const cityNode = cityKeys.has(coordKey(tile.at));
    const neighbors =
      tile.road || cityNode ? roadNeighbors(tile.at, roadKeys) : [];
    if (tile.road || (cityNode && neighbors.length > 0))
      entries.push({
        key: `road:${tile.at.x},${tile.at.y}`,
        kind: "ROAD",
        // Mine artwork includes its terrain, so it also covers its Road.
        layer: tile.improvement === "MINE" ? 0.5 : 2,
        at: tile.at,
        roadNeighbors: neighbors,
      });
    if (tile.resource !== null && tile.resource !== "UNKNOWN_RESOURCE")
      entries.push({
        key: `resource:${tile.at.x},${tile.at.y}`,
        kind: "RESOURCE",
        layer: tile.improvement === "PORT" ? 4 : 3,
        at: tile.at,
        assetId: resourceMapArtIdV7(tile.resource, tile.at),
      });
    if (tile.improvement !== null && tile.improvement !== "MINE") {
      const farm =
        tile.improvement === "FARM"
          ? farmPresentation.get(coordKey(tile.at))
          : undefined;
      entries.push({
        key: `improvement:${tile.at.x},${tile.at.y}`,
        kind: "IMPROVEMENT",
        layer: tile.improvement === "PORT" ? 3 : 4,
        at: tile.at,
        assetId:
          farm?.assetId ?? RULESET7_IMPROVEMENT_ART_IDS[tile.improvement],
        ...(farm?.sourceCrop === undefined
          ? {}
          : { sourceCrop: farm.sourceCrop }),
        ...(farm?.partner === undefined ? {} : { farmPartner: farm.partner }),
        label: title(tile.improvement),
      });
    }
    if (tile.site === "VILLAGE")
      entries.push({
        key: `site:${tile.at.x},${tile.at.y}`,
        kind: "SITE",
        layer: 4,
        at: tile.at,
        assetId: "building-village",
        label: "Village",
      });
    if (
      (tile.fortificationLevel ?? 0) > 0 ||
      (tile.fieldDefense && tile.fortificationLevel === null)
    )
      entries.push({
        key: `field-defense:${tile.at.x},${tile.at.y}`,
        kind: "FIELD_DEFENSE",
        layer: 8,
        at: tile.at,
        ...(tile.fortificationLevel === null
          ? {}
          : { value: tile.fortificationLevel }),
        label: "Field defense",
      });
  }
  addWaterBoundaries(entries, view);
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
      assetId:
        unit.form === "EMBARKED"
          ? "unit-shared-embarked-transport"
          : RULESET7_UNIT_ART_IDS[unit.role],
      label:
        unit.form === "EMBARKED"
          ? `Embarked Transport · ${title(unit.role)} passenger`
          : title(unit.role),
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
  const attachmentSlots = new Map<string, number>();
  for (const attachment of tacticalAttachmentsV7()) {
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
  for (const port of view.naval.ownedPorts) {
    const slot = attachmentSlots.get(coordKey(port.at)) ?? 0;
    attachmentSlots.set(coordKey(port.at), slot + 1);
    entries.push({
      key: `naval-port:${port.at.x},${port.at.y}`,
      kind: "STATUS",
      layer: 6,
      at: port.at,
      statusId:
        port.status === "ACTIVE"
          ? "ui-status-port-active"
          : "ui-status-port-blockaded",
      label: port.status === "ACTIVE" ? "Active Port" : "Blockaded Port",
      attachmentSlot: slot,
    });
  }
  for (const route of view.naval.seaRoutes)
    for (let index = 0; index + 1 < route.path.length; index += 1) {
      const from = route.path[index];
      const to = route.path[index + 1];
      if (from === undefined || to === undefined) continue;
      entries.push({
        key: `sea-route:${route.fromCityId}:${route.toCityId}:${index}`,
        kind: "LINK",
        layer: 6,
        at: from,
        linkTo: to,
        label: "SEA_ROUTE",
      });
    }
  const selectedUnitId =
    interaction.selection?.kind === "UNIT"
      ? interaction.selection.unitId
      : null;
  const selectedNaval =
    selectedUnitId !== null
      ? view.units.find(
          (unit) =>
            unit.id === selectedUnitId &&
            unit.ownerId === view.viewer.id &&
            unit.form === "NAVAL",
        )
      : undefined;
  if (selectedNaval !== undefined) {
    const recoveryKeys = new Set<string>();
    for (const port of view.naval.ownedPorts.filter(
      (candidate) => candidate.status === "ACTIVE",
    ))
      for (const tile of view.board.tiles)
        if (
          tile.explored &&
          tile.biome === null &&
          !(
            tile.territoryOwnerId !== null &&
            tile.territoryOwnerId !== view.viewer.id &&
            view.setup.aiMode === "COOPERATIVE" &&
            tile.territoryOwnerId !== view.humanPlayerId &&
            view.viewer.id !== view.humanPlayerId
          ) &&
          (tile.terrain !== "DEEP_WATER" ||
            view.viewer.researchedTechs.includes("NAVIGATION")) &&
          Math.max(
            Math.abs(tile.at.x - port.at.x),
            Math.abs(tile.at.y - port.at.y),
          ) <= 1 &&
          !recoveryKeys.has(coordKey(tile.at))
        ) {
          recoveryKeys.add(coordKey(tile.at));
          entries.push({
            key: `naval-recovery:${selectedNaval.id}:${tile.at.x},${tile.at.y}`,
            kind: "REACH",
            layer: 6,
            at: tile.at,
            label: view.naval.recoverableNavalUnitIds.includes(selectedNaval.id)
              ? "Recovery available"
              : "Port recovery radius",
          });
        }
  }
  addTerritoryBoundaries(entries, view, interaction.selection);
  const targets = dedupeMapTargets(
    mapTargets(view, commands, interaction.selectedUnitId),
  );
  const targetEdges = mapTargetEdges(targets);
  for (const target of targets)
    entries.push({
      key: `target:${target.family}:${target.at.x},${target.at.y}`,
      kind: "TARGET",
      layer: 7,
      at: target.at,
      target,
      targetEdges:
        targetEdges.get(`${target.family}:${target.at.x},${target.at.y}`) ?? [],
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
      Number(a.kind === "VALUE") - Number(b.kind === "VALUE") ||
      a.at.y - b.at.y ||
      a.at.x - b.at.x ||
      a.layer - b.layer ||
      a.key.localeCompare(b.key),
  );
  return { version: 7, entries, targets };
}

/** Presentation-only replacement of a same-cell Forest canopy with its ground. */
export function suppressesForestCanopyV7(
  improvement: ImprovementIdV7 | null,
): boolean {
  return (
    improvement === "LUMBER_CAMP" ||
    improvement === "WINDMILL" ||
    improvement === "SAWMILL"
  );
}

export interface BoardImageResolverV7 {
  resolve(assetId: string): CanvasImageSource | null;
  /** Registered square ground used beneath a tall terrain body. */
  resolveTerrainGround?(assetId: string): CanvasImageSource | null;
  /** Cached body-only raster for tall terrain; null while either source loads. */
  resolveRaisedTerrain?(assetId: string): CanvasImageSource | null;
}

export function drawBoardV7(input: {
  readonly context: CanvasRenderingContext2D;
  readonly viewport: Size;
  readonly devicePixelRatio: number;
  readonly camera: CameraState;
  readonly plan: BoardRenderPlanV7;
  readonly images: BoardImageResolverV7;
  readonly glowCache?: BoardGlowCacheV7;
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
  for (const pass of ["FOG", "GROUND", "ROAD", "FOREGROUND"] as const)
    for (const entry of input.plan.entries) {
      if (
        entry.kind === "LINK" ||
        entry.kind === "WATER_BOUNDARY" ||
        entry.kind === "TARGET" ||
        entry.kind === "TERRITORY_BOUNDARY" ||
        entry.kind === "REACH" ||
        entry.kind === "SELECTION" ||
        entry.kind === "CURSOR"
      )
        continue;
      if (
        (pass === "FOG" && entry.kind !== "FOG") ||
        (pass === "GROUND" && entry.kind !== "TERRAIN") ||
        (pass === "ROAD" &&
          entry.kind !== "ROAD" &&
          entry.kind !== "ROAD_JOIN") ||
        (pass === "FOREGROUND" &&
          (entry.kind === "FOG" ||
            entry.kind === "ROAD" ||
            entry.kind === "ROAD_JOIN" ||
            (entry.kind === "TERRAIN" && !isTallTerrainEntry(entry))))
      )
        continue;
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
      // The largest accepted sprite and attached glow extend less than three
      // cells from their owning anchor, including jump/impact displacement.
      if (
        x < -3 * size ||
        x > viewport.width + 3 * size ||
        y < -3 * size ||
        y > viewport.height + 3 * size
      )
        continue;
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
        if (pass === "GROUND") {
          context.fillStyle =
            entry.ownerColor === undefined
              ? "#65965b"
              : `${entry.ownerColor}55`;
          context.fillRect(left, top, size, size);
          if (isTallTerrainEntry(entry))
            drawSquareTerrainGround(
              context,
              input.images.resolveTerrainGround?.(entry.assetId ?? "") ?? null,
              { x, y, zoom: camera.zoom, sceneAlpha },
            );
          else
            drawEntryImage(context, input.images.resolve(entry.assetId ?? ""), {
              x,
              y,
              zoom: camera.zoom,
              entry,
              sceneAlpha,
            });
        } else {
          const raised = input.images.resolveRaisedTerrain?.(
            entry.assetId ?? "",
          );
          if (raised !== null && raised !== undefined)
            drawEntryImage(context, raised, {
              x,
              y,
              zoom: camera.zoom,
              entry,
              sceneAlpha,
            });
          else
            drawTallTerrainOverflowFallback(
              context,
              input.images.resolve(entry.assetId ?? ""),
              { x, y, zoom: camera.zoom, sceneAlpha },
            );
        }
        continue;
      }
      if (entry.kind === "ROAD" || entry.kind === "ROAD_JOIN") {
        drawRoad(context, entry, x, y, camera.zoom);
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
      if (entry.kind === "FIELD_DEFENSE") {
        const symbolSize = 22 * camera.zoom;
        drawTacticalSymbolOnCanvas(
          context,
          "ui-action-field-defense",
          x - 53 * camera.zoom,
          y - 54 * camera.zoom,
          symbolSize,
          input.highContrast ?? false,
        );
        if ((entry.value ?? 0) > 0) {
          context.fillStyle = input.highContrast ? "#ffffff" : "#fff8df";
          context.strokeStyle = "#172529";
          context.lineWidth = 3 * camera.zoom;
          context.font = `800 ${13 * camera.zoom}px system-ui`;
          context.textAlign = "center";
          context.strokeText(
            String(entry.value),
            x - 30 * camera.zoom,
            y - 37 * camera.zoom,
          );
          context.fillText(
            String(entry.value),
            x - 30 * camera.zoom,
            y - 37 * camera.zoom,
          );
        }
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
            if (readiness !== null) {
              const glow = {
                color: readiness.glow.color,
                alpha: readiness.glow.alpha,
                blur: readiness.glow.blurCssPx * camera.zoom,
              };
              if (input.glowCache === undefined)
                drawRegisteredImageGlow(context, image, rect, glow);
              else
                input.glowCache.draw(context, image, entry.assetId, rect, glow);
            }
          }
          context.save();
          context.globalAlpha = alpha * sceneAlpha;
          if (entry.sourceCrop === undefined)
            context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
          else
            context.drawImage(
              image,
              entry.sourceCrop.x,
              entry.sourceCrop.y,
              entry.sourceCrop.width,
              entry.sourceCrop.height,
              rect.x,
              rect.y,
              rect.width,
              rect.height,
            );
          context.restore();
        }
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
  const targetEdgeKeys = new Set(
    input.plan.entries.flatMap((entry) =>
      entry.kind === "TARGET"
        ? (entry.targetEdges ?? TILE_EDGES).map((edge) =>
            edgeKey(entry.at, edge),
          )
        : [],
    ),
  );
  const boundaries = input.plan.entries.filter(
    (entry) => entry.kind === "TERRITORY_BOUNDARY",
  );
  if (boundaries.length > 0) {
    // Keep wider contour strokes off unexplored ground, including their casing.
    context.save();
    context.beginPath();
    for (const entry of input.plan.entries) {
      if (entry.kind !== "TERRAIN") continue;
      const size = TILE_WIDTH * camera.zoom;
      context.rect(
        camera.offsetX + entry.at.x * size - size / 2,
        camera.offsetY + entry.at.y * size - size / 2,
        size,
        size,
      );
    }
    context.clip();
    const roadCells = new Set(
      input.plan.entries
        .filter((entry) => entry.kind === "ROAD")
        .map((entry) => `${entry.at.x},${entry.at.y}`),
    );
    for (const boundary of boundaries) {
      if (
        boundary.edge !== undefined &&
        targetEdgeKeys.has(edgeKey(boundary.at, boundary.edge))
      )
        continue;
      drawTerritoryBoundary(context, camera, boundary, roadCells);
    }
    context.restore();
  }
  for (const boundary of input.plan.entries) {
    if (boundary.kind !== "WATER_BOUNDARY" || boundary.edge === undefined)
      continue;
    context.save();
    context.strokeStyle = boundary.label === "DEPTH" ? "#b7d8d4" : "#ecdfb7";
    context.lineWidth = (boundary.label === "DEPTH" ? 4 : 3) * camera.zoom;
    context.setLineDash(
      boundary.label === "DEPTH"
        ? [6 * camera.zoom, 4 * camera.zoom]
        : [10 * camera.zoom, 5 * camera.zoom],
    );
    strokeTileEdge(context, camera, boundary.at, boundary.edge);
    context.restore();
  }
  // Selection and action outlines keep visual priority over ownership.
  for (const entry of input.plan.entries) {
    const size = TILE_WIDTH * camera.zoom;
    const left = camera.offsetX + entry.at.x * size - size / 2;
    const top = camera.offsetY + entry.at.y * size - size / 2;
    if (
      entry.kind === "REACH" ||
      entry.kind === "SELECTION" ||
      entry.kind === "CURSOR"
    ) {
      context.save();
      context.lineWidth =
        (entry.kind === "SELECTION" ? 5 : entry.kind === "CURSOR" ? 3 : 2) *
        camera.zoom;
      context.strokeStyle =
        entry.kind === "SELECTION"
          ? "#fff6b0"
          : entry.kind === "CURSOR"
            ? "#ffffff"
            : "#ffd34e";
      context.setLineDash(
        entry.kind === "REACH"
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
      context.restore();
      continue;
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
  for (const target of input.plan.entries) {
    if (target.kind !== "TARGET") continue;
    drawMapTarget(context, camera, target);
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

function addTerritoryBoundaries(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
  selection: BoardSelectionV7 | null,
): void {
  const selectedCity =
    selection?.kind === "CITY"
      ? view.cities.find((city) => city.id === selection.cityId)
      : undefined;
  for (const segment of view.board.territoryBorders) {
    const key = edgeKey(segment.at, segment.edge);
    const sharedOwnerIds = segment.sharedOwnerIds;
    if (
      selectedCity !== undefined &&
      segment.cityIds.includes(selectedCity.id)
    ) {
      const counterpartOwnerId = sharedOwnerIds?.find(
        (ownerId) => ownerId !== selectedCity.ownerId,
      );
      const counterpartOwnerColor =
        counterpartOwnerId === undefined
          ? undefined
          : ownerPresentation(view, counterpartOwnerId).ownerColor;
      entries.push({
        key: `territory-city:${selectedCity.id}:${key}`,
        kind: "TERRITORY_BOUNDARY",
        layer: 8,
        at: segment.at,
        edge: segment.edge,
        boundaryStyle: "CITY",
        ownerId: selectedCity.ownerId,
        ...ownerPresentation(view, selectedCity.ownerId),
        ...(counterpartOwnerColor === undefined
          ? {}
          : { counterpartOwnerColor }),
      });
    } else if (segment.ownerId !== null) {
      const [ownerId, counterpartOwnerId] = sharedOwnerIds ?? [
        segment.ownerId,
        undefined,
      ];
      const counterpartOwnerColor =
        counterpartOwnerId === undefined
          ? undefined
          : ownerPresentation(view, counterpartOwnerId).ownerColor;
      entries.push({
        key: `territory-owner:${key}`,
        kind: "TERRITORY_BOUNDARY",
        layer: 7,
        at: segment.at,
        edge: segment.edge,
        boundaryStyle: "OWNER",
        ownerId,
        ...ownerPresentation(view, ownerId),
        ...(counterpartOwnerColor === undefined
          ? {}
          : { counterpartOwnerColor }),
      });
    }
  }
}

function addWaterBoundaries(
  entries: BoardRenderPlanEntryV7[],
  view: PlayerViewV7,
): void {
  const byKey = new Map(
    view.board.tiles.map((tile) => [coordKey(tile.at), tile] as const),
  );
  for (const tile of view.board.tiles) {
    if (!tile.explored) continue;
    for (const [dx, dy, edge, opposite] of [
      [1, 0, "EAST", "WEST"],
      [0, 1, "SOUTH", "NORTH"],
    ] as const) {
      const neighbor = byKey.get(
        coordKey({ x: tile.at.x + dx, y: tile.at.y + dy }),
      );
      if (neighbor === undefined || !neighbor.explored) continue;
      const tileWater = tile.biome === null;
      const neighborWater = neighbor.biome === null;
      if (tileWater !== neighborWater) {
        const water = tileWater ? tile : neighbor;
        entries.push({
          key: `water-coast:${tile.at.x},${tile.at.y}:${edge}`,
          kind: "WATER_BOUNDARY",
          layer: 6,
          at: water.at,
          edge: tileWater ? edge : opposite,
          label: "COAST",
        });
      } else if (
        tileWater &&
        tile.terrain !== neighbor.terrain &&
        (tile.terrain === "SHALLOW_WATER" ||
          neighbor.terrain === "SHALLOW_WATER")
      ) {
        const shallow = tile.terrain === "SHALLOW_WATER" ? tile : neighbor;
        entries.push({
          key: `water-depth:${tile.at.x},${tile.at.y}:${edge}`,
          kind: "WATER_BOUNDARY",
          layer: 6,
          at: shallow.at,
          edge: shallow === tile ? edge : opposite,
          label: "DEPTH",
        });
      }
    }
  }
}

function edgeKey(at: CoordV7, edge: TileEdge): string {
  if (edge === "NORTH") return `h:${at.x}:${at.y}`;
  if (edge === "SOUTH") return `h:${at.x}:${at.y + 1}`;
  if (edge === "WEST") return `v:${at.x}:${at.y}`;
  return `v:${at.x + 1}:${at.y}`;
}

function mapTargetEdges(
  targets: readonly MapCommandTargetV7[],
): ReadonlyMap<string, readonly TileEdge[]> {
  const winners = new Map<
    string,
    { readonly target: MapCommandTargetV7; readonly edge: TileEdge }
  >();
  for (const target of targets)
    for (const edge of TILE_EDGES) {
      const key = edgeKey(target.at, edge);
      const winner = winners.get(key);
      if (
        winner === undefined ||
        targetPriority(target.family) > targetPriority(winner.target.family)
      )
        winners.set(key, { target, edge });
    }
  const result = new Map<string, TileEdge[]>();
  for (const { target, edge } of winners.values()) {
    const key = `${target.family}:${target.at.x},${target.at.y}`;
    const edges = result.get(key) ?? [];
    edges.push(edge);
    result.set(key, edges);
  }
  return result;
}

function targetPriority(family: MapCommandTargetV7["family"]): number {
  if (family === "ATTACK") return 6;
  if (family === "MONUMENT") return 2;
  return 1;
}

function targetStroke(
  family: MapCommandTargetV7["family"] | undefined,
): string {
  if (family === "ATTACK") return "#ff655f";
  return "#64e6cf";
}

function drawMapTarget(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  entry: BoardRenderPlanEntryV7,
): void {
  const x = camera.offsetX + entry.at.x * TILE_WIDTH * camera.zoom;
  const y = camera.offsetY + entry.at.y * TILE_HEIGHT * camera.zoom;
  context.save();
  context.lineWidth = 4 * camera.zoom;
  context.strokeStyle = targetStroke(entry.target?.family);
  context.setLineDash([9 * camera.zoom, 5 * camera.zoom]);
  for (const edge of entry.targetEdges ?? TILE_EDGES)
    strokeTileEdge(context, camera, entry.at, edge);
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
}

function strokeTileEdge(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  at: CoordV7,
  edge: TileEdge,
): void {
  const x = camera.offsetX + at.x * TILE_WIDTH * camera.zoom;
  const y = camera.offsetY + at.y * TILE_HEIGHT * camera.zoom;
  const half = (TILE_WIDTH * camera.zoom) / 2;
  const endpoints: Readonly<
    Record<TileEdge, readonly [number, number, number, number]>
  > = {
    NORTH: [x - half, y - half, x + half, y - half],
    EAST: [x + half, y - half, x + half, y + half],
    SOUTH: [x + half, y + half, x - half, y + half],
    WEST: [x - half, y + half, x - half, y - half],
  };
  const [fromX, fromY, toX, toY] = endpoints[edge];
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.stroke();
}

function drawTerritoryBoundary(
  context: CanvasRenderingContext2D,
  camera: CameraState,
  entry: BoardRenderPlanEntryV7,
  roadCells: ReadonlySet<string>,
): void {
  if (entry.edge === undefined) return;
  context.save();
  const zoom = camera.zoom;
  const selected = entry.boundaryStyle === "CITY";
  const [dx, dy] =
    entry.edge === "NORTH"
      ? [0, -1]
      : entry.edge === "SOUTH"
        ? [0, 1]
        : entry.edge === "WEST"
          ? [-1, 0]
          : [1, 0];
  if (
    roadCells.has(`${entry.at.x},${entry.at.y}`) &&
    roadCells.has(`${entry.at.x + dx},${entry.at.y + dy}`)
  ) {
    // Two public Road cells leave a small crossing through the contour.
    const x = camera.offsetX + (entry.at.x + dx / 2) * TILE_WIDTH * zoom;
    const y = camera.offsetY + (entry.at.y + dy / 2) * TILE_HEIGHT * zoom;
    const size = TILE_WIDTH * zoom;
    context.beginPath();
    context.rect(x - size, y - size, size * 2, size * 2);
    context.rect(x - 12 * zoom, y - 12 * zoom, 24 * zoom, 24 * zoom);
    context.clip("evenodd");
  }
  context.lineCap = "butt";
  const shared = entry.counterpartOwnerColor !== undefined;
  context.setLineDash(
    selected && !shared
      ? []
      : shared
        ? [12 * zoom, 4 * zoom]
        : [20 * zoom, 12 * zoom],
  );
  // Four periods per square side, with gaps at corners and Road midpoints.
  context.lineDashOffset = selected && !shared ? 0 : -6 * zoom;
  context.strokeStyle = "#243633";
  context.lineWidth = (selected ? 9 : 8) * zoom;
  strokeTileEdge(context, camera, entry.at, entry.edge);
  context.strokeStyle = entry.ownerColor ?? "#fff6b0";
  context.lineWidth = (selected ? 5 : 4) * zoom;
  if (shared) context.setLineDash([12 * zoom, 20 * zoom]);
  strokeTileEdge(context, camera, entry.at, entry.edge);
  if (entry.counterpartOwnerColor !== undefined) {
    context.strokeStyle = entry.counterpartOwnerColor;
    context.lineDashOffset = -22 * zoom;
    strokeTileEdge(context, camera, entry.at, entry.edge);
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
  const raisedCache = new Map<
    string,
    {
      readonly source: CanvasImageSource;
      readonly ground: CanvasImageSource;
      readonly image: CanvasImageSource;
    }
  >();
  const resolve = (assetId: string): CanvasImageSource | null => {
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
  };
  return {
    resolve,
    resolveTerrainGround(assetId) {
      const groundId = tallTerrainGroundArtId(assetId);
      return groundId === null ? null : resolve(groundId);
    },
    resolveRaisedTerrain(assetId) {
      const groundId = tallTerrainGroundArtId(assetId);
      if (groundId === null) return null;
      const source = resolve(assetId);
      const ground = resolve(groundId);
      if (source === null || ground === null) return null;
      const cached = raisedCache.get(assetId);
      if (cached?.source === source && cached.ground === ground)
        return cached.image;
      const image = isolateTallTerrainForegroundV7(
        documentRoot,
        source,
        ground,
      );
      // A missing/tainted 2D context is retryable; never cache that fallback.
      if (image === null) return null;
      raisedCache.set(assetId, { source, ground, image });
      return image;
    },
  };
}

function tallTerrainGroundArtId(assetId: string): string | null {
  if (assetId.startsWith("terrain-ruleset7-original-forest-"))
    return "terrain-ruleset7-original-grass-1";
  if (assetId.includes("mountain")) return "terrain-ruleset7-revision3-gravel";
  return null;
}

/**
 * Reuses the checked-in tall-terrain derivation: pixels that differ from the
 * accepted owning-square ground form the raised body, while enclosed flat
 * body colors are restored after border flood fill. The result is cached by
 * the resolver and never read back per frame.
 */
function isolateTallTerrainForegroundV7(
  documentRoot: Document,
  source: CanvasImageSource,
  ground: CanvasImageSource,
): CanvasImageSource | null {
  const width = 256;
  const height = 384;
  const footprintTop = 128;
  try {
    const output = documentRoot.createElement("canvas");
    output.width = width;
    output.height = height;
    const context = output.getContext("2d", { willReadFrequently: true });
    const groundCanvas = documentRoot.createElement("canvas");
    groundCanvas.width = width;
    groundCanvas.height = height - footprintTop;
    const groundContext = groundCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (context === null || groundContext === null) return null;
    context.clearRect(0, 0, width, height);
    context.drawImage(source, 0, 0, width, height);
    groundContext.drawImage(ground, 0, 0, width, height - footprintTop);
    const body = context.getImageData(0, 0, width, height);
    const groundPixels = groundContext.getImageData(
      0,
      0,
      width,
      height - footprintTop,
    ).data;
    const originalAlpha = new Uint8Array(width * height);
    for (let y = 0; y < height; y += 1)
      for (let x = 0; x < width; x += 1) {
        const pixel = y * width + x;
        const offset = pixel * 4;
        const sourceAlpha = body.data[offset + 3] ?? 0;
        originalAlpha[pixel] = sourceAlpha;
        if (y < footprintTop) continue;
        const groundOffset = ((y - footprintTop) * width + x) * 4;
        const difference = Math.max(
          Math.abs(
            (body.data[offset] ?? 0) - (groundPixels[groundOffset] ?? 0),
          ),
          Math.abs(
            (body.data[offset + 1] ?? 0) -
              (groundPixels[groundOffset + 1] ?? 0),
          ),
          Math.abs(
            (body.data[offset + 2] ?? 0) -
              (groundPixels[groundOffset + 2] ?? 0),
          ),
        );
        // The accepted composite already contains the exact antialiased edge
        // color. A binary mask restores that pixel verbatim above Roads and
        // exactly reconstructs the source above its registered square ground.
        body.data[offset + 3] = difference === 0 ? 0 : sourceAlpha;
      }
    fillEnclosedTallTerrainBodyV7(body.data, originalAlpha, width, height);
    context.putImageData(body, 0, 0);
    return output;
  } catch {
    return null;
  }
}

function fillEnclosedTallTerrainBodyV7(
  body: Uint8ClampedArray,
  originalAlpha: Uint8Array,
  width: number,
  height: number,
): void {
  const reachable = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const enqueue = (x: number, y: number): void => {
    const pixel = y * width + x;
    if (reachable[pixel] !== 0 || (body[pixel * 4 + 3] ?? 0) !== 0) return;
    reachable[pixel] = 1;
    queue[tail] = pixel;
    tail += 1;
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }
  while (head < tail) {
    const pixel = queue[head] ?? 0;
    head += 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) enqueue(x - 1, y);
    if (x + 1 < width) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y + 1 < height) enqueue(x, y + 1);
  }
  for (let pixel = 0; pixel < width * height; pixel += 1)
    if (reachable[pixel] === 0 && (originalAlpha[pixel] ?? 0) > 0)
      body[pixel * 4 + 3] = originalAlpha[pixel] ?? 0;
}

function mapTargets(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  selectedUnitId: number | null,
): MapCommandTargetV7[] {
  return commands.flatMap((command): readonly MapCommandTargetV7[] => {
    if (selectedUnitId === null) return [];
    if (command.kind === "MOVE" && command.unitId === selectedUnitId) {
      const at = command.path.at(-1);
      return at === undefined
        ? []
        : [
            {
              at,
              command,
              family: "MOVE",
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
              : `Deal ${preview.damageToDefender} · take ${preview.damageToAttacker}${preview.splash.length > 0 ? ` · splash ${preview.splash.reduce((sum, item) => sum + item.damage, 0)} to ${preview.splash.length}` : ""}`,
          ...(preview === null
            ? {}
            : {
                semanticLabel: `Attack preview. Defender fortification level ${preview.fortificationLevel}. Primary damage ${preview.damageToDefender}.${preview.splash.length > 0 ? ` Splash affects ${preview.splash.length} adjacent hostile units for ${preview.splash.map((item) => `${item.damage}${item.dies ? " lethal" : ""}`).join(", ")}.` : ""}`,
              }),
        },
      ];
    }
    if (command.kind === "DISEMBARK" && command.unitId === selectedUnitId)
      return [
        {
          at: command.at,
          command,
          family: "DISEMBARK",
          previewLabel: "Land transport",
          semanticLabel:
            "Legal landing tile. Landing ends this unit's activation; capture is available after the ordinary wait.",
        },
      ];
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

function isTallTerrainEntry(entry: BoardRenderPlanEntryV7): boolean {
  return (
    entry.kind === "TERRAIN" &&
    entry.assetId !== undefined &&
    tallTerrainGroundArtId(entry.assetId) !== null
  );
}

function drawEntryImage(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource | null,
  input: {
    readonly x: number;
    readonly y: number;
    readonly zoom: number;
    readonly entry: BoardRenderPlanEntryV7;
    readonly sceneAlpha: number;
  },
): void {
  if (image === null) return;
  const rect = anchoredDestinationRect(
    { x: input.x, y: input.y },
    input.zoom,
    geometryFor(input.entry),
  );
  context.save();
  context.globalAlpha = input.sceneAlpha;
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  context.restore();
}

function drawSquareTerrainGround(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource | null,
  input: {
    readonly x: number;
    readonly y: number;
    readonly zoom: number;
    readonly sceneAlpha: number;
  },
): void {
  if (image === null) return;
  const size = 128 * input.zoom;
  context.save();
  context.globalAlpha = input.sceneAlpha;
  context.drawImage(image, input.x - size / 2, input.y - size / 2, size, size);
  context.restore();
}

/**
 * If browser pixel readback is unavailable, preserve raised overflow without
 * repainting the opaque owning-square floor over Roads. The next successful
 * resolver call retries the complete cached body isolation.
 */
function drawTallTerrainOverflowFallback(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource | null,
  input: {
    readonly x: number;
    readonly y: number;
    readonly zoom: number;
    readonly sceneAlpha: number;
  },
): void {
  if (image === null) return;
  const width = 256 * 0.5 * input.zoom;
  const overflowHeight = 128 * 0.5 * input.zoom;
  context.save();
  context.globalAlpha = input.sceneAlpha;
  context.drawImage(
    image,
    0,
    0,
    256,
    128,
    input.x - width / 2,
    input.y - 2 * overflowHeight,
    width,
    overflowHeight,
  );
  context.restore();
}

function geometryFor(entry: BoardRenderPlanEntryV7): SourceGeometry {
  if (entry.kind === "TERRAIN")
    return entry.assetId?.includes("grass") || entry.assetId?.includes("water")
      ? SQUARE_ART_GEOMETRY.ground
      : SQUARE_ART_GEOMETRY.tallTerrain;
  if (entry.kind === "RESOURCE") return SQUARE_ART_GEOMETRY.resource;
  if (entry.kind === "ROAD") return SQUARE_ART_GEOMETRY.ground;
  if (entry.kind === "TREASURE") return SQUARE_ART_GEOMETRY.treasure;
  if (entry.kind === "SITE") return SETTLEMENT_ART_GEOMETRY.village;
  if (entry.kind === "CITY")
    return SETTLEMENT_ART_GEOMETRY.cities[cityArtLevel(entry.value ?? 1)];
  if (entry.kind === "UNIT") {
    if (entry.assetId === "unit-shared-embarked-transport")
      return RULESET7_NAVAL_ART_GEOMETRY.transport;
    if (entry.assetId === RULESET7_UNIT_ART_IDS.PATROL_BOAT)
      return RULESET7_NAVAL_ART_GEOMETRY.patrolBoat;
    if (entry.assetId === RULESET7_UNIT_ART_IDS.BATTLESHIP)
      return RULESET7_NAVAL_ART_GEOMETRY.battleship;
    if (entry.assetId === RULESET7_UNIT_ART_IDS.CATAPULT)
      return RULESET6_UNIT_ART_GEOMETRY.siege;
    if (entry.assetId === RULESET7_UNIT_ART_IDS.JUGGERNAUT)
      return RULESET6_UNIT_ART_GEOMETRY.giant;
    if (entry.assetId === RULESET7_UNIT_ART_IDS.KNIGHT)
      return RULESET7_KNIGHT_ART_GEOMETRY;
    if (entry.assetId === RULESET7_UNIT_ART_IDS.CAPTAIN)
      return RULESET7_CAPTAIN_ART_GEOMETRY;
    return RULESET6_UNIT_ART_GEOMETRY.standard;
  }
  if (entry.kind === "IMPROVEMENT") {
    if (
      entry.assetId === RULESET7_FARM_ART_IDS.SINGLE ||
      entry.assetId === RULESET7_FARM_ART_IDS.HORIZONTAL_PAIR ||
      entry.assetId === RULESET7_FARM_ART_IDS.VERTICAL_PAIR
    )
      return SQUARE_ART_GEOMETRY.ground;
    if (entry.assetId === RULESET7_IMPROVEMENT_ART_IDS.LUMBER_CAMP)
      return SQUARE_ART_GEOMETRY.ruleset7LumberCamp;
    if (entry.assetId === RULESET7_IMPROVEMENT_ART_IDS.SAWMILL)
      return SQUARE_ART_GEOMETRY.sawmill;
    if (entry.assetId === RULESET7_IMPROVEMENT_ART_IDS.PORT)
      return SQUARE_ART_GEOMETRY.processor;
    if (entry.assetId === RULESET7_IMPROVEMENT_ART_IDS.SHIPYARD)
      return SQUARE_ART_GEOMETRY.processor;
    if (
      ["WINDMILL", "FORGE", "WORKSHOP", "MARKET", "MONUMENT"].some(
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

export interface FarmPresentationV7 {
  readonly assetId: (typeof RULESET7_FARM_ART_IDS)[keyof typeof RULESET7_FARM_ART_IDS];
  readonly sourceCrop?: {
    readonly x: number;
    readonly y: number;
    readonly width: 256;
    readonly height: 256;
  };
  readonly partner?: CoordV7;
}

type RevealedTileV7 = Extract<
  PlayerViewV7["board"]["tiles"][number],
  { readonly explored: true }
>;

/**
 * Farms pair for presentation only. Revealed same-city Farms are scanned in
 * canonical (y,x) order; each takes the first still-free E, S, W, N neighbor.
 * Every pair is drawn as independently cropped cell halves so row depth, fog,
 * picking, selection and authoritative economy remain per tile.
 */
export function farmPresentationV7(
  view: PlayerViewV7,
): ReadonlyMap<string, FarmPresentationV7> {
  const farms = view.board.tiles
    .filter(
      (tile): tile is RevealedTileV7 =>
        tile.explored &&
        tile.improvement === "FARM" &&
        tile.territoryCityId !== null,
    )
    .sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x);
  const byCoord = new Map(farms.map((tile) => [coordKey(tile.at), tile]));
  const paired = new Set<string>();
  const result = new Map<string, FarmPresentationV7>();
  const directions = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: -1 },
  ] as const;
  for (const tile of farms) {
    const key = coordKey(tile.at);
    if (paired.has(key)) continue;
    const neighbor = directions
      .map(({ dx, dy }) => ({ x: tile.at.x + dx, y: tile.at.y + dy }))
      .map((at) => byCoord.get(coordKey(at)))
      .find(
        (candidate) =>
          candidate !== undefined &&
          candidate.territoryCityId === tile.territoryCityId &&
          !paired.has(coordKey(candidate.at)),
      );
    if (neighbor === undefined) {
      result.set(key, { assetId: RULESET7_FARM_ART_IDS.SINGLE });
      continue;
    }
    const neighborKey = coordKey(neighbor.at);
    paired.add(key);
    paired.add(neighborKey);
    if (tile.at.y === neighbor.at.y) {
      const left = tile.at.x < neighbor.at.x ? tile : neighbor;
      const right = left === tile ? neighbor : tile;
      result.set(coordKey(left.at), {
        assetId: RULESET7_FARM_ART_IDS.HORIZONTAL_PAIR,
        sourceCrop: { x: 0, y: 0, width: 256, height: 256 },
        partner: right.at,
      });
      result.set(coordKey(right.at), {
        assetId: RULESET7_FARM_ART_IDS.HORIZONTAL_PAIR,
        sourceCrop: { x: 256, y: 0, width: 256, height: 256 },
        partner: left.at,
      });
    } else {
      const top = tile.at.y < neighbor.at.y ? tile : neighbor;
      const bottom = top === tile ? neighbor : tile;
      result.set(coordKey(top.at), {
        assetId: RULESET7_FARM_ART_IDS.VERTICAL_PAIR,
        sourceCrop: { x: 0, y: 0, width: 256, height: 256 },
        partner: bottom.at,
      });
      result.set(coordKey(bottom.at), {
        assetId: RULESET7_FARM_ART_IDS.VERTICAL_PAIR,
        sourceCrop: { x: 0, y: 256, width: 256, height: 256 },
        partner: top.at,
      });
    }
  }
  return result;
}

function coordKey(at: CoordV7): string {
  return `${at.x},${at.y}`;
}

function roadNeighbors(
  at: CoordV7,
  roadKeys: ReadonlySet<string>,
): readonly CoordV7[] {
  const neighbors: CoordV7[] = [];
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const candidate = { x: at.x + dx, y: at.y + dy };
      if (roadKeys.has(coordKey(candidate))) neighbors.push(candidate);
    }
  return neighbors;
}

/** Cell-clipped paths and corner joins keep Roads below each cell's artwork. */
function drawRoad(
  context: CanvasRenderingContext2D,
  entry: BoardRenderPlanEntryV7,
  x: number,
  y: number,
  zoom: number,
): void {
  const half = (TILE_WIDTH * zoom) / 2;
  context.save();
  context.beginPath();
  context.rect(x - half, y - half, half * 2, half * 2);
  context.clip();
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const [color, width] of [
    ["#69472e", 8],
    ["#a57a4c", 5],
  ] as const) {
    context.strokeStyle = color;
    context.lineWidth = width * zoom;
    context.beginPath();
    for (const neighbor of entry.roadNeighbors ?? []) {
      context.moveTo(x, y);
      context.lineTo(
        x + (neighbor.x - entry.at.x) * half,
        y + (neighbor.y - entry.at.y) * half,
      );
    }
    for (const [from, to] of entry.roadJoins ?? []) {
      context.moveTo(
        x + (from.x - entry.at.x) * half * 2,
        y + (from.y - entry.at.y) * half * 2,
      );
      context.lineTo(
        x + (to.x - entry.at.x) * half * 2,
        y + (to.y - entry.at.y) * half * 2,
      );
    }
    // An isolated Road remains visible as a short dirt patch.
    if (entry.kind === "ROAD" && (entry.roadNeighbors?.length ?? 0) === 0) {
      context.moveTo(x - 4 * zoom, y);
      context.lineTo(x + 4 * zoom, y);
    }
    context.stroke();
  }
  context.restore();
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
