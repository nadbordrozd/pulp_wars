import type {
  CityState,
  Coord,
  FactionId,
  PlayerColor,
  PlayerUnitView,
  PlayerView,
} from "../../engine/index";
import type { CandyPresentation, CombatPresentation } from "../../app/types";
import type { BoardAssetBindings } from "./asset-bindings";
import type { CombatAnimationFrame } from "./combat-presentation";
import {
  archerProjectileEndpoints,
  arrowGeometry,
} from "./combat-presentation";
import {
  projectGrid,
  sameCoord,
  unitHealthBarGeometry,
  worldToScreen,
  type CameraState,
  type Point,
  type Size,
} from "./geometry";
import type { BoardRenderPlan, RenderPlanEntry } from "./render-plan";
import {
  readinessSpriteOpacity,
  unitNeedsReadinessPulse,
} from "./readiness-presentation";
import { visibleCombatPreview } from "./combat-preview-label";
import {
  selectionJumpOffsetCssPx,
  type SelectionJumpSpeed,
} from "./selection-jump-presentation";

export interface DrawBoardOptions {
  readonly context: CanvasRenderingContext2D;
  readonly viewport: Size;
  readonly camera: CameraState;
  readonly view: PlayerView;
  readonly plan: BoardRenderPlan;
  readonly assets: BoardAssetBindings;
  readonly focused: Coord | null;
  readonly devicePixelRatio: number;
  readonly combatPresentation: CombatPresentation | null;
  readonly combatFrame: CombatAnimationFrame | null;
  readonly candyPresentation?: CandyPresentation | null;
  readonly candyElapsedMs?: number;
  readonly readinessElapsedMs: number;
  readonly reducedMotion: boolean;
  readonly selectionJump?: {
    readonly unitId: number;
    readonly elapsedMs: number;
    readonly speed: SelectionJumpSpeed;
  } | null;
}

const PLAYER_COLORS: Readonly<Record<PlayerColor, string>> = {
  CORAL: "#f06762",
  TEAL: "#28b7a4",
  GOLD: "#e2b63f",
  VIOLET: "#a277d2",
};

export function drawBoard(options: DrawBoardOptions): void {
  const { context, viewport } = options;
  context.setTransform(
    options.devicePixelRatio,
    0,
    0,
    options.devicePixelRatio,
    0,
    0,
  );
  context.clearRect(0, 0, viewport.width, viewport.height);
  context.fillStyle = "#233b39";
  context.fillRect(0, 0, viewport.width, viewport.height);
  for (const entry of options.plan.entries) drawEntry(options, entry);
  if (options.combatPresentation !== null && options.combatFrame !== null) {
    drawCombatPresentation(
      options,
      options.combatPresentation,
      options.combatFrame,
    );
  }
  if (
    options.candyPresentation !== undefined &&
    options.candyPresentation !== null
  )
    drawCandyPresentation(
      options,
      options.candyPresentation,
      options.candyElapsedMs ?? 0,
    );
  if (options.focused !== null)
    drawDiamond(
      context,
      centerFor(options.camera, options.focused),
      128 * options.camera.zoom,
      74 * options.camera.zoom,
      "transparent",
      "#ffffff",
      Math.max(2, 3 * options.camera.zoom),
      [5, 5],
    );
  for (const target of options.plan.attackPreviews)
    drawCombatPreview(
      context,
      centerFor(options.camera, target.at),
      visibleCombatPreview(target.preview),
    );
}

