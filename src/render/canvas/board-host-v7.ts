import type {
  CoordV7,
  PlayerEventEnvelopeV7,
  PlayerViewV7,
} from "../../engine/index";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  centerCameraOn,
  fitCamera,
  panCamera,
  pickGridTile,
  projectGrid,
  screenToWorld,
  worldToScreen,
  zoomCameraAt,
  type CameraState,
  type Point,
  type Size,
} from "./geometry";
import {
  buildBoardRenderPlanV7,
  createBoardImageResolverV7,
  drawBoardV7,
  type BoardImageResolverV7,
  type BoardRenderInteractionV7,
  type BoardSelectionV7,
  type BoardRenderPlanV7,
  type MapCommandTargetV7,
} from "./board-renderer-v7";
import { corePresentationPlanV7 } from "./presentation-plan-v7";
import { selectionJumpDurationMs } from "./selection-jump-presentation";
import {
  archerProjectileEndpoints,
  arrowGeometry,
} from "./combat-presentation";
import { BoardGlowCacheV7 } from "./glow-cache-v7";
import {
  drawSupportFeedbackV7,
  type SupportFeedbackV7,
} from "./support-presentation-v7";

export interface BoardHostModelV7 {
  readonly matchInstanceId: string | number;
  readonly view: PlayerViewV7;
  readonly offeredCommands: Parameters<typeof buildBoardRenderPlanV7>[1];
  readonly interaction: BoardRenderInteractionV7;
  readonly interactive: boolean;
  readonly motion: "FULL" | "REDUCED";
  readonly animationSpeed: "NORMAL" | "FAST";
  readonly presentationPaused: boolean;
  readonly highContrast: boolean;
}

export interface BoardHostCallbacksV7 {
  readonly onSelection: (selection: BoardSelectionV7 | null) => void;
  readonly onCommand: (target: MapCommandTargetV7) => void;
}

export interface BoardHostV7 {
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void;
  update(model: BoardHostModelV7): void;
  activate(at: CoordV7): void;
  resetInspectionCycle?(): void;
  zoom(direction: "IN" | "OUT"): void;
  focus(): void;
  presentBoundary?(
    before: PlayerViewV7,
    after: PlayerViewV7,
    events: PlayerEventEnvelopeV7,
  ): Promise<void>;
  finishPresentations?(): void;
  destroy(): void;
}

