import {
  unitRoleRuleV7,
  type CoordV7,
  type PlayerEventEnvelopeV7,
  type PlayerViewV7,
} from "../../engine/index";
import {
  afflictionCursorCueV7,
  unitIsUndeadV7,
} from "../undead-presentation-v7";
import { unitIsGoblinV7 } from "../goblin-presentation-v7";
import {
  eggCountdownTextV7,
  eggTurnsRemainingV7,
  unitDisplayNameV7,
  unitIsDinosaurV7,
} from "../dinosaur-presentation-v7";
import {
  drawBombProjectileV7,
  drawExplosionFeedbackV7,
  type ExplosionFeedbackV7,
} from "./goblin-explosion-v7";
import {
  drawDinosaurFeedbackV7,
  type DinosaurFeedbackV7,
} from "./dinosaur-effects-v7";
import { DINOSAUR_CUE_COLORS_V7 } from "./dinosaur-canvas-v7";
import {
  MARTIAN_EFFECT_SUBJECTS_V7,
  drawMartianFeedbackV7,
  type MartianFeedbackV7,
} from "./martian-effects-v7";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  boardWorldBounds,
  cellWorldBounds,
  centerCameraOn,
  fitCamera,
  frameCameraOnArea,
  panCamera,
  panToFrameArea,
  pickGridTile,
  projectGrid,
  screenToWorld,
  worldToScreen,
  zoomCameraAt,
  type CameraState,
  type Point,
  type ScreenBand,
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
  type UnitPulseV7,
} from "./board-renderer-v7";
import {
  corePresentationPlanV7,
  type CorePresentationStepV7,
} from "./presentation-plan-v7";
import { selectionJumpDurationMs } from "./selection-jump-presentation";
import {
  archerProjectileEndpoints,
  arrowGeometry,
} from "./combat-presentation";
import { BoardGlowCacheV7 } from "./glow-cache-v7";
import type { ArtSetV7 } from "../../assets/chibi-art-v7";
import {
  browserChibiRasterEnvironmentV7,
  createChibiArtResolverV7,
  type ChibiBoardArtV7,
} from "./chibi-art-resolver-v7";
import {
  adjacentChibiZoomStep,
  chibiBoardWorldBounds,
  chibiMasterScale,
  chibiTileCssPx,
  chibiZoomStepForCamera,
  fitChibiCamera,
  nearestChibiZoomStep,
  zoomChibiCameraAt,
  type ChibiZoomStepV7,
} from "./chibi-geometry-v7";
import {
  SUPPORT_EFFECT_SUBJECTS_V7,
  drawSupportFeedbackV7,
  UNDEAD_VIOLET_GLOW_V7,
  drawWindmillHealingFeedbackV7,
  type SupportEffectArtV7,
  type SupportFeedbackV7,
  type WindmillHealingFeedbackV7,
} from "./support-presentation-v7";
import {
  createSpriteSaturationCacheV7,
  type BoardSaturationV7,
  type SpriteSaturationCacheV7,
} from "./sprite-saturation-v7";
import {
  createDirectedChibiArtV7,
  type BoardDirectionRuntimeV7,
  type BoardVisualDirectionV7,
} from "./visual-direction-v7";
import type { ChibiArtRegistryV7 } from "../../assets/chibi-art-v7";

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
  /** Presentation-only art set; omitted means LEGACY. */
  readonly artSet?: ArtSetV7;
  /**
   * Developer experiment (pulp_wars-x6c): building and city saturation in
   * percent. Omitted, or 100, draws exactly as without it.
   */
  readonly saturation?: BoardSaturationV7;
  /**
   * The visual direction of the CHIBI art set (pulp_wars-3tq.6: the app
   * passes the live direction by default). Omitted draws the classic look,
   * exactly as before the direction existed; the LEGACY set ignores it.
   */
  readonly visualDirection?: BoardVisualDirectionV7;
  /**
   * The direction's own art, resolved before the default art. A piece whose
   * direction raster fails to load falls back to its default asset.
   */
  readonly visualDirectionArt?: ChibiArtRegistryV7;
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
  readonly #chibiArt: ChibiBoardArtV7;
  readonly #glowCache: BoardGlowCacheV7;
  readonly #saturationCache: SpriteSaturationCacheV7;
  #direction: {
    readonly key: string;
    readonly registry: ChibiArtRegistryV7 | undefined;
    readonly runtime: BoardDirectionRuntimeV7;
  } | null = null;
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
  /** Mouse hover cell; it only focuses revision-13 splash previews. */
  #hovered: CoordV7 | null = null;
  #boardKey: string | null = null;
  #pointer: { id: number; start: Point; current: Point } | null = null;
  readonly #pointers = new Map<number, Point>();
  #pinch: { readonly distance: number; readonly midpoint: Point } | null = null;
  /** CHIBI pinch zoom snaps to discrete steps relative to the gesture start. */
  #pinchStart: {
    readonly distance: number;
    readonly step: ChibiZoomStepV7;
  } | null = null;
  #wheelDelta = 0;
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
    /** Revision 17: a Bomb Chucker's round black bomb. */
    readonly bomb?: boolean;
    /** Revision 19: a Spitter's pale cream acid blob. */
    readonly acid?: boolean;
  } | null = null;
  /** Revision 19: the Dinosaur cue playing on the effects overlay. */
  #dinosaurFeedback: DinosaurFeedbackV7 | null = null;
  /** Review tooling only (pinDinosaurFeedback): cues frozen mid-animation. */
  #pinnedDinosaurFeedback: readonly DinosaurFeedbackV7[] = [];
  /** The Martian cue playing on the effects overlay (bead pulp_wars-t6s.4). */
  #martianFeedback: MartianFeedbackV7 | null = null;
  /** Review tooling only (pinMartianFeedback): cues frozen mid-animation. */
  #pinnedMartianFeedback: readonly MartianFeedbackV7[] = [];
  /** Revision 19: this frame's unit sprite cues (growth, Egg, hatchling). */
  #unitPulses: readonly UnitPulseV7[] = [];
  /**
   * Revision 20: units of a Charge! boundary with a Push held where their
   * next slide starts (the Triceratops and the survivor on their tiles), so
   * the board never shows them at their final tile early.
   */
  #heldUnits: ReadonlyMap<number, CoordV7> = new Map();
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
  /** Review tooling only (pinSupportFeedback): cues frozen mid-animation. */
  #pinnedSupportFeedback: readonly SupportFeedbackV7[] = [];
  #effectArtRequested = false;
  #windmillHealingFeedback: WindmillHealingFeedbackV7 | null = null;
  /** Revision 17: the explosion wave bursting on the effects overlay. */
  #explosionFeedback: ExplosionFeedbackV7 | null = null;
  /** Review tooling only (pinExplosionFeedback): bursts frozen mid-animation. */
  #pinnedExplosionFeedback: readonly ExplosionFeedbackV7[] = [];
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
  /**
   * Revision 17: the Kaboom! preview last framed (unit, visible band and
   * viewport), so the camera frames a blast once per preview and band and a
   * player's own pan is not undone by a later redraw.
   */
  #kaboomFramedKey: string | null = null;
  #cameraPanFrame: number | null = null;

  constructor(documentRoot: Document) {
    this.#document = documentRoot;
    this.#glowCache = new BoardGlowCacheV7(documentRoot);
    this.#images = createBoardImageResolverV7(documentRoot, () => {
      this.#glowCache.clear();
      this.#draw();
    });
    this.#saturationCache = createSpriteSaturationCacheV7(
      browserChibiRasterEnvironmentV7(documentRoot),
    );
    this.#chibiArt = createChibiArtResolverV7({
      environment: browserChibiRasterEnvironmentV7(documentRoot),
      redraw: () => {
        this.#glowCache.clear();
        this.#draw();
      },
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
    canvas.addEventListener("pointerleave", this.#onPointerLeave);
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
    const key = `${String(model.matchInstanceId)}:${model.view.board.width}x${model.view.board.height}:${this.#artSet()}`;
    if (this.#boardKey !== key) {
      this.#boardKey = key;
      const chibi = this.#artSet() === "CHIBI";
      const fitted = chibi
        ? fitChibiCamera(model.view.board, this.#viewport)
        : fitCamera(model.view.board, this.#viewport);
      const capital = model.view.cities.find(
        (city) => city.ownerId === model.view.viewer.id && city.isCapital,
      );
      this.#focused = capital?.at ?? model.view.cities[0]?.at ?? { x: 0, y: 0 };
      // Frame the explored area (the capital's surroundings at creation) in
      // the map region the HUD and the open or reserved dock leave visible.
      this.#camera = frameCameraOnArea(fitted, {
        area: cellWorldBounds(
          model.view.board.tiles
            .filter((tile) => tile.explored)
            .map((tile) => tile.at),
        ),
        focus: projectGrid(this.#focused),
        board: chibi
          ? chibiBoardWorldBounds(model.view.board)
          : boardWorldBounds(model.view.board.width, model.view.board.height),
        viewport: this.#viewport,
        band: this.#unobscuredBand(true),
      });
    }
    this.#frameKaboomPreview(model);
    this.#describe();
    this.#draw();
    this.#syncAmbientFrame();
  }

  /**
   * Revision 17: while a Kaboom! is previewed (focused, hovered or armed),
   * pans the camera the least distance that shows every blast area of the
   * chain above the dock and below the HUD. The zoom never changes; reduced
   * motion jumps, full motion eases for a moment.
   */
  #frameKaboomPreview(model: BoardHostModelV7): void {
    const unitId = model.interaction.kaboomPreviewUnitId ?? null;
    // Revision 19: the nest tiles of the Egg being laid are framed the same
    // way, once per preview.
    const layEgg = model.interaction.layEgg ?? null;
    // The Martian revision: an aimed Beam Down, Mind Control or Tractor
    // Beam frames its unit and targets the same way, once per stage.
    const martianPick = model.interaction.martianPick ?? null;
    const subject =
      unitId !== null
        ? String(unitId)
        : layEgg !== null
          ? `nest:${layEgg.cityId}:${layEgg.role}`
          : martianPick !== null
            ? `martian:${martianPick.kind}:${martianPick.unitId}:${martianPick.kind === "BEAM_DOWN" ? String(martianPick.passengerUnitId) : ""}`
            : null;
    if (subject === null) {
      this.#kaboomFramedKey = null;
      return;
    }
    const band = this.#unobscuredBand();
    const key = `${subject}:${Math.round(band.top)}:${Math.round(band.bottom)}:${this.#viewport.width}x${this.#viewport.height}`;
    if (key === this.#kaboomFramedKey) return;
    this.#kaboomFramedKey = key;
    const framed = this.#planFor(model.view, model.offeredCommands);
    const pickUnit =
      martianPick === null
        ? undefined
        : model.view.units.find((unit) => unit.id === martianPick.unitId);
    const area = cellWorldBounds(
      martianPick !== null && unitId === null && layEgg === null
        ? [
            ...(pickUnit === undefined ? [] : [pickUnit.at]),
            ...framed.targets.map((target) => target.at),
          ]
        : framed.entries
            .filter(
              (entry) =>
                entry.kind === "ABILITY_AREA" &&
                entry.abilityStyle === (unitId !== null ? "BLAST" : "NEST"),
            )
            .map((entry) => entry.at),
    );
    if (area === null) return;
    const delta = panToFrameArea(this.#camera, area, this.#viewport, band);
    if (delta.x === 0 && delta.y === 0) return;
    this.#panCameraTo(panCamera(this.#camera, delta), model.motion === "FULL");
  }

  #panCameraTo(target: CameraState, animate: boolean): void {
    this.#cancelCameraPan();
    const browser = this.#document.defaultView;
    if (
      !animate ||
      browser === null ||
      typeof browser.requestAnimationFrame !== "function"
    ) {
      this.#camera = target;
      return;
    }
    const start = this.#camera;
    const startedAt = this.#now();
    const step = (): void => {
      const progress = Math.min(1, (this.#now() - startedAt) / 180);
      const eased = 1 - (1 - progress) * (1 - progress);
      this.#camera = {
        ...start,
        offsetX: start.offsetX + (target.offsetX - start.offsetX) * eased,
        offsetY: start.offsetY + (target.offsetY - start.offsetY) * eased,
      };
      this.#draw();
      this.#cameraPanFrame =
        progress < 1 ? browser.requestAnimationFrame(step) : null;
    };
    this.#cameraPanFrame = browser.requestAnimationFrame(step);
  }

  #cancelCameraPan(): void {
    if (this.#cameraPanFrame !== null)
      this.#document.defaultView?.cancelAnimationFrame(this.#cameraPanFrame);
    this.#cameraPanFrame = null;
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
    this.#cancelCameraPan();
    if (this.#artSet() === "CHIBI") {
      this.#camera = zoomChibiCameraAt(
        this.#camera,
        adjacentChibiZoomStep(chibiZoomStepForCamera(this.#camera), direction),
        { x: this.#viewport.width / 2, y: this.#viewport.height / 2 },
      );
      this.#draw();
      return;
    }
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
    this.#pinnedSupportFeedback = [];
    this.#windmillHealingFeedback = null;
    this.#explosionFeedback = null;
    this.#pinnedExplosionFeedback = [];
    this.#dinosaurFeedback = null;
    this.#pinnedDinosaurFeedback = [];
    this.#martianFeedback = null;
    this.#pinnedMartianFeedback = [];
    this.#unitPulses = [];
    this.#heldUnits = new Map();
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
      const windmillSteps = steps.filter(
        (step) => step.kind === "WINDMILL_HEALING",
      );
      const explosionSteps = steps.filter((step) => step.kind === "EXPLOSION");
      const dinosaurSteps = steps.filter((step) => step.kind === "DINOSAUR");
      const martianSteps = steps.filter((step) => step.kind === "MARTIAN");
      if (
        supportSteps.length > 0 ||
        windmillSteps.length > 0 ||
        explosionSteps.length > 0 ||
        dinosaurSteps.length > 0 ||
        martianSteps.length > 0
      ) {
        this.#presentedView = after;
        this.#draw();
        // Revision 19: each Dinosaur cue holds its midpoint; growth and a
        // laid Egg show their new sprite and marker at once.
        for (const step of dinosaurSteps) {
          if (step.followCamera === true && step.cells[0] !== undefined)
            this.#followCamera(step.cells[0]);
          if (step.effect === "GROW" || step.effect === "EGG_LAID") continue;
          this.#dinosaurFeedback = {
            effect: step.effect,
            cells: step.cells,
            ...(step.from === undefined ? {} : { from: step.from }),
            progress: 0.5,
          };
          this.#draw();
          await this.#animate(260 * durationScale, () => undefined);
          if (token !== this.#presentationToken) return;
          this.#dinosaurFeedback = null;
          this.#drawSupportOverlay();
        }
        // The Martian revision: each Martian cue holds its midpoint.
        for (const step of martianSteps) {
          if (step.followCamera === true && step.cells[0] !== undefined)
            this.#followCamera(step.cells[0]);
          this.#martianFeedback = martianFeedbackOf(step, 0.5);
          this.#drawSupportOverlay();
          await this.#animate(220 * durationScale, () => undefined);
          if (token !== this.#presentationToken) return;
          this.#martianFeedback = null;
          this.#drawSupportOverlay();
        }
        // Revision 17: each explosion wave holds its midpoint burst, in
        // wave order, long enough to read.
        for (const step of explosionSteps) {
          this.#explosionFeedback = {
            wave: step.wave,
            blasts: step.blasts,
            progress: 0.5,
          };
          this.#drawSupportOverlay();
          await this.#animate(260 * durationScale, () => undefined);
          if (token !== this.#presentationToken) return;
          this.#explosionFeedback = null;
          this.#drawSupportOverlay();
        }
        for (const step of supportSteps) {
          // Revision 17: the still "+N" of Troll regeneration holds long
          // enough to read.
          const hold = step.effect === "REGENERATE" ? 480 : 100;
          await this.#animate(hold * durationScale, () => {
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
        for (const step of windmillSteps) {
          for (const phase of ["SOURCES", "RECIPIENTS"] as const) {
            this.#windmillHealingFeedback = {
              phase,
              sources: step.sources,
              recipients: step.recipients,
              progress: 0.5,
            };
            this.#drawSupportOverlay();
            await this.#animate(100 * durationScale, () => undefined);
            if (token !== this.#presentationToken) return;
          }
          this.#windmillHealingFeedback = null;
          this.#drawSupportOverlay();
        }
        if (
          supportSteps.length +
            windmillSteps.length +
            explosionSteps.length +
            dinosaurSteps.length +
            martianSteps.length ===
          steps.length
        ) {
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
    const pushBoundary = steps.some(
      (step) => step.kind === "MOVE" && step.pushSlide === true,
    );
    for (const [index, step] of steps.entries()) {
      // Revision 20: in a Charge! boundary with a Push, a unit with a later
      // slide waits where that slide starts.
      this.#heldUnits = pushBoundary
        ? heldUnitsAfterV7(steps, index)
        : NO_HELD_UNITS;
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
      } else if (step.kind === "DINOSAUR") {
        const first = step.cells[0];
        if (first !== undefined && step.followCamera === true)
          this.#followCamera(first);
        // Hatching shows the Egg first; every other cue shows the result.
        this.#presentedView = step.effect === "HATCH" ? before : after;
        this.#draw();
        await this.#animate(step.durationMs * durationScale, (progress) => {
          this.#unitPulses = dinosaurUnitPulsesV7(
            step,
            progress,
            this.#camera.zoom,
          );
          if (
            step.effect === "HATCH" &&
            progress >= 0.45 &&
            this.#presentedView !== after
          )
            this.#presentedView = after;
          this.#dinosaurFeedback = {
            effect: step.effect,
            cells: step.cells,
            ...(step.from === undefined ? {} : { from: step.from }),
            progress,
          };
          this.#draw();
        });
        if (token !== this.#presentationToken) return;
        this.#unitPulses = [];
        this.#dinosaurFeedback = null;
        this.#presentedView = after;
        this.#drawSupportOverlay();
      } else if (step.kind === "MARTIAN") {
        const first = step.cells[0];
        if (first !== undefined && step.followCamera === true)
          this.#followCamera(first);
        // A heat ray shows the target before the hit and the result after
        // it; every other cue shows the result (the arrival, the pull's
        // start, the Thrall in its victim's place).
        const ray = step.effect === "HEAT_RAY";
        this.#presentedView = ray ? before : after;
        this.#draw();
        await this.#animate(step.durationMs * durationScale, (progress) => {
          if (ray && progress >= 0.35 && this.#presentedView !== after) {
            this.#presentedView = after;
            this.#draw();
          }
          this.#martianFeedback = martianFeedbackOf(step, progress);
          this.#drawSupportOverlay();
        });
        if (token !== this.#presentationToken) return;
        this.#martianFeedback = null;
        this.#presentedView = after;
        this.#draw();
        this.#drawSupportOverlay();
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
            step.projectile === "BOMB",
            step.projectile === "ACID",
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
      } else if (step.kind === "WINDMILL_HEALING") {
        this.#presentedView = after;
        this.#draw();
        for (const phase of ["SOURCES", "RECIPIENTS"] as const) {
          const duration =
            phase === "SOURCES"
              ? step.sourceDurationMs
              : step.recipientDurationMs;
          await this.#animate(duration * durationScale, (progress) => {
            this.#windmillHealingFeedback = {
              phase,
              sources: step.sources,
              recipients: step.recipients,
              progress,
            };
            this.#drawSupportOverlay();
          });
          if (token !== this.#presentationToken) return;
        }
        this.#windmillHealingFeedback = null;
        this.#drawSupportOverlay();
      } else if (step.kind === "DAMAGE") {
        this.#presentedView = after;
        await this.#animateImpact(step.at, step.durationMs * durationScale);
        if (token !== this.#presentationToken) return;
      } else if (step.kind === "EXPLOSION") {
        // Revision 17: the blast bursts over the units it hits, then the
        // board shows the result under the fading smoke.
        const first = step.blasts[0];
        if (first !== undefined && step.followCamera === true)
          this.#followCamera(first.at);
        this.#draw();
        await this.#animate(step.durationMs * durationScale, (progress) => {
          if (progress >= 0.45 && this.#presentedView !== after) {
            this.#presentedView = after;
            this.#draw();
          }
          this.#explosionFeedback = {
            wave: step.wave,
            blasts: step.blasts,
            progress,
          };
          this.#drawSupportOverlay();
        });
        if (token !== this.#presentationToken) return;
        this.#explosionFeedback = null;
        this.#presentedView = after;
        this.#drawSupportOverlay();
        // A short beat between chain waves.
        await this.#animate(90 * durationScale, () => undefined);
        if (token !== this.#presentationToken) return;
      }
      if (token !== this.#presentationToken) return;
    }
    this.#animatedUnit = null;
    this.#heldUnits = NO_HELD_UNITS;
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

  #artSet(): ArtSetV7 {
    return this.#model?.artSet ?? "LEGACY";
  }

  /**
   * The direction's wrapped art resolver, rebuilt only when the direction or
   * its art registry changes (never per frame).
   */
  #directionRuntime(
    spec: BoardVisualDirectionV7,
    registry: ChibiArtRegistryV7 | undefined,
  ): BoardDirectionRuntimeV7 {
    const key = JSON.stringify(spec);
    const cached = this.#direction;
    if (cached?.key === key && cached.registry === registry)
      return cached.runtime;
    const environment = browserChibiRasterEnvironmentV7(this.#document);
    const runtime: BoardDirectionRuntimeV7 = {
      spec,
      art: createDirectedChibiArtV7({
        base: this.#chibiArt,
        direction: spec,
        environment,
        ...(registry === undefined
          ? {}
          : {
              samples: createChibiArtResolverV7({
                environment,
                registry,
                redraw: () => {
                  this.#glowCache.clear();
                  this.#draw();
                },
              }),
            }),
      }),
    };
    this.#direction = { key, registry, runtime };
    this.#glowCache.clear();
    return runtime;
  }

  /** Public diagnostics for the art set and its exact cell size. */
  #syncArtSetDataset(): void {
    const canvas = this.#canvas;
    if (canvas === null) return;
    const artSet = this.#artSet();
    const tile = String(chibiTileCssPx(this.#camera));
    const step =
      artSet === "CHIBI" ? String(chibiZoomStepForCamera(this.#camera)) : null;
    if (canvas.dataset.artSet !== artSet) canvas.dataset.artSet = artSet;
    if (canvas.dataset.tileCssPx !== tile) canvas.dataset.tileCssPx = tile;
    if (step === null) delete canvas.dataset.zoomStep;
    else if (canvas.dataset.zoomStep !== step) canvas.dataset.zoomStep = step;
  }

  #draw(): void {
    const model = this.#model;
    this.#syncArtSetDataset();
    this.#requestEffectArt();
    const context = this.#context;
    if (model === null || context === null) return;
    this.#drawSerial += 1;
    const now = this.#now();
    const jump = this.#selectionJump;
    // Preview labels stay clear of the HUD and the open dock (the band the
    // start-camera framing uses); measured only when a preview is offered.
    const labelSafeArea =
      this.#presentedView === null && model.offeredCommands.length > 0
        ? this.#unobscuredBand()
        : null;
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
      const held = this.#heldUnits;
      const presented =
        animated === null && held.size === 0
          ? plan
          : {
              ...plan,
              entries: plan.entries.map((entry) => {
                if (entry.kind !== "UNIT") return entry;
                if (animated !== null && entry.key === `unit:${animated.id}`)
                  return { ...entry, at: animated.at };
                const hold = held.get(Number(entry.key.slice(5)));
                return hold === undefined ? entry : { ...entry, at: hold };
              }),
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
        ...(this.#unitPulses.length === 0
          ? {}
          : { unitPulses: this.#unitPulses }),
        artSet: this.#artSet(),
        chibiArt: this.#chibiArt,
        ...(model.saturation === undefined
          ? {}
          : {
              saturation: {
                levels: model.saturation,
                cache: this.#saturationCache,
              },
            }),
        ...(model.visualDirection === undefined
          ? {}
          : {
              direction: this.#directionRuntime(
                model.visualDirection,
                model.visualDirectionArt,
              ),
            }),
        previewFocus: this.#hovered ?? this.#focused,
        labelSafeArea,
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
      if (this.#projectile.bomb === true)
        drawBombProjectileV7(context, x, y, this.#camera.zoom, progress);
      else if (this.#projectile.acid === true) {
        // Revision 19: a pale cream blob with a charcoal outline (never
        // green), and a small trailing drop.
        context.fillStyle = DINOSAUR_CUE_COLORS_V7.cream;
        context.strokeStyle = DINOSAUR_CUE_COLORS_V7.charcoal;
        context.lineWidth = Math.max(1, 2 * this.#camera.zoom);
        for (const [dx, dy, radius] of [
          [0, 0, 8],
          [-9, 6, 3.5],
        ] as const) {
          context.beginPath();
          context.arc(
            x + dx * this.#camera.zoom,
            y + dy * this.#camera.zoom,
            radius * this.#camera.zoom,
            0,
            Math.PI * 2,
          );
          context.fill();
          context.stroke();
        }
      } else if (this.#projectile.catapult) {
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

  /**
   * CHIBI effect rasters for the support cues (bead pulp_wars-vkq.14), or
   * null in LEGACY. Asking for every subject once starts their loads, so the
   * first Undead cue of a game usually finds its sprite ready; a sprite
   * still loading draws the code cue for that frame.
   */
  #supportEffectArt(): SupportEffectArtV7 | null {
    if (this.#artSet() !== "CHIBI") return null;
    const devicePixelRatio = this.#document.defaultView?.devicePixelRatio ?? 1;
    const deviceScale = chibiMasterScale(this.#camera) * devicePixelRatio;
    // The default look draws the direction's own effect sprites (the Undead
    // violet set, bead pulp_wars-3tq.12) and tints the code-drawn glows to
    // match; the classic look keeps the pale blue set.
    const model = this.#model;
    const directed = model?.visualDirection?.undeadAccent === "VIOLET";
    const art =
      model?.visualDirection === undefined
        ? this.#chibiArt
        : this.#directionRuntime(
            model.visualDirection,
            model.visualDirectionArt,
          ).art;
    return {
      devicePixelRatio,
      ...(directed ? { glow: UNDEAD_VIOLET_GLOW_V7 } : {}),
      image: (subject) => {
        const resolved = art.resolve({
          subject,
          at: { x: 0, y: 0 },
          deviceScale,
        });
        return resolved.kind === "READY"
          ? {
              image: resolved.image,
              width: resolved.asset.width,
              height: resolved.asset.height,
            }
          : null;
      },
    };
  }

  /** Starts loading the CHIBI effect rasters once, before the first cue. */
  #requestEffectArt(): void {
    if (this.#effectArtRequested || this.#artSet() !== "CHIBI") return;
    this.#effectArtRequested = true;
    const art = this.#supportEffectArt();
    for (const subject of SUPPORT_EFFECT_SUBJECTS_V7) art?.image(subject);
    for (const subject of MARTIAN_EFFECT_SUBJECTS_V7) art?.image(subject);
  }

  /**
   * Review tooling and tests: draws the given support cues at their fixed
   * progress on the effects canvas until cleared with an empty list. The
   * game never calls it; presentations clear it.
   */
  pinSupportFeedback(feedback: readonly SupportFeedbackV7[]): void {
    this.#pinnedSupportFeedback = feedback;
    this.#drawSupportOverlay();
  }

  /**
   * Review tooling and tests: draws the given explosion waves at their fixed
   * progress on the effects canvas until cleared with an empty list. The
   * game never calls it; presentations clear it.
   */
  pinExplosionFeedback(feedback: readonly ExplosionFeedbackV7[]): void {
    this.#pinnedExplosionFeedback = feedback;
    this.#drawSupportOverlay();
  }

  /**
   * Review tooling and tests: draws the given revision-19 Dinosaur cues at
   * their fixed progress on the effects canvas until cleared with an empty
   * list. The game never calls it; presentations clear it.
   */
  pinDinosaurFeedback(feedback: readonly DinosaurFeedbackV7[]): void {
    this.#pinnedDinosaurFeedback = feedback;
    this.#drawSupportOverlay();
  }

  /**
   * Review tooling and tests: draws the given Martian cues at their fixed
   * progress on the effects canvas until cleared with an empty list. The
   * game never calls it; presentations clear it.
   */
  pinMartianFeedback(feedback: readonly MartianFeedbackV7[]): void {
    this.#pinnedMartianFeedback = feedback;
    this.#requestEffectArt();
    this.#drawSupportOverlay();
  }

  #drawSupportOverlay(): void {
    const context = this.#effectsContext;
    const canvas = this.#effectsCanvas;
    if (context === null || canvas === null) return;
    const dpr = this.#document.defaultView?.devicePixelRatio ?? 1;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, this.#viewport.width, this.#viewport.height);
    const effectArt = this.#supportEffectArt();
    for (const pinned of this.#pinnedSupportFeedback)
      drawSupportFeedbackV7(context, this.#camera, pinned, false, effectArt);
    for (const pinned of this.#pinnedExplosionFeedback)
      drawExplosionFeedbackV7(context, this.#camera, pinned, false);
    for (const pinned of this.#pinnedDinosaurFeedback)
      drawDinosaurFeedbackV7(context, this.#camera, pinned);
    for (const pinned of this.#pinnedMartianFeedback)
      drawMartianFeedbackV7(context, this.#camera, pinned, effectArt);
    const martian = this.#martianFeedback;
    if (martian === null) {
      delete canvas.dataset.martianEffect;
      delete canvas.dataset.martianProgress;
    } else {
      canvas.dataset.martianEffect = martian.effect;
      canvas.dataset.martianProgress = martian.progress.toFixed(3);
      drawMartianFeedbackV7(context, this.#camera, martian, effectArt);
    }
    const dinosaur = this.#dinosaurFeedback;
    if (dinosaur === null) {
      delete canvas.dataset.dinosaurEffect;
      delete canvas.dataset.dinosaurCells;
      delete canvas.dataset.dinosaurProgress;
    } else {
      canvas.dataset.dinosaurEffect = dinosaur.effect;
      canvas.dataset.dinosaurCells = String(dinosaur.cells.length);
      canvas.dataset.dinosaurProgress = dinosaur.progress.toFixed(3);
      drawDinosaurFeedbackV7(context, this.#camera, dinosaur);
    }
    const explosion = this.#explosionFeedback;
    if (explosion === null) {
      delete canvas.dataset.explosionWave;
      delete canvas.dataset.explosionBlasts;
      delete canvas.dataset.explosionProgress;
    } else {
      canvas.dataset.explosionWave = String(explosion.wave);
      canvas.dataset.explosionBlasts = String(explosion.blasts.length);
      canvas.dataset.explosionProgress = explosion.progress.toFixed(3);
      drawExplosionFeedbackV7(
        context,
        this.#camera,
        explosion,
        this.#model?.motion === "REDUCED",
      );
    }
    const feedback = this.#supportFeedback;
    const windmill = this.#windmillHealingFeedback;
    if (feedback === null && windmill === null) {
      delete canvas.dataset.supportEffect;
      delete canvas.dataset.supportRecipients;
      delete canvas.dataset.supportProgress;
      delete canvas.dataset.healingPhase;
      delete canvas.dataset.healingSources;
      delete canvas.dataset.healingRecipients;
      delete canvas.dataset.healingProgress;
      return;
    }
    if (feedback !== null) {
      canvas.dataset.supportEffect = feedback.effect;
      canvas.dataset.supportRecipients = String(feedback.recipients.length);
      canvas.dataset.supportProgress = feedback.progress.toFixed(3);
      drawSupportFeedbackV7(
        context,
        this.#camera,
        feedback,
        this.#model?.motion === "REDUCED",
        effectArt,
      );
    } else {
      delete canvas.dataset.supportEffect;
      delete canvas.dataset.supportRecipients;
      delete canvas.dataset.supportProgress;
    }
    if (windmill !== null) {
      canvas.dataset.healingPhase = windmill.phase;
      canvas.dataset.healingSources = String(windmill.sources.length);
      canvas.dataset.healingRecipients = String(windmill.recipients.length);
      canvas.dataset.healingProgress = windmill.progress.toFixed(3);
      drawWindmillHealingFeedbackV7(
        context,
        this.#camera,
        windmill,
        this.#model?.motion === "REDUCED",
      );
    } else {
      delete canvas.dataset.healingPhase;
      delete canvas.dataset.healingSources;
      delete canvas.dataset.healingRecipients;
      delete canvas.dataset.healingProgress;
    }
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
          : `${unitName(model.view, unit)}, ${unit.hp} of ${unit.maxHp} HP. Explicitly revealed unit on unexplored terrain.`;
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
      model.view.graves.some((grave) => same(grave, at)) ? "Grave" : "",
      city === undefined
        ? ""
        : `${city.isCapital ? "Capital" : "City"} level ${city.level}`,
      unit === undefined
        ? ""
        : [
            `${unitName(model.view, unit)}, ${unit.hp} of ${unit.maxHp} HP`,
            afflictionCursorCueV7(model.view, unit.id),
          ]
            .filter(Boolean)
            .join(", "),
      actions.length === 0 ? "" : `Available: ${actions.join(", ")}`,
    ]
      .filter(Boolean)
      .join(". ");
  }

  readonly #onPointerDown = (event: PointerEvent): void => {
    this.#cameraFollowAllowed = false;
    this.#cancelCameraPan();
    const canvas = this.#canvas;
    if (canvas === null) return;
    const point = localPoint(canvas, event);
    this.#pointers.set(event.pointerId, point);
    if (this.#pointers.size === 1)
      this.#pointer = { id: event.pointerId, start: point, current: point };
    else if (this.#pointers.size === 2) {
      this.#pointer = null;
      this.#pinch = pinchState([...this.#pointers.values()]);
      this.#pinchStart =
        this.#pinch === null
          ? null
          : {
              distance: this.#pinch.distance,
              step: chibiZoomStepForCamera(this.#camera),
            };
    }
    canvas.setPointerCapture?.(event.pointerId);
  };
  readonly #onPointerMove = (event: PointerEvent): void => {
    const canvas = this.#canvas;
    if (canvas === null) return;
    if (!this.#pointers.has(event.pointerId)) {
      if (this.#pointers.size === 0 && event.pointerType !== "touch")
        this.#hover(localPoint(canvas, event));
      return;
    }
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
        const start = this.#pinchStart;
        if (this.#artSet() !== "CHIBI")
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
        else if (start !== null && start.distance > 0) {
          const step = nearestChibiZoomStep(
            start.step * (current.distance / start.distance),
          );
          if (step !== chibiZoomStepForCamera(this.#camera))
            this.#camera = zoomChibiCameraAt(
              this.#camera,
              step,
              current.midpoint,
            );
        }
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
      this.#pinchStart = null;
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
  readonly #onPointerLeave = (): void => {
    this.#hover(null);
  };
  /**
   * Revision 13: hovering an attack target that splashes previews its splash
   * area. Hover never moves the keyboard cursor, and a hover that cannot
   * change a splash preview does not redraw.
   */
  #hover(point: Point | null): void {
    const model = this.#model;
    const at =
      point === null || model === null
        ? null
        : pickGridTile(point, this.#camera, model.view.board);
    const prior = this.#hovered;
    if (
      (prior === null && at === null) ||
      (prior !== null && at !== null && same(prior, at))
    )
      return;
    this.#hovered = at;
    if (model === null || this.#presentedView !== null) return;
    const splashAt = (cell: CoordV7 | null): boolean =>
      cell !== null &&
      this.#planFor(model.view, model.offeredCommands).targets.some(
        (target) =>
          (target.splash !== undefined || target.blast !== undefined) &&
          same(target.at, cell),
      );
    if (splashAt(prior) || splashAt(at)) this.#draw();
  }
  readonly #onPointerCancel = (event: PointerEvent): void => {
    this.#pointers.delete(event.pointerId);
    this.#pointer = null;
    this.#pinch = null;
    this.#pinchStart = null;
  };
  readonly #onWheel = (event: WheelEvent): void => {
    this.#cameraFollowAllowed = false;
    event.preventDefault();
    const canvas = this.#canvas;
    if (canvas === null) return;
    if (this.#artSet() === "CHIBI") {
      // Accumulate trackpad deltas so one wheel notch moves one discrete step.
      const unit = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? 800 : 1;
      const delta = event.deltaY * unit;
      if (Math.sign(delta) !== Math.sign(this.#wheelDelta))
        this.#wheelDelta = 0;
      this.#wheelDelta += delta;
      if (Math.abs(this.#wheelDelta) < CHIBI_WHEEL_STEP_DELTA) return;
      const direction = this.#wheelDelta < 0 ? "IN" : "OUT";
      this.#wheelDelta = 0;
      this.#camera = zoomChibiCameraAt(
        this.#camera,
        adjacentChibiZoomStep(chibiZoomStepForCamera(this.#camera), direction),
        localPoint(canvas, event),
      );
      this.#draw();
      return;
    }
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

  /**
   * The canvas rows not covered by the top HUD or an open selection dock, in
   * CSS px from the canvas top; the whole canvas when neither is mounted.
   * With `reserveDock`, a closed dock still reserves the board host's
   * `scroll-padding-bottom` (set by the stylesheet on layouts where the
   * full-width dock covers the map), so a new match is framed above where
   * the dock will open.
   */
  #unobscuredBand(reserveDock = false): ScreenBand {
    const canvas = this.#canvas;
    if (canvas === null) return { top: 0, bottom: this.#viewport.height };
    const canvasRect = canvas.getBoundingClientRect();
    const shell = canvas.closest<HTMLElement>(".v7-app-shell");
    const hudRect = shell
      ?.querySelector<HTMLElement>(".v7-match-hud")
      ?.getBoundingClientRect();
    const dockRect = shell
      ?.querySelector<HTMLElement>(".v7-selection-dock")
      ?.getBoundingClientRect();
    const host = canvas.parentElement;
    const reserve =
      reserveDock && host !== null
        ? Number.parseFloat(
            this.#document.defaultView?.getComputedStyle(host)
              .scrollPaddingBottom ?? "",
          )
        : Number.NaN;
    return {
      top: Math.max(
        0,
        hudRect === undefined || hudRect.bottom <= canvasRect.top
          ? 0
          : Math.min(this.#viewport.height, hudRect.bottom - canvasRect.top),
      ),
      bottom: Math.min(
        this.#viewport.height,
        dockRect !== undefined && dockRect.top < canvasRect.bottom
          ? Math.max(0, dockRect.top - canvasRect.top)
          : Number.isFinite(reserve) && reserve > 0
            ? this.#viewport.height - reserve
            : this.#viewport.height,
      ),
    };
  }

  #keepFocusedOnscreen(): void {
    const canvas = this.#canvas;
    if (this.#focused === null || canvas === null) return;
    const point = worldToScreen(projectGrid(this.#focused), this.#camera);
    const margin = Math.min(
      64,
      this.#viewport.width / 4,
      this.#viewport.height / 4,
    );
    const { top: unobscuredTop, bottom: unobscuredBottom } =
      this.#unobscuredBand();
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
    this.#cancelCameraPan();
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
      canvas.removeEventListener("pointerleave", this.#onPointerLeave);
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
    this.#hovered = null;
    this.#pinch = null;
    this.#pinchStart = null;
    this.#wheelDelta = 0;
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
    bomb = false,
    acid = false,
  ): Promise<void> {
    await this.#animate(duration, (progress) => {
      this.#projectile = { from, to, progress, catapult, bomb, acid };
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

/** The effects-overlay cue of a Martian presentation step at `progress`. */
function martianFeedbackOf(
  step: Extract<CorePresentationStepV7, { readonly kind: "MARTIAN" }>,
  progress: number,
): MartianFeedbackV7 {
  return {
    effect: step.effect,
    cells: step.cells,
    ...(step.from === undefined ? {} : { from: step.from }),
    ...(step.pierce === undefined ? {} : { pierce: step.pierce }),
    ...(step.fullPower === true ? { fullPower: true } : {}),
    progress,
  };
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
/** Human units keep their revision-12 names; Undead units use their own. */
function unitName(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
): string {
  if (unitIsUndeadV7(view, unit))
    return `Undead ${unitRoleRuleV7(view, unit).label}`;
  if (unitIsGoblinV7(view, unit))
    return `Goblin ${unitRoleRuleV7(view, unit).label}`;
  // Revision 19: Dinosaur units by their own names; an Egg with its
  // countdown.
  if (unitIsDinosaurV7(view, unit)) {
    const turns = eggTurnsRemainingV7(view, unit.id);
    return `Dinosaur ${unitDisplayNameV7(view, unit)}${
      unit.form === "EGG" && turns !== null
        ? ` (${eggCountdownTextV7(turns)})`
        : ""
    }`;
  }
  return title(unit.role);
}
const NO_HELD_UNITS: ReadonlyMap<number, CoordV7> = new Map();
/**
 * Revision 19: where each unit with a later slide in `steps` waits: the
 * start of its next `MOVE` step after `index`.
 */
function heldUnitsAfterV7(
  steps: readonly CorePresentationStepV7[],
  index: number,
): ReadonlyMap<number, CoordV7> {
  const held = new Map<number, CoordV7>();
  for (let later = steps.length - 1; later > index; later -= 1) {
    const step = steps[later];
    if (step?.kind !== "MOVE") continue;
    const start = step.path[0];
    if (start !== undefined) held.set(step.unitId, start);
  }
  return held;
}
/**
 * Revision 19 sprite cues of a Dinosaur step at `progress` (0 to 1): a laid
 * Egg pops in with one small bounce, a hatching Egg wobbles twice before
 * its hatchling grows from x0.6, and a grown unit pulses to x1.2 and
 * settles. Other cues move no sprite.
 */
export function dinosaurUnitPulsesV7(
  step: Extract<CorePresentationStepV7, { readonly kind: "DINOSAUR" }>,
  progress: number,
  zoom: number,
): readonly UnitPulseV7[] {
  const pulse = (): Omit<UnitPulseV7, "unitId"> | null => {
    if (step.effect === "EGG_LAID")
      return {
        scale:
          progress < 0.6
            ? 0.6 + 0.55 * (progress / 0.6)
            : 1.15 - 0.15 * ((progress - 0.6) / 0.4),
      };
    if (step.effect === "GROW")
      return { scale: 1 + 0.2 * Math.sin(Math.PI * progress) };
    if (step.effect === "HATCH")
      return progress < 0.45
        ? {
            scale: 1,
            offsetXCssPx:
              Math.sin((progress / 0.45) * Math.PI * 4) * 4.8 * zoom,
          }
        : { scale: 0.6 + 0.4 * ((progress - 0.45) / 0.55) };
    return null;
  };
  const value = pulse();
  return value === null
    ? []
    : step.unitIds.map((unitId) => ({ unitId, ...value }));
}
/** Pixel wheel delta for one CHIBI zoom step (one ordinary mouse notch). */
const CHIBI_WHEEL_STEP_DELTA = 50;
const NO_COMMANDS: readonly BoardHostModelV7["offeredCommands"][number][] = [];
const title = (value: string): string =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
let nextDescriptionIdV7 = 1;