function drawEntry(options: DrawBoardOptions, entry: RenderPlanEntry): void {
  const { context, camera, view, assets } = options;
  if (usesPreCombatSnapshot(options.combatPresentation, entry)) {
    return;
  }
  const center = centerFor(camera, entry.at);
  const ownerColor = ownerColorFor(view, entry.ownerId);
  const territoryFaction = ownerFactionFor(view, entry.ownerId);
  const assetOptions = {
    center,
    zoom: camera.zoom,
    ownerColor,
    variant: entry.variant,
  };
  switch (entry.kind) {
    case "GROUND":
      assets.drawGrass(context, assetOptions, territoryFaction);
      break;
    case "OWNERSHIP":
      drawOwnership(
        context,
        center,
        camera.zoom,
        ownerColor ?? "#fff",
        entry.ownerId,
      );
      break;
    case "ORE":
      assets.drawOre(context, assetOptions);
      break;
    case "FRUIT":
      assets.drawFruit(context, assetOptions, territoryFaction);
      break;
    case "ANIMAL":
      assets.drawAnimal(context, assetOptions, territoryFaction);
      break;
    case "MINE":
      assets.drawMine(context, assetOptions);
      break;
    case "LUMBER_MILL":
      assets.drawLumberMill(context, assetOptions);
      break;
    case "CHOCOLATE_WALL":
      assets.drawChocolateWall(context, assetOptions);
      break;
    case "CONTACT_SHADOW":
      drawContactShadow(context, center, camera.zoom);
      break;
    case "MOUNTAIN":
      assets.drawMountain(context, assetOptions, territoryFaction);
      break;
    case "FOREST":
      assets.drawForest(context, assetOptions, territoryFaction);
      break;
    case "VILLAGE":
      assets.drawVillage(context, assetOptions);
      break;
    case "CITY_BACK": {
      const city = cityById(view, entry.id);
      if (city !== undefined)
        assets.drawCityBack(
          context,
          assetOptions,
          city,
          ownerFactionFor(view, city.ownerId),
        );
      break;
    }
    case "CITY_FRONT": {
      const city = cityById(view, entry.id);
      if (city !== undefined)
        assets.drawCityFront(
          context,
          assetOptions,
          city,
          ownerFactionFor(view, city.ownerId),
        );
      break;
    }
    case "UNIT": {
      const unit = unitById(view, entry.id);
      if (unit !== undefined) {
        const jumpOffset =
          options.selectionJump?.unitId === unit.id
            ? selectionJumpOffsetCssPx(
                options.selectionJump.elapsedMs,
                options.selectionJump.speed,
                options.reducedMotion,
              ) * camera.zoom
            : 0;
        const unitAssetOptions =
          jumpOffset === 0
            ? assetOptions
            : {
                ...assetOptions,
                center: { x: center.x, y: center.y + jumpOffset },
              };
        context.save();
        if (unitNeedsReadinessPulse(view, unit)) {
          context.globalAlpha = readinessSpriteOpacity(
            options.readinessElapsedMs,
            options.reducedMotion,
          );
        }
        assets.drawUnit(
          context,
          unitAssetOptions,
          unit,
          ownerFactionFor(view, unit.ownerId),
        );
        context.restore();
        assets.drawUnitOwnerCue(context, assetOptions, unit);
      }
      break;
    }
    case "SELECTION":
      drawDiamond(
        context,
        center,
        128 * camera.zoom,
        74 * camera.zoom,
        "rgb(55 219 231 / 0.18)",
        "#6df4ff",
        Math.max(3, 5 * camera.zoom),
      );
      break;
    case "CITY_TERRITORY_BOUNDARY":
      drawTerritoryBoundary(
        context,
        center,
        camera.zoom,
        entry.variant,
        ownerColor,
      );
      break;
    case "MOVE_TARGET":
      drawTarget(
        context,
        center,
        camera.zoom,
        "#8aff80",
        "MOVE",
        isStopTile(view, entry.at),
      );
      break;
    case "ATTACK_TARGET":
      drawTarget(context, center, camera.zoom, "#ff6d78", "ATTACK", false);
      break;
    case "MINE_TARGET":
      drawTarget(context, center, camera.zoom, "#ffe36b", "MINE", false);
      break;
    case "ROLL_TARGET":
      drawTarget(context, center, camera.zoom, "#ff9dcf", "ROLL", false);
      break;
    case "WALL_TARGET":
      drawTarget(context, center, camera.zoom, "#c98555", "WALL · 1★", false);
      break;
    case "ROLL_PATH":
      drawPathStep(context, center, camera.zoom);
      break;
    case "ROLL_VICTIM":
      drawTarget(context, center, camera.zoom, "#ff5968", "−10", false);
      break;
    case "PATH":
      drawPathStep(context, center, camera.zoom);
      break;
    case "UNIT_STATUS": {
      const unit = unitById(view, entry.id);
      if (unit !== undefined)
        drawUnitStatus(context, center, camera.zoom, unit);
      break;
    }
    case "CHOCOLATE_WALL_STATUS": {
      const wall = view.chocolateWalls.find(
        (candidate) => candidate.id === entry.id,
      );
      if (wall !== undefined)
        drawUnitHealthBar(context, center, camera.zoom, wall);
      break;
    }
    case "CITY_STATUS": {
      const city = cityById(view, entry.id);
      if (city !== undefined)
        drawCityStatus(context, center, camera.zoom, city, view, ownerColor);
      break;
    }
    case "FOG":
      drawFog(context, center, camera.zoom, entry.variant);
      break;
  }
}