export class CanvasBoardHostV7 implements BoardHostV7 {
  readonly #document: Document;
  readonly #images: BoardImageResolverV7;
  readonly #glowCache: BoardGlowCacheV7;
  readonly #planCache: {
    view: PlayerViewV7;
    commands: BoardHostModelV7["offeredCommands"];
    interactionKey: string;
    plan: BoardRenderPlanV7;
  }[] = [];
  #drawSerial = 0;
  #canvas: HTMLCanvasElement | null = null;
  #context: CanvasRenderingContext2D | null = null;
  #effectsCanvas: HTMLCanvasElement | null = null;
  #effectsContext: CanvasRenderingContext2D | null = null;
  #description: HTMLElement | null = null;
  #callbacks: BoardHostCallbacksV7 | null = null;
  #model: BoardHostModelV7 | null = null;
  #viewport: Size = { width: 1024, height: 640 };
  #camera: CameraState = { offsetX: 0, offsetY: 0, zoom: 1 };
  #focused: CoordV7 | null = null;
  #boardKey: string | null = null;
  #pointer: { id: number; start: Point; current: Point } | null = null;
  readonly #pointers = new Map<number, Point>();
  #pinch: { readonly distance: number; readonly midpoint: Point } | null = null;
  #resizeObserver: ResizeObserver | null = null;
  #animatedUnit: { readonly id: number; readonly at: CoordV7 } | null = null;
  #animationFrame: number | null = null;
  #animationResolve: (() => void) | null = null;
  #presentationToken = 0;
  #cameraFollowAllowed = false;
  #ambientFrame: number | null = null;
  #readinessStartedAt = 0;
  #readinessKey: string | null = null;
  #selectionJump: {
    readonly unitId: number;
    readonly startedAt: number;
  } | null = null;
  #presentedView: PlayerViewV7 | null = null;
  #projectile: {
    readonly from: CoordV7;
    readonly to: CoordV7;
    readonly progress: number;
    readonly catapult: boolean;
  } | null = null;
  #impact: {
    readonly at: CoordV7;
    readonly shakeCssPx: number;
    readonly flashAlpha: number;
  } | null = null;
  #statusPulse: {
    readonly at: CoordV7;
    readonly progress: number;
    readonly statusId: string;
  } | null = null;
  #supportFeedback: SupportFeedbackV7 | null = null;
  #crossfade: {
    readonly before: PlayerViewV7;
    readonly after: PlayerViewV7;
    readonly progress: number;
  } | null = null;
  #modelInstance: string | number | null = null;
  #inspectionCycle: {
    readonly at: CoordV7;
    readonly occupantUnitId: number;
    readonly next: "UNDERLYING" | "UNIT";
  } | null = null;
  #observedCommandIndex: number | null = null;

  constructor(documentRoot: Document) {
    this.#document = documentRoot;
    this.#glowCache = new BoardGlowCacheV7(documentRoot);
    this.#images = createBoardImageResolverV7(documentRoot, () => {
      this.#glowCache.clear();
      this.#draw();
    });
  }

  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    this.#detach();
    this.#callbacks = callbacks;
    const canvas = this.#document.createElement("canvas");
    const effectsCanvas = this.#document.createElement("canvas");
    const description = this.#document.createElement("p");
    description.id = `ruleset7-map-cursor-${nextDescriptionIdV7++}`;
    description.className = "sr-only";
    description.setAttribute("aria-live", "polite");
    canvas.className = "board-canvas board-canvas-v7";
    canvas.tabIndex = 0;
    canvas.dataset.focusId = "board-v7";
    canvas.setAttribute("role", "application");
    canvas.setAttribute(
      "aria-label",
      "Ruleset 7 square-grid battlefield. Arrow keys move the map cursor; Enter or Space activates; drag pans; plus or minus zooms.",
    );
    canvas.setAttribute("aria-describedby", description.id);
    canvas.style.touchAction = "none";
    effectsCanvas.className = "board-effects-canvas-v7";
    effectsCanvas.setAttribute("aria-hidden", "true");
    canvas.addEventListener("pointerdown", this.#onPointerDown);
    canvas.addEventListener("pointermove", this.#onPointerMove);
    canvas.addEventListener("pointerup", this.#onPointerUp);
    canvas.addEventListener("pointercancel", this.#onPointerCancel);
    canvas.addEventListener("wheel", this.#onWheel, { passive: false });
    canvas.addEventListener("keydown", this.#onKeyDown);
    container.replaceChildren(canvas, description, effectsCanvas);
    this.#canvas = canvas;
    this.#effectsCanvas = effectsCanvas;
    this.#description = description;
    try {
      this.#context = canvas.getContext("2d");
      this.#effectsContext = effectsCanvas.getContext("2d");
    } catch {
      this.#context = null;
      this.#effectsContext = null;
    }
    if (typeof ResizeObserver !== "undefined") {
      this.#resizeObserver = new ResizeObserver(() => this.#resize(container));
      this.#resizeObserver.observe(container);
    }
    this.#resize(container);
  }

  update(model: BoardHostModelV7): void {
    const priorSelectedUnitId = this.#model?.interaction.selectedUnitId ?? null;
    if (
      this.#modelInstance !== null &&
      this.#modelInstance !== model.matchInstanceId
    )
      this.finishPresentations();
    if (this.#modelInstance !== model.matchInstanceId)
      this.#inspectionCycle = null;
    if (
      this.#observedCommandIndex !== null &&
      this.#observedCommandIndex !== model.view.commandIndex
    )
      this.#inspectionCycle = null;
    this.#observedCommandIndex = model.view.commandIndex;
    this.#modelInstance = model.matchInstanceId;
    this.#model = model;
    const activePlayerId = model.view.turnOrder[model.view.activeSeatIndex];
    const readinessKey = `${String(model.matchInstanceId)}:${model.view.round}:${activePlayerId ?? "none"}`;
    if (readinessKey !== this.#readinessKey) {
      this.#readinessKey = readinessKey;
      this.#readinessStartedAt = this.#now();
    }
    if (
      model.interaction.selectedUnitId !== priorSelectedUnitId &&
      model.interaction.selectedUnitId !== null &&
      model.motion === "FULL" &&
      model.interactive
    )
      this.#selectionJump = {
        unitId: model.interaction.selectedUnitId,
        startedAt: this.#now(),
      };
    else if (
      model.interaction.selectedUnitId === null ||
      !model.interactive ||
      model.motion === "REDUCED"
    )
      this.#selectionJump = null;
    if (
      this.#inspectionCycle !== null &&
      !model.view.units.some(
        (unit) =>
          same(unit.at, this.#inspectionCycle?.at ?? unit.at) &&
          unit.id === this.#inspectionCycle?.occupantUnitId,
      )
    )
      this.#inspectionCycle = null;
    const key = `${String(model.matchInstanceId)}:${model.view.board.width}x${model.view.board.height}`;
    if (this.#boardKey !== key) {
      this.#boardKey = key;
      this.#camera = fitCamera(model.view.board, this.#viewport);
      const capital = model.view.cities.find(
        (city) => city.ownerId === model.view.viewer.id && city.isCapital,
      );
      this.#focused = capital?.at ?? model.view.cities[0]?.at ?? { x: 0, y: 0 };
      if (this.#focused !== null)
        this.#camera = centerCameraOn(
          this.#camera,
          projectGrid(this.#focused),
          this.#viewport,
        );
    }
    this.#describe();
    this.#draw();
    this.#syncAmbientFrame();
  }

  activate(at: CoordV7): void {
    this.#focused = at;
    const serial = this.#drawSerial;
    this.#activate(at);
    this.#describe();
    if (serial === this.#drawSerial) this.#draw();
  }

  zoom(direction: "IN" | "OUT"): void {
    this.#cameraFollowAllowed = false;
    const factor = direction === "IN" ? 1.2 : 1 / 1.2;
    this.#camera = zoomCameraAt(
      this.#camera,
      Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.#camera.zoom * factor)),
      { x: this.#viewport.width / 2, y: this.#viewport.height / 2 },
    );
    this.#draw();
  }

  focus(): void {
    this.#canvas?.focus();
  }

  resetInspectionCycle(): void {
    this.#inspectionCycle = null;
  }

  destroy(): void {
    this.finishPresentations();
    this.#detach();
    this.#model = null;
    this.#planCache.length = 0;
    this.#glowCache.clear();
  }

  finishPresentations(redraw = true): void {
    this.#cameraFollowAllowed = false;
    this.#presentationToken += 1;
    if (this.#animationFrame !== null)
      this.#document.defaultView?.cancelAnimationFrame(this.#animationFrame);
    this.#animationFrame = null;
    this.#presentedView = null;
    this.#animatedUnit = null;
    this.#projectile = null;
    this.#impact = null;
    this.#statusPulse = null;
    this.#supportFeedback = null;
    this.#drawSupportOverlay();
    this.#crossfade = null;
    this.#selectionJump = null;
    const resolve = this.#animationResolve;
    this.#animationResolve = null;
    resolve?.();
    if (redraw) this.#draw();
  }

  async presentBoundary(
    before: PlayerViewV7,
    after: PlayerViewV7,
    envelope: PlayerEventEnvelopeV7,
  ): Promise<void> {
    this.finishPresentations(false);
    this.#cancelAmbientFrame();
    const token = this.#presentationToken;
    this.#inspectionCycle = null;
    const model = this.#model;
    if (model === null) return;
    const steps = corePresentationPlanV7(before, envelope, after);
    if (steps.length === 0) return;
    this.#cameraFollowAllowed = this.#pointers.size === 0;
    const durationScale = model.animationSpeed === "FAST" ? 0.5 : 1;
    this.#presentedView = before;
    if (model.motion === "REDUCED") {
      // Reduced motion frames the final public location once, without travel.
      const focus = [...steps]
        .reverse()
        .find(
          (step) =>
            step.kind === "BUILD" ||
            (step.kind === "MOVE" && step.followCamera),
        );
      const at =
        focus?.kind === "BUILD"
          ? focus.at
          : focus?.kind === "MOVE"
            ? focus.path.at(-1)
            : undefined;
      if (at !== undefined) this.#followCamera(at);
      const supportSteps = steps.filter((step) => step.kind === "SUPPORT");
      if (supportSteps.length > 0) {
        this.#presentedView = after;
        this.#draw();
        for (const step of supportSteps) {
          await this.#animate(100 * durationScale, () => {
            this.#supportFeedback = {
              effect: step.effect,
              actor: step.actor,
              recipients: step.recipients,
              progress: 0.5,
            };
            this.#drawSupportOverlay();
          });
          if (token !== this.#presentationToken) return;
          this.#supportFeedback = null;
          this.#drawSupportOverlay();
        }
        if (supportSteps.length === steps.length) {
          this.#presentedView = null;
          this.#draw();
          return;
        }
      }
      this.#crossfade = { before, after, progress: 0 };
      await this.#animate(100 * durationScale, (progress) => {
        this.#crossfade = { before, after, progress };
        this.#draw();
      });
      if (token !== this.#presentationToken) return;
      this.#crossfade = null;
      this.#presentedView = null;
      this.#draw();
      return;
    }
    for (const step of steps) {
      if (step.kind === "MOVE") {
        this.#presentedView = after;
        const unit = before.units.find(
          (candidate) => candidate.id === step.unitId,
        );
        if (
          step.followCamera &&
          unit !== undefined &&
          !after.units.some((candidate) => candidate.id === unit.id)
        )
          this.#presentedView = { ...after, units: [...after.units, unit] };
        await this.#animatePath(
          step.unitId,
          step.path,
          step.durationMs * durationScale,
          step.followCamera === true,
        );
        if (token !== this.#presentationToken) return;
        this.#animatedUnit = null;
        this.#presentedView = after;
      } else if (step.kind === "BUILD") {
        this.#followCamera(step.at);
        this.#crossfade = { before, after, progress: 0 };
        await this.#animate(step.durationMs * durationScale, (progress) => {
          this.#crossfade = { before, after, progress };
          this.#draw();
        });
        if (token !== this.#presentationToken) return;
        this.#crossfade = null;
        this.#presentedView = after;
      } else if (
        step.kind === "MELEE" ||
        step.kind === "RANGED" ||
        step.kind === "CATAPULT"
      ) {
        this.#presentedView = before;
        if (step.kind === "MELEE")
          await this.#animateLunge(
            step.unitId,
            step.from,
            step.to,
            230 * durationScale,
          );
        else
          await this.#animateProjectile(
            step.kind === "CATAPULT",
            step.from,
            step.to,
            280 * durationScale,
          );
        if (token !== this.#presentationToken) return;
        this.#presentedView = after;
        await this.#animateImpact(step.to, 100 * durationScale);
        if (token !== this.#presentationToken) return;
      } else if (step.kind === "VISIBILITY_CROSSFADE") {
        this.#crossfade = { before, after, progress: 0 };
        await this.#animate(step.durationMs * durationScale, (progress) => {
          this.#crossfade = { before, after, progress };
          this.#draw();
        });
        if (token !== this.#presentationToken) return;
        this.#crossfade = null;
        this.#presentedView = after;
      } else if (step.kind === "TACTICAL_STATUS") {
        this.#presentedView = after;
        await this.#animate(step.durationMs * durationScale, (progress) => {
          this.#statusPulse = {
            at: step.at,
            statusId: step.symbolId,
            progress,
          };
          this.#draw();
        });
        if (token !== this.#presentationToken) return;
        this.#statusPulse = null;
      } else if (step.kind === "SUPPORT") {
        this.#presentedView = after;
        this.#draw();
        await this.#animate(step.durationMs * durationScale, (progress) => {
          this.#supportFeedback = {
            effect: step.effect,
            actor: step.actor,
            recipients: step.recipients,
            progress,
          };
          this.#drawSupportOverlay();
        });
        if (token !== this.#presentationToken) return;
        this.#supportFeedback = null;
        this.#drawSupportOverlay();
      } else if (step.kind === "DAMAGE") {
        this.#presentedView = after;
        await this.#animateImpact(step.at, step.durationMs * durationScale);
        if (token !== this.#presentationToken) return;
      }
      if (token !== this.#presentationToken) return;
    }
    this.#animatedUnit = null;
    this.#presentedView = null;
    this.#draw();
  }

  #resize(container: HTMLElement): void {
    const priorViewport = this.#viewport;
    const priorCenter =
      this.#model === null
        ? null
        : screenToWorld(
            {
              x: priorViewport.width / 2,
              y: priorViewport.height * 0.55,
            },
            this.#camera,
          );
    const rect = container.getBoundingClientRect();
    const nextViewport = {
      width: Math.max(320, rect.width || 1024),
      height: Math.max(320, rect.height || 640),
    };
    const dpr = this.#document.defaultView?.devicePixelRatio ?? 1;
    const canvas = this.#canvas;
    const effectsCanvas = this.#effectsCanvas;
    if (
      canvas !== null &&
      nextViewport.width === priorViewport.width &&
      nextViewport.height === priorViewport.height &&
      canvas.width === Math.round(nextViewport.width * dpr) &&
      canvas.height === Math.round(nextViewport.height * dpr)
    )
      return;
    this.#viewport = nextViewport;
    if (canvas !== null) {
      canvas.width = Math.round(this.#viewport.width * dpr);
      canvas.height = Math.round(this.#viewport.height * dpr);
      canvas.style.width = `${this.#viewport.width}px`;
      canvas.style.height = `${this.#viewport.height}px`;
    }
    if (effectsCanvas !== null) {
      effectsCanvas.width = Math.round(this.#viewport.width * dpr);
      effectsCanvas.height = Math.round(this.#viewport.height * dpr);
      effectsCanvas.style.width = `${this.#viewport.width}px`;
      effectsCanvas.style.height = `${this.#viewport.height}px`;
    }
    if (priorCenter !== null)
      this.#camera = centerCameraOn(this.#camera, priorCenter, this.#viewport);
    this.#glowCache.clear();
    this.#draw();
  }

  #planFor(
    view: PlayerViewV7,
    commands: BoardHostModelV7["offeredCommands"],
  ): BoardRenderPlanV7 {
    const model = this.#model;
    if (model === null) throw new Error("Board plan requires a mounted model");
    const interaction = { ...model.interaction, cursor: this.#focused };
    const interactionKey = JSON.stringify(interaction);
    const cached = this.#planCache.find(
      (item) =>
        item.view === view &&
        item.commands === commands &&
        item.interactionKey === interactionKey,
    );
    if (cached !== undefined) return cached.plan;
    const plan = buildBoardRenderPlanV7(view, commands, interaction);
    if (this.#planCache.length === 2) this.#planCache.shift();
    this.#planCache.push({ view, commands, interactionKey, plan });
    return plan;
  }

  #draw(): void {
    const model = this.#model;
    const context = this.#context;
    if (model === null || context === null) return;
    this.#drawSerial += 1;
    const now = this.#now();
    const jump = this.#selectionJump;
    const renderView = (
      view: PlayerViewV7,
      clear: boolean,
      sceneAlpha: number,
    ): void => {
      const plan = this.#planFor(
        view,
        this.#presentedView === null ? model.offeredCommands : NO_COMMANDS,
      );
      const animated = this.#animatedUnit;
      const presented =
        animated === null
          ? plan
          : {
              ...plan,
              entries: plan.entries.map((entry) =>
                entry.kind === "UNIT" && entry.key === `unit:${animated.id}`
                  ? { ...entry, at: animated.at }
                  : entry,
              ),
            };
      drawBoardV7({
        context,
        viewport: this.#viewport,
        devicePixelRatio: this.#document.defaultView?.devicePixelRatio ?? 1,
        camera: this.#camera,
        plan: presented,
        images: this.#images,
        glowCache: this.#glowCache,
        readinessElapsedMs: now - this.#readinessStartedAt,
        reducedMotion: model.motion === "REDUCED",
        highContrast: model.highContrast,
        clear,
        sceneAlpha,
        impact: this.#impact,
        statusPulse: this.#statusPulse,
        selectionJump:
          jump === null
            ? null
            : {
                unitId: jump.unitId,
                elapsedMs: now - jump.startedAt,
                speed: model.animationSpeed,
              },
      });
    };
    if (this.#crossfade !== null) {
      renderView(this.#crossfade.before, true, 1 - this.#crossfade.progress);
      renderView(this.#crossfade.after, false, this.#crossfade.progress);
    } else renderView(this.#presentedView ?? model.view, true, 1);
    if (this.#projectile !== null) {
      const from = worldToScreen(
        projectGrid(this.#projectile.from),
        this.#camera,
      );
      const to = worldToScreen(projectGrid(this.#projectile.to), this.#camera);
      const progress = this.#projectile.progress;
      const x = from.x + (to.x - from.x) * progress;
      const linearY = from.y + (to.y - from.y) * progress;
      const y = this.#projectile.catapult
        ? linearY - Math.sin(Math.PI * progress) * 72 * this.#camera.zoom
        : linearY;
      context.save();
      context.strokeStyle = "#19282a";
      context.lineWidth = 2 * this.#camera.zoom;
      if (this.#projectile.catapult) {
        context.fillStyle = "#6d665e";
        context.beginPath();
        context.arc(x, y, 7 * this.#camera.zoom, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      } else {
        const geometry = arrowGeometry(
          archerProjectileEndpoints(from, to, this.#camera.zoom),
          progress,
          this.#camera.zoom,
        );
        context.strokeStyle = "#19282a";
        context.lineWidth = geometry.outlineWidth + 2;
        context.beginPath();
        context.moveTo(geometry.tail.x, geometry.tail.y);
        context.lineTo(geometry.shaftEnd.x, geometry.shaftEnd.y);
        context.stroke();
        context.strokeStyle = "#f4d291";
        context.lineWidth = geometry.outlineWidth;
        context.beginPath();
        context.moveTo(geometry.tail.x, geometry.tail.y);
        context.lineTo(geometry.shaftEnd.x, geometry.shaftEnd.y);
        context.stroke();
        context.fillStyle = "#e9edf0";
        context.strokeStyle = "#19282a";
        context.lineWidth = Math.max(1, geometry.outlineWidth * 0.6);
        context.beginPath();
        context.moveTo(geometry.tip.x, geometry.tip.y);
        context.lineTo(geometry.headLeft.x, geometry.headLeft.y);
        context.lineTo(geometry.headRight.x, geometry.headRight.y);
        context.closePath();
        context.fill();
        context.stroke();
      }
      context.restore();
    }
    this.#drawSupportOverlay();
  }

  #drawSupportOverlay(): void {
    const context = this.#effectsContext;
    const canvas = this.#effectsCanvas;
    if (context === null || canvas === null) return;
    const dpr = this.#document.defaultView?.devicePixelRatio ?? 1;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, this.#viewport.width, this.#viewport.height);
    const feedback = this.#supportFeedback;
    if (feedback === null) {
      delete canvas.dataset.supportEffect;
      delete canvas.dataset.supportRecipients;
      delete canvas.dataset.supportProgress;
      return;
    }
    canvas.dataset.supportEffect = feedback.effect;
    canvas.dataset.supportRecipients = String(feedback.recipients.length);
    canvas.dataset.supportProgress = feedback.progress.toFixed(3);
    drawSupportFeedbackV7(
      context,
      this.#camera,
      feedback,
      this.#model?.motion === "REDUCED",
    );
  }

  #activate(at: CoordV7): void {
    const model = this.#model;
    if (model === null) return;
    if (this.#inspectionCycle !== null && !same(this.#inspectionCycle.at, at))
      this.#inspectionCycle = null;
    const plan = this.#planFor(model.view, model.offeredCommands);
    const target = plan.targets.find((candidate) => same(candidate.at, at));
    if (target !== undefined && model.interactive) {
      this.#callbacks?.onCommand(target);
      return;
    }
    const unit = model.view.units.find((candidate) => same(candidate.at, at));
    const city = model.view.cities.find((candidate) => same(candidate.at, at));
    const sameCycle =
      this.#inspectionCycle !== null && same(this.#inspectionCycle.at, at);
    if (
      unit !== undefined &&
      (!sameCycle || this.#inspectionCycle?.next === "UNIT")
    ) {
      this.#callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
      this.#inspectionCycle = {
        at,
        occupantUnitId: unit.id,
        next: "UNDERLYING",
      };
    } else {
      this.#callbacks?.onSelection(
        city === undefined
          ? { kind: "TILE", at }
          : { kind: "CITY", cityId: city.id },
      );
      this.#inspectionCycle =
        unit === undefined
          ? null
          : { at, occupantUnitId: unit.id, next: "UNIT" };
    }
  }

  #describe(): void {
    const model = this.#model;
    const at = this.#focused;
    if (model === null || at === null || this.#description === null) return;
    const tile = model.view.board.tiles.find((candidate) =>
      same(candidate.at, at),
    );
    const unit = model.view.units.find((candidate) => same(candidate.at, at));
    if (tile === undefined || !tile.explored) {
      this.#description.textContent =
        unit === undefined
          ? "Unexplored tile."
          : `${title(unit.role)}, ${unit.hp} of ${unit.maxHp} HP. Explicitly revealed unit on unexplored terrain.`;
      return;
    }
    const city = model.view.cities.find((candidate) => same(candidate.at, at));
    const actions = this.#planFor(model.view, model.offeredCommands)
      .targets.filter((target) => same(target.at, at))
      .map((target) =>
        target.semanticLabel !== undefined
          ? target.semanticLabel
          : target.previewLabel === undefined
            ? target.family
            : `${target.family}: ${target.previewLabel}`,
      );
    this.#description.textContent = [
      title(tile.terrain),
      tile.resource !== null && tile.resource !== "UNKNOWN_RESOURCE"
        ? title(tile.resource)
        : "",
      tile.improvement === null ? "" : title(tile.improvement),
      city === undefined
        ? ""
        : `${city.isCapital ? "Capital" : "City"} level ${city.level}`,
      unit === undefined
        ? ""
        : `${title(unit.role)}, ${unit.hp} of ${unit.maxHp} HP`,
      actions.length === 0 ? "" : `Available: ${actions.join(", ")}`,
    ]
      .filter(Boolean)
      .join(". ");
  }

  readonly #onPointerDown = (event: PointerEvent): void => {
    this.#cameraFollowAllowed = false;
    const canvas = this.#canvas;
    if (canvas === null) return;
    const point = localPoint(canvas, event);
    this.#pointers.set(event.pointerId, point);
    if (this.#pointers.size === 1)
      this.#pointer = { id: event.pointerId, start: point, current: point };
    else if (this.#pointers.size === 2) {
      this.#pointer = null;
      this.#pinch = pinchState([...this.#pointers.values()]);
    }
    canvas.setPointerCapture?.(event.pointerId);
  };
  readonly #onPointerMove = (event: PointerEvent): void => {
    const canvas = this.#canvas;
    if (canvas === null) return;
    if (!this.#pointers.has(event.pointerId)) return;
    const next = localPoint(canvas, event);
    this.#pointers.set(event.pointerId, next);
    if (this.#pointers.size === 2) {
      const current = pinchState([...this.#pointers.values()]);
      const prior = this.#pinch;
      if (current !== null && prior !== null && prior.distance > 0) {
        this.#camera = panCamera(this.#camera, {
          x: current.midpoint.x - prior.midpoint.x,
          y: current.midpoint.y - prior.midpoint.y,
        });
        this.#camera = zoomCameraAt(
          this.#camera,
          Math.max(
            MIN_ZOOM,
            Math.min(
              MAX_ZOOM,
              this.#camera.zoom * (current.distance / prior.distance),
            ),
          ),
          current.midpoint,
        );
        this.#draw();
      }
      this.#pinch = current;
      return;
    }
    if (this.#pointer?.id !== event.pointerId) return;
    const dx = next.x - this.#pointer.current.x;
    const dy = next.y - this.#pointer.current.y;
    if (
      Math.hypot(
        next.x - this.#pointer.start.x,
        next.y - this.#pointer.start.y,
      ) > 6
    ) {
      this.#camera = panCamera(this.#camera, { x: dx, y: dy });
      this.#draw();
    }
    this.#pointer.current = next;
  };
  readonly #onPointerUp = (event: PointerEvent): void => {
    const pointer = this.#pointer;
    const canvas = this.#canvas;
    const model = this.#model;
    this.#pointers.delete(event.pointerId);
    if (this.#pinch !== null) {
      this.#pinch = null;
      this.#pointer = null;
      return;
    }
    if (
      pointer === null ||
      pointer.id !== event.pointerId ||
      canvas === null ||
      model === null
    )
      return;
    const point = localPoint(canvas, event);
    this.#pointer = null;
    if (Math.hypot(point.x - pointer.start.x, point.y - pointer.start.y) <= 6) {
      const at = pickGridTile(point, this.#camera, model.view.board);
      if (at !== null) {
        this.#focused = at;
        const serial = this.#drawSerial;
        this.#activate(at);
        this.#describe();
        if (serial === this.#drawSerial) this.#draw();
      }
    }
  };
  readonly #onPointerCancel = (event: PointerEvent): void => {
    this.#pointers.delete(event.pointerId);
    this.#pointer = null;
    this.#pinch = null;
  };
  readonly #onWheel = (event: WheelEvent): void => {
    this.#cameraFollowAllowed = false;
    event.preventDefault();
    const canvas = this.#canvas;
    if (canvas === null) return;
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    this.#camera = zoomCameraAt(
      this.#camera,
      Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.#camera.zoom * factor)),
      localPoint(canvas, event),
    );
    this.#draw();
  };
  readonly #onKeyDown = (event: KeyboardEvent): void => {
    const model = this.#model;
    if (model === null) return;
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      this.zoom("IN");
      return;
    }
    if (event.key === "-") {
      event.preventDefault();
      this.zoom("OUT");
      return;
    }
    if (event.key === "Escape") {
      this.#inspectionCycle = null;
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (this.#focused !== null) this.#activate(this.#focused);
      return;
    }
    const directions: Record<string, readonly [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const delta = directions[event.key];
    if (delta === undefined) return;
    this.#cameraFollowAllowed = false;
    event.preventDefault();
    const current = this.#focused ?? { x: 0, y: 0 };
    const multiplier = event.shiftKey ? 1 : 0;
    const diagonalX =
      event.shiftKey && (event.key === "ArrowUp" || event.key === "ArrowDown")
        ? 1
        : 0;
    this.#focused = {
      x: Math.max(
        0,
        Math.min(
          model.view.board.width - 1,
          current.x + delta[0] + diagonalX * multiplier,
        ),
      ),
      y: Math.max(
        0,
        Math.min(model.view.board.height - 1, current.y + delta[1]),
      ),
    };
    this.#keepFocusedOnscreen();
    this.#describe();
    this.#draw();
  };

  #keepFocusedOnscreen(): void {
    const canvas = this.#canvas;
    if (this.#focused === null || canvas === null) return;
    const point = worldToScreen(projectGrid(this.#focused), this.#camera);
    const margin = Math.min(
      64,
      this.#viewport.width / 4,
      this.#viewport.height / 4,
    );
    const canvasRect = canvas.getBoundingClientRect();
    const shell = canvas.closest<HTMLElement>(".v7-app-shell");
    const hudRect = shell
      ?.querySelector<HTMLElement>(".v7-match-hud")
      ?.getBoundingClientRect();
    const dockRect = shell
      ?.querySelector<HTMLElement>(".v7-selection-dock")
      ?.getBoundingClientRect();
    const unobscuredTop = Math.max(
      0,
      hudRect === undefined || hudRect.bottom <= canvasRect.top
        ? 0
        : Math.min(this.#viewport.height, hudRect.bottom - canvasRect.top),
    );
    const unobscuredBottom = Math.min(
      this.#viewport.height,
      dockRect === undefined || dockRect.top >= canvasRect.bottom
        ? this.#viewport.height
        : Math.max(0, dockRect.top - canvasRect.top),
    );
    const unobscuredHeight = unobscuredBottom - unobscuredTop;
    const verticalInset =
      unobscuredHeight > 0 ? Math.min(margin, unobscuredHeight / 4) : margin;
    const safeTop =
      unobscuredHeight > 0 ? unobscuredTop + verticalInset : margin;
    const safeBottom =
      unobscuredHeight > 0
        ? unobscuredBottom - verticalInset
        : this.#viewport.height - margin;
    const dx =
      point.x < margin
        ? margin - point.x
        : point.x > this.#viewport.width - margin
          ? this.#viewport.width - margin - point.x
          : 0;
    const dy =
      point.y < safeTop
        ? safeTop - point.y
        : point.y > safeBottom
          ? safeBottom - point.y
          : 0;
    if (dx !== 0 || dy !== 0)
      this.#camera = panCamera(this.#camera, { x: dx, y: dy });
  }

  #detach(): void {
    if (this.#animationFrame !== null)
      this.#document.defaultView?.cancelAnimationFrame(this.#animationFrame);
    this.#animationFrame = null;
    this.#cancelAmbientFrame();
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    const canvas = this.#canvas;
    if (canvas !== null) {
      canvas.removeEventListener("pointerdown", this.#onPointerDown);
      canvas.removeEventListener("pointermove", this.#onPointerMove);
      canvas.removeEventListener("pointerup", this.#onPointerUp);
      canvas.removeEventListener("pointercancel", this.#onPointerCancel);
      canvas.removeEventListener("wheel", this.#onWheel);
      canvas.removeEventListener("keydown", this.#onKeyDown);
    }
    this.#canvas = null;
    this.#context = null;
    this.#effectsCanvas = null;
    this.#effectsContext = null;
    this.#description = null;
    this.#callbacks = null;
    this.#pointers.clear();
    this.#pointer = null;
    this.#pinch = null;
    this.#selectionJump = null;
    this.#readinessKey = null;
  }

  async #animatePath(
    unitId: number,
    path: readonly CoordV7[],
    duration: number,
    followCamera = false,
  ): Promise<void> {
    const first = path[0];
    if (first === undefined) return;
    if (followCamera) {
      this.#animatedUnit = { id: unitId, at: first };
      this.#followCamera(first);
      this.#draw();
    }
    await this.#animate(duration, (progress) => {
      if (path.length === 1) {
        this.#draw();
        return;
      }
      const scaled = progress * (path.length - 1);
      const index = Math.min(path.length - 2, Math.floor(scaled));
      const from = path[index];
      const to = path[index + 1];
      if (from === undefined || to === undefined) return;
      const local = scaled - index;
      this.#animatedUnit = {
        id: unitId,
        at: {
          x: from.x + (to.x - from.x) * local,
          y: from.y + (to.y - from.y) * local,
        },
      };
      if (followCamera) this.#followCamera(this.#animatedUnit.at);
      this.#draw();
    });
  }

  #followCamera(at: CoordV7): void {
    if (!this.#cameraFollowAllowed) return;
    this.#camera = centerCameraOn(
      this.#camera,
      projectGrid(at),
      this.#viewport,
    );
  }

  async #animateLunge(
    unitId: number,
    from: CoordV7,
    target: CoordV7,
    duration: number,
  ): Promise<void> {
    await this.#animate(duration, (progress) => {
      const phase = progress < 0.56 ? progress / 0.56 : (1 - progress) / 0.44;
      const amount = Math.max(0, phase) * 0.22;
      this.#animatedUnit = {
        id: unitId,
        at: {
          x: from.x + (target.x - from.x) * amount,
          y: from.y + (target.y - from.y) * amount,
        },
      };
      this.#draw();
    });
  }

  async #animateProjectile(
    catapult: boolean,
    from: CoordV7,
    to: CoordV7,
    duration: number,
  ): Promise<void> {
    await this.#animate(duration, (progress) => {
      this.#projectile = { from, to, progress, catapult };
      this.#draw();
    });
    this.#projectile = null;
  }

  async #animateImpact(at: CoordV7, duration: number): Promise<void> {
    await this.#animate(duration, (progress) => {
      this.#impact = {
        at,
        shakeCssPx: Math.sin(progress * Math.PI * 6) * (1 - progress) * 6,
        flashAlpha: Math.sin(progress * Math.PI) * 0.42,
      };
      this.#draw();
    });
    this.#impact = null;
  }

  #animate(
    duration: number,
    update: (progress: number) => void,
  ): Promise<void> {
    const browser = this.#document.defaultView;
    if (
      browser === null ||
      typeof browser.requestAnimationFrame !== "function"
    ) {
      update(1);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let started = browser.performance.now();
      let pausedAt: number | null = null;
      this.#animationResolve = resolve;
      const frame = (now: number): void => {
        if (this.#model?.presentationPaused) {
          pausedAt ??= now;
          this.#animationFrame = browser.requestAnimationFrame(frame);
          return;
        }
        if (pausedAt !== null) {
          started += now - pausedAt;
          pausedAt = null;
        }
        const progress = Math.min(1, (now - started) / duration);
        update(1 - Math.pow(1 - progress, 3));
        if (progress >= 1) {
          this.#animationFrame = null;
          this.#animationResolve = null;
          resolve();
        } else this.#animationFrame = browser.requestAnimationFrame(frame);
      };
      this.#animationFrame = browser.requestAnimationFrame(frame);
    });
  }

  #syncAmbientFrame(): void {
    this.#cancelAmbientFrame();
    const model = this.#model;
    const browser = this.#document.defaultView;
    if (
      model === null ||
      browser === null ||
      typeof browser.requestAnimationFrame !== "function" ||
      !model.interactive ||
      this.#presentedView !== null
    )
      return;
    const ready =
      model.motion === "FULL" &&
      model.view.units.some(
        (unit) =>
          unit.ownerId === model.view.viewer.id &&
          !unit.activation.handled &&
          model.offeredCommands.some(
            (command) => command.kind === "MOVE" && command.unitId === unit.id,
          ),
      );
    const jump = this.#selectionJump;
    const jumping =
      jump !== null &&
      this.#now() - jump.startedAt <
        selectionJumpDurationMs(model.animationSpeed);
    if (!ready && !jumping) {
      if (!jumping) this.#selectionJump = null;
      return;
    }
    this.#ambientFrame = browser.requestAnimationFrame(() => {
      this.#ambientFrame = null;
      this.#draw();
      this.#syncAmbientFrame();
    });
  }

  #cancelAmbientFrame(): void {
    if (this.#ambientFrame !== null)
      this.#document.defaultView?.cancelAnimationFrame(this.#ambientFrame);
    this.#ambientFrame = null;
  }

  #now(): number {
    return this.#document.defaultView?.performance.now() ?? Date.now();
  }
}

function localPoint(canvas: HTMLCanvasElement, event: MouseEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}
function pinchState(
  points: readonly Point[],
): { readonly distance: number; readonly midpoint: Point } | null {
  const first = points[0];
  const second = points[1];
  if (first === undefined || second === undefined) return null;
  return {
    distance: Math.hypot(second.x - first.x, second.y - first.y),
    midpoint: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
  };
}
function same(a: CoordV7, b: CoordV7): boolean {
  return a.x === b.x && a.y === b.y;
}
const NO_COMMANDS: readonly BoardHostModelV7["offeredCommands"][number][] = [];
const title = (value: string): string =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
let nextDescriptionIdV7 = 1;