export function usesPreCombatSnapshot(
  presentation: CombatPresentation | null,
  entry: Pick<RenderPlanEntry, "kind" | "id">,
): boolean {
  return (
    presentation !== null &&
    (presentation.kind === "STANDARD" || presentation.phase === "FLIGHT") &&
    (entry.kind === "CONTACT_SHADOW" ||
      entry.kind === "UNIT" ||
      entry.kind === "UNIT_STATUS") &&
    (entry.id === presentation.attacker?.id ||
      entry.id === presentation.defender.id)
  );
}

function drawTerritoryBoundary(
  context: CanvasRenderingContext2D,
  center: Point,
  zoom: number,
  edge: number,
  ownerColor: string | null,
): void {
  const halfWidth = (128 * zoom) / 2;
  const halfHeight = (74 * zoom) / 2;
  const points = [
    { x: center.x - halfWidth, y: center.y },
    { x: center.x, y: center.y - halfHeight },
    { x: center.x + halfWidth, y: center.y },
    { x: center.x, y: center.y + halfHeight },
  ];
  const start = points[edge];
  const end = points[(edge + 1) % points.length];
  if (start === undefined || end === undefined) return;
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = ownerColor ?? "#6df4ff";
  context.lineWidth = Math.max(5, 7 * zoom);
  context.shadowColor = "rgb(109 244 255 / 0.9)";
  context.shadowBlur = Math.max(4, 7 * zoom);
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();
  context.restore();
}

function drawCombatPresentation(
  options: DrawBoardOptions,
  presentation: CombatPresentation,
  frame: CombatAnimationFrame,
): void {
  if (presentation.kind === "ARCHER_ARROW") {
    drawArcherCombatPresentation(options, presentation, frame);
    return;
  }
  const { context, camera, assets, view } = options;
  const targetCenter = centerFor(camera, presentation.defender.at);
  const sourceCenter =
    presentation.attacker === null
      ? null
      : centerFor(camera, presentation.attacker.at);
  const attackerCenter =
    sourceCenter === null
      ? null
      : {
          x:
            sourceCenter.x +
            (targetCenter.x - sourceCenter.x) * frame.attackerTravel,
          y:
            sourceCenter.y +
            (targetCenter.y - sourceCenter.y) * frame.attackerTravel,
        };
  const impactShake =
    presentation.phase === "IMPACT" && presentation.motion === "FULL"
      ? Math.sin(frame.impact * Math.PI * 8) * 7 * frame.impact * camera.zoom
      : 0;

  context.save();
  if (attackerCenter !== null && presentation.attacker !== null) {
    context.globalAlpha = frame.attackerOpacity;
    drawContactShadow(context, attackerCenter, camera.zoom);
    assets.drawUnit(
      context,
      {
        center: attackerCenter,
        zoom: camera.zoom,
        ownerColor: ownerColorFor(view, presentation.attacker.ownerId),
        variant: 0,
      },
      presentation.attacker,
      ownerFactionFor(view, presentation.attacker.ownerId),
    );
    context.restore();
    assets.drawUnitOwnerCue(
      context,
      {
        center: attackerCenter,
        zoom: camera.zoom,
        ownerColor: ownerColorFor(view, presentation.attacker.ownerId),
        variant: 0,
      },
      presentation.attacker,
    );
  } else {
    context.restore();
  }

  context.save();
  context.globalAlpha = frame.defenderOpacity;
  const shakenTarget = { x: targetCenter.x + impactShake, y: targetCenter.y };
  drawContactShadow(context, shakenTarget, camera.zoom);
  assets.drawUnit(
    context,
    {
      center: shakenTarget,
      zoom: camera.zoom,
      ownerColor: ownerColorFor(view, presentation.defender.ownerId),
      variant: 0,
    },
    presentation.defender,
    ownerFactionFor(view, presentation.defender.ownerId),
  );
  context.restore();
  assets.drawUnitOwnerCue(
    context,
    {
      center: shakenTarget,
      zoom: camera.zoom,
      ownerColor: ownerColorFor(view, presentation.defender.ownerId),
      variant: 0,
    },
    presentation.defender,
  );

  if (presentation.phase === "IMPACT") {
    drawImpactBurst(context, targetCenter, camera.zoom, frame.impact);
    drawDamageLabel(
      context,
      targetCenter,
      camera.zoom,
      `-${presentation.damageToDefender} HP${presentation.defenderDies ? " · KO" : ""}`,
      frame.impact,
      "#ff7279",
    );
    if (presentation.damageToAttacker > 0 && sourceCenter !== null) {
      drawDamageLabel(
        context,
        sourceCenter,
        camera.zoom,
        `-${presentation.damageToAttacker} return${presentation.attackerDies ? " · KO" : ""}`,
        frame.impact,
        "#ffd36e",
      );
    }
  }
}

function drawArcherCombatPresentation(
  options: DrawBoardOptions,
  presentation: CombatPresentation,
  frame: CombatAnimationFrame,
): void {
  const attacker = presentation.attacker;
  if (attacker === null) return;
  const { context, camera, assets } = options;
  const attackerGround = centerFor(camera, attacker.at);
  const defenderGround = centerFor(camera, presentation.defender.at);
  const endpoints = archerProjectileEndpoints(
    attackerGround,
    defenderGround,
    camera.zoom,
    presentation.projectile ?? "ARROW",
  );

  if (presentation.phase === "FLIGHT") {
    drawSnapshotUnit(options, attackerGround, attacker, 1);
    drawSnapshotUnit(options, defenderGround, presentation.defender, 1);
    if (presentation.projectile === "GUMBALL")
      drawGumball(context, endpoints, frame.arrowTravel, camera.zoom);
    else
      drawArrow(
        context,
        arrowGeometry(endpoints, frame.arrowTravel, camera.zoom),
      );
    return;
  }

  // The authoritative post-event board has already been drawn at the impact
  // boundary. Crossfade the public pre-event sprites over it for one short,
  // bounded beat; status/HP and death are therefore visible from this frame.
  if (frame.preCombatOpacity > 0) {
    drawSnapshotUnit(
      options,
      attackerGround,
      attacker,
      frame.preCombatOpacity,
      false,
    );
    drawSnapshotUnit(
      options,
      defenderGround,
      presentation.defender,
      frame.preCombatOpacity,
      false,
    );
  }
  const torso = endpoints.to;
  drawArcherImpactRing(context, torso, camera.zoom, frame.impact);
  drawDamageLabel(
    context,
    defenderGround,
    camera.zoom,
    `-${presentation.damageToDefender} HP${presentation.defenderDies ? " · KO" : ""}`,
    frame.impact,
    "#ff7279",
  );
  if (presentation.damageToAttacker > 0) {
    drawDamageLabel(
      context,
      attackerGround,
      camera.zoom,
      `-${presentation.damageToAttacker} return${presentation.attackerDies ? " · KO" : ""}`,
      frame.impact,
      "#ffd36e",
    );
  }

  function drawSnapshotUnit(
    nestedOptions: DrawBoardOptions,
    center: Point,
    unit: PlayerUnitView,
    opacity: number,
    ownerCue = true,
  ): void {
    const nestedContext = nestedOptions.context;
    const assetOptions = {
      center,
      zoom: nestedOptions.camera.zoom,
      ownerColor: ownerColorFor(nestedOptions.view, unit.ownerId),
      variant: 0,
    };
    nestedContext.save();
    nestedContext.globalAlpha = opacity;
    drawContactShadow(nestedContext, center, nestedOptions.camera.zoom);
    assets.drawUnit(
      nestedContext,
      assetOptions,
      unit,
      ownerFactionFor(nestedOptions.view, unit.ownerId),
    );
    nestedContext.restore();
    if (ownerCue) assets.drawUnitOwnerCue(nestedContext, assetOptions, unit);
  }
}

function drawGumball(
  context: CanvasRenderingContext2D,
  endpoints: { readonly from: Point; readonly to: Point },
  progress: number,
  zoom: number,
): void {
  const at = {
    x: endpoints.from.x + (endpoints.to.x - endpoints.from.x) * progress,
    y: endpoints.from.y + (endpoints.to.y - endpoints.from.y) * progress,
  };
  context.save();
  context.fillStyle = "#ff5f9e";
  context.strokeStyle = "#3d2032";
  context.lineWidth = Math.max(1.5, Math.min(3.5, 2 * zoom));
  context.beginPath();
  context.arc(at.x, at.y, Math.max(4, Math.min(9, 5 * zoom)), 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function drawCandyPresentation(
  options: DrawBoardOptions,
  presentation: CandyPresentation,
  elapsedMs: number,
): void {
  const progress = Math.max(
    0,
    Math.min(1, elapsedMs / presentation.durationMs),
  );
  const { context, camera, assets, view } = options;
  if (presentation.kind === "DONUT_ROLL") {
    if (presentation.steps.length === 0) return;
    const scaled = progress * presentation.steps.length;
    const index = Math.min(presentation.steps.length - 1, Math.floor(scaled));
    const step = presentation.steps[index];
    if (step === undefined) return;
    const previous =
      index === 0 ? presentation.actor.at : presentation.steps[index - 1]?.at;
    if (previous === undefined) return;
    const local =
      presentation.motion === "REDUCED" ? 1 : scaled - Math.floor(scaled);
    const from = centerFor(camera, previous);
    const to = centerFor(camera, step.at);
    const center = {
      x: from.x + (to.x - from.x) * local,
      y: from.y + (to.y - from.y) * local,
    };
    context.save();
    context.translate(center.x, center.y);
    context.rotate(progress * Math.PI * 8);
    context.translate(-center.x, -center.y);
    assets.drawUnit(
      context,
      {
        center,
        zoom: camera.zoom,
        ownerColor: ownerColorFor(view, presentation.actor.ownerId),
        variant: 0,
      },
      presentation.actor,
      ownerFactionFor(view, presentation.actor.ownerId),
    );
    context.restore();
    if (step.damage > 0) {
      drawImpactBurst(context, to, camera.zoom, 1 - Math.abs(local - 0.82) * 3);
      drawDamageLabel(
        context,
        to,
        camera.zoom,
        `-${step.damage} HP${step.targetDies ? " · KO" : ""}`,
        1,
        "#ff7279",
      );
    }
    return;
  }
  const center = centerFor(camera, presentation.at);
  if (presentation.kind === "WALL_HIT") {
    drawImpactBurst(context, center, camera.zoom, 1 - progress * 0.7);
    drawDamageLabel(
      context,
      center,
      camera.zoom,
      `-${presentation.damage} HP${presentation.targetDies ? " · Destroyed" : ""}`,
      1 - progress * 0.35,
      "#ff7279",
    );
    return;
  }
  context.save();
  context.globalAlpha =
    presentation.motion === "REDUCED" ? 1 - progress * 0.35 : 1 - progress;
  context.fillStyle = presentation.kind === "CANDIFY" ? "#ff7fc8" : "#8b4f35";
  const radius =
    (presentation.kind === "CANDIFY" ? 58 : 38) *
    camera.zoom *
    (0.25 + progress * 0.75);
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawArrow(
  context: CanvasRenderingContext2D,
  geometry: ReturnType<typeof arrowGeometry>,
): void {
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#18272a";
  context.lineWidth = geometry.outlineWidth * 2 + 2;
  context.beginPath();
  context.moveTo(geometry.tail.x, geometry.tail.y);
  context.lineTo(geometry.shaftEnd.x, geometry.shaftEnd.y);
  context.stroke();
  context.strokeStyle = "#f3d58b";
  context.lineWidth = Math.max(1.5, geometry.outlineWidth);
  context.stroke();
  context.fillStyle = "#d99645";
  context.strokeStyle = "#18272a";
  context.lineWidth = geometry.outlineWidth;
  context.beginPath();
  context.moveTo(geometry.tip.x, geometry.tip.y);
  context.lineTo(geometry.headLeft.x, geometry.headLeft.y);
  context.lineTo(geometry.headRight.x, geometry.headRight.y);
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

function drawArcherImpactRing(
  context: CanvasRenderingContext2D,
  center: Point,
  zoom: number,
  intensity: number,
): void {
  const progress = 1 - intensity;
  const radius =
    Math.min(22, Math.max(8, 22 * zoom)) * (0.45 + progress * 0.55);
  context.save();
  context.globalAlpha = Math.max(0, intensity);
  context.strokeStyle = "#fff3a2";
  context.lineWidth = Math.max(1.5, 3 * zoom * intensity);
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawImpactBurst(
  context: CanvasRenderingContext2D,
  center: Point,
  zoom: number,
  intensity: number,
): void {
  context.save();
  context.globalAlpha = Math.max(0.18, intensity);
  context.strokeStyle = "#fff3a2";
  context.fillStyle = "rgb(255 116 90 / 0.38)";
  context.lineWidth = Math.max(2, 5 * zoom * intensity);
  context.beginPath();
  context.arc(center.x, center.y - 18 * zoom, 24 * zoom, 0, Math.PI * 2);
  context.fill();
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8;
    const inner = 18 * zoom;
    const outer = (34 + 14 * intensity) * zoom;
    context.beginPath();
    context.moveTo(
      center.x + Math.cos(angle) * inner,
      center.y - 18 * zoom + Math.sin(angle) * inner,
    );
    context.lineTo(
      center.x + Math.cos(angle) * outer,
      center.y - 18 * zoom + Math.sin(angle) * outer,
    );
    context.stroke();
  }
  context.restore();
}

function drawDamageLabel(
  context: CanvasRenderingContext2D,
  center: Point,
  zoom: number,
  label: string,
  intensity: number,
  color: string,
): void {
  const y = center.y - (88 + 18 * (1 - intensity)) * zoom;
  context.save();
  context.globalAlpha = Math.max(0.25, intensity);
  context.font = `900 ${Math.max(13, 16 * zoom)}px system-ui`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const width = context.measureText(label).width + 18;
  context.fillStyle = "rgb(24 21 26 / 0.92)";
  context.fillRect(center.x - width / 2, y - 13, width, 27);
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.strokeRect(center.x - width / 2, y - 13, width, 27);
  context.fillStyle = "#fff";
  context.fillText(label, center.x, y + 1);
  context.restore();
}

function drawOwnership(
  context: CanvasRenderingContext2D,
  center: Point,
  zoom: number,
  color: string,
  ownerId: number | null,
): void {
  context.save();
  context.globalAlpha = 0.22;
  drawDiamond(context, center, 121 * zoom, 68 * zoom, color, color, 2 * zoom);
  context.globalAlpha = 0.75;
  context.setLineDash(
    ownerId === null ? [] : ownerId % 2 === 0 ? [9, 5] : [3, 4],
  );
  drawDiamond(
    context,
    center,
    118 * zoom,
    65 * zoom,
    "transparent",
    color,
    Math.max(2, 3 * zoom),
  );
  context.restore();
}

function drawContactShadow(
  context: CanvasRenderingContext2D,
  center: Point,
  zoom: number,
): void {
  context.save();
  context.globalAlpha = 0.28;
  context.fillStyle = "#10201e";
  context.beginPath();
  context.ellipse(
    center.x,
    center.y + 2 * zoom,
    29 * zoom,
    10 * zoom,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();
}

function drawTarget(
  context: CanvasRenderingContext2D,
  center: Point,
  zoom: number,
  color: string,
  symbol: "MOVE" | "ATTACK" | "MINE" | "ROLL" | "WALL · 1★" | "−10",
  stopped: boolean,
): void {
  drawDiamond(
    context,
    center,
    106 * zoom,
    60 * zoom,
    "transparent",
    color,
    Math.max(3, 4 * zoom),
  );
  context.save();
  context.fillStyle = color;
  context.strokeStyle = "#18272a";
  context.lineWidth = Math.max(2, 3 * zoom);
  context.beginPath();
  context.arc(center.x, center.y, 9 * zoom, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  if (symbol === "ATTACK") {
    context.beginPath();
    context.moveTo(center.x - 8 * zoom, center.y - 15 * zoom);
    context.lineTo(center.x + 8 * zoom, center.y + 15 * zoom);
    context.moveTo(center.x + 8 * zoom, center.y - 15 * zoom);
    context.lineTo(center.x - 8 * zoom, center.y + 15 * zoom);
    context.stroke();
  }
  if (stopped) {
    context.fillStyle = "#18272a";
    context.font = `900 ${Math.max(10, 12 * zoom)}px system-ui`;
    context.textAlign = "center";
    context.fillText("STOP", center.x, center.y + 27 * zoom);
  }
  context.restore();
}

function drawPathStep(
  context: CanvasRenderingContext2D,
  center: Point,
  zoom: number,
): void {
  context.save();
  context.fillStyle = "#f9fbdf";
  context.strokeStyle = "#223034";
  context.lineWidth = Math.max(1.5, 2 * zoom);
  context.beginPath();
  context.arc(center.x, center.y, 6 * zoom, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function drawUnitStatus(
  context: CanvasRenderingContext2D,
  center: Point,
  zoom: number,
  unit: PlayerUnitView,
): void {
  context.save();
  drawUnitHealthBar(context, center, zoom, unit);
  const markerY = center.y - 48 * zoom;
  if (unit.captureEligible || (!unit.veteran && unit.kills >= 3)) {
    context.fillStyle = "#fff2a6";
    context.font = "900 12px system-ui";
    context.fillText(unit.captureEligible ? "旗" : "★", center.x - 31, markerY);
  }
  context.restore();
}

export function drawUnitHealthBar(
  context: CanvasRenderingContext2D,
  center: Point,
  zoom: number,
  unit: Pick<PlayerUnitView, "hp" | "maxHp">,
): void {
  const health = unitHealthBarGeometry(center, zoom, unit.hp / unit.maxHp);
  context.fillStyle = "#172326";
  context.fillRect(
    health.background.left,
    health.background.top,
    health.background.width,
    health.background.height,
  );
  context.fillStyle = unit.hp / unit.maxHp > 0.5 ? "#70dc6e" : "#ff6d68";
  context.fillRect(
    health.fill.left,
    health.fill.top,
    health.fill.width,
    health.fill.height,
  );
}

function drawCityStatus(
  context: CanvasRenderingContext2D,
  center: Point,
  zoom: number,
  city: CityState,
  view: PlayerView,
  ownerColor: string | null,
): void {
  const besieged = view.units.some(
    (unit) => unit.ownerId !== city.ownerId && sameCoord(unit.at, city.at),
  );
  const labelY = center.y + 38 * zoom;
  context.save();
  context.font = `800 ${Math.max(10, Math.min(14, 12 * zoom))}px system-ui`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const label = `City ${city.id} · L${city.level}`;
  const width = context.measureText(label).width + 16;
  context.fillStyle = "rgb(17 26 29 / 0.9)";
  context.fillRect(center.x - width / 2, labelY - 10, width, 21);
  context.strokeStyle = ownerColor ?? "#fff";
  context.lineWidth = 2;
  context.strokeRect(center.x - width / 2, labelY - 10, width, 21);
  context.fillStyle = "#fff";
  context.fillText(label, center.x, labelY + 1);
  const highY = center.y - (Math.min(3, city.level) * 18 + 78) * zoom;
  if (city.isCapital) {
    context.fillStyle = "#ffe16b";
    context.font = "900 18px system-ui";
    context.fillText("♛", center.x, highY);
  }
  if (besieged) {
    badge(context, center.x + 27, highY, "!", "#ff6268");
  }
  if (city.level >= 4) {
    badge(
      context,
      center.x + 28,
      center.y - 78 * zoom,
      String(city.level),
      "#6df4ff",
    );
  }
  context.restore();
}

function drawFog(
  context: CanvasRenderingContext2D,
  center: Point,
  zoom: number,
  variant: number,
): void {
  drawDiamond(
    context,
    center,
    130 * zoom,
    76 * zoom,
    "#58676c",
    "#d2d8d4",
    Math.max(2, 2 * zoom),
  );
  context.save();
  context.fillStyle = "#77878c";
  const shift = (variant - 1.5) * 5 * zoom;
  for (const [dx, dy, radius] of [
    [-29, 0, 18],
    [-8, -7, 24],
    [18, 0, 20],
    [36, 5, 14],
  ] as const) {
    context.beginPath();
    context.arc(
      center.x + dx * zoom + shift,
      center.y + dy * zoom,
      radius * zoom,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.restore();
}

function drawCombatPreview(
  context: CanvasRenderingContext2D,
  center: Point,
  label: string,
): void {
  const lines = label.split("\n");
  context.save();
  context.font = "900 12px system-ui";
  context.textAlign = "center";
  const width =
    Math.max(...lines.map((line) => context.measureText(line).width)) + 18;
  context.fillStyle = "rgb(32 18 24 / 0.94)";
  context.fillRect(center.x - width / 2, center.y - 128, width, 46);
  context.strokeStyle = "#ff7880";
  context.lineWidth = 2;
  context.strokeRect(center.x - width / 2, center.y - 128, width, 46);
  context.fillStyle = "#fff";
  context.textBaseline = "middle";
  lines.forEach((line, index) =>
    context.fillText(line, center.x, center.y - 115 + index * 18),
  );
  context.restore();
}

function drawDiamond(
  context: CanvasRenderingContext2D,
  center: Point,
  width: number,
  height: number,
  fill: string,
  stroke: string,
  lineWidth: number,
  dash: readonly number[] = [],
): void {
  context.save();
  context.beginPath();
  context.moveTo(center.x, center.y - height / 2);
  context.lineTo(center.x + width / 2, center.y);
  context.lineTo(center.x, center.y + height / 2);
  context.lineTo(center.x - width / 2, center.y);
  context.closePath();
  if (fill !== "transparent") {
    context.fillStyle = fill;
    context.fill();
  }
  context.strokeStyle = stroke;
  context.lineWidth = lineWidth;
  context.setLineDash([...dash]);
  context.stroke();
  context.restore();
}

function badge(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
): void {
  context.fillStyle = color;
  context.strokeStyle = "#172326";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x, y, 10, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = "#172326";
  context.font = "900 10px system-ui";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, x, y + 0.5);
}

function centerFor(camera: CameraState, at: Coord): Point {
  return worldToScreen(projectGrid(at), camera);
}

function ownerColorFor(
  view: PlayerView,
  ownerId: number | null,
): string | null {
  if (ownerId === null) return null;
  const player = view.players.find((candidate) => candidate.id === ownerId);
  return player === undefined ? null : PLAYER_COLORS[player.color];
}

function ownerFactionFor(view: PlayerView, ownerId: number | null): FactionId {
  if (ownerId === null) return "ORIGINAL";
  return (
    view.players.find((candidate) => candidate.id === ownerId)?.faction ??
    "ORIGINAL"
  );
}

function cityById(view: PlayerView, id: number): CityState | undefined {
  return view.cities.find((city) => city.id === id);
}

function unitById(view: PlayerView, id: number): PlayerUnitView | undefined {
  return view.units.find((unit) => unit.id === id);
}

function isStopTile(view: PlayerView, at: Coord): boolean {
  const tile = view.board.tiles.find((candidate) =>
    sameCoord(candidate.at, at),
  );
  if (tile?.explored === true && tile.terrain === "MOUNTAIN") return true;
  return view.units.some(
    (unit) =>
      unit.ownerId !== view.viewer.id &&
      Math.max(Math.abs(unit.at.x - at.x), Math.abs(unit.at.y - at.y)) === 1,
  );
}
