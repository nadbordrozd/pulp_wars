import type { CommandV6, CoordV6, PlayerViewV6 } from "../../engine/index";
import {
  drawBoardV6,
  type Ruleset6AcceptedImageResolver,
} from "./board-renderer-v6";
import { createRuleset6AcceptedImageResolver } from "./accepted-images-v6";
import {
  MIN_ZOOM,
  boardWorldBounds,
  centerCameraOn,
  fitCamera,
  panCamera,
  pickGridTile,
  projectGrid,
  sameCoord,
  worldToScreen,
  zoomCameraAt,
  type CameraState,
  type Point,
  type Size,
} from "./geometry";
import {
  buildRenderPlanV6,
  selectionCoordV6,
  type BoardRenderInteractionV6,
  type BoardRenderPlanV6,
  type BoardSelectionV6,
  type MapCommandTargetV6,
  type RenderPlanEntryV6,
} from "./render-plan-v6";
import { cityPopulationPresentationV6 } from "../city-population-presentation-v6";
import {
  combatAnimationFrameV6,
  type CombatPresentationV6,
} from "./combat-presentation-v6";

export interface CanvasBoardHostModelV6 {
  readonly matchInstanceId: number | string;
  readonly view: PlayerViewV6;
  readonly interactive: boolean;
  readonly motion?: "FULL" | "REDUCED";
  readonly combatPresentation?: CombatPresentationV6 | null;
  readonly interaction: BoardRenderInteractionV6;
}

export interface CanvasBoardHostCallbacksV6 {
  readonly onSelection: (selection: BoardSelectionV6 | null) => void;
  readonly onInspect: (selection: BoardSelectionV6) => void;
  readonly onCommandCandidates: (
    candidates: readonly MapCommandTargetV6[],
    at: CoordV6,
  ) => void;
  readonly onZoom: (direction: "IN" | "OUT") => void;
  readonly onCancel?: () => void;
  readonly onCombatPresentationComplete?: (key: string) => void;
}

export interface BoardHostV6 {
  mount(container: HTMLElement, callbacks: CanvasBoardHostCallbacksV6): void;
  unmount(): void;
  update(model: CanvasBoardHostModelV6): void;
  activate(at: CoordV6): void;
  select(selection: BoardSelectionV6): void;
  resetActivationCycle(): void;
  zoom(direction: "IN" | "OUT"): void;
  focus(): void;
  screenPoint(at: CoordV6): Point | null;
  destroy(): void;
}

export interface InspectionActivationCycleV6 {
  readonly at: CoordV6;
  readonly occupant:
    | { readonly kind: "UNIT"; readonly id: number }
    | { readonly kind: "WALL"; readonly id: number };
  readonly next: "UNDERLYING" | "OCCUPANT";
}

interface ActivePointerV6 {
  readonly start: Point;
  readonly current: Point;
}

interface PinchGestureV6 {
  readonly distance: number;
  readonly midpoint: Point;
  readonly camera: CameraState;
}

const DRAG_THRESHOLD = 6;
const TARGET_ENTRY_KINDS = new Set<RenderPlanEntryV6["kind"]>([
  "MOVE_TARGET",
  "ATTACK_TARGET",
  "ROLL_TARGET",
  "HEAL_TARGET",
  "WALL_TARGET",
  "ABILITY_TARGET",
  "ECONOMIC_TARGET",
  "TRAIN_TARGET",
  "CHOICE_TARGET",
]);
let nextDescriptionId = 1;

/**
 * Accessible responsive ruleset-6 Canvas shell. Its only game-data input is an
 * observation-safe PlayerViewV6 plus explicit presentation state. Camera,
 * cursor and inspection-cycle changes never enter simulation state.
 */
export class CanvasBoardHostV6 implements BoardHostV6 {
  readonly #document: Document;
  readonly #images: Ruleset6AcceptedImageResolver;
  #container: HTMLElement | null = null;
  #canvas: HTMLCanvasElement | null = null;
  #context: CanvasRenderingContext2D | null = null;
  #activator: HTMLButtonElement | null = null;
  #description: HTMLElement | null = null;
  #callbacks: CanvasBoardHostCallbacksV6 | null = null;
  #model: CanvasBoardHostModelV6 | null = null;
  #selection: BoardSelectionV6 | null = null;
  #focused: CoordV6 | null = null;
  #activeTarget: CoordV6 | null = null;
  #inspectionCycle: InspectionActivationCycleV6 | null = null;
  #observedCommandIndex: number | null = null;
  #camera: CameraState = { offsetX: 0, offsetY: 0, zoom: 1 };
  #viewport: Size = { width: 1024, height: 592 };
  #devicePixelRatio = 1;
  #boardKey: string | null = null;
  #resizeObserver: ResizeObserver | null = null;
  readonly #pointers = new Map<number, ActivePointerV6>();
  #pinch: PinchGestureV6 | null = null;
  #didDrag = false;
  #readinessPhaseKey: string | null = null;
  #readinessPhaseStartedAt = 0;
  #animationFrame: number | null = null;
  #combatPresentationKey: string | null = null;
  #combatPresentationStartedAt = 0;
  #completedCombatPresentationKey: string | null = null;
  #combatCompletionTimer: number | null = null;

  constructor(documentRoot: Document, images?: Ruleset6AcceptedImageResolver) {
    this.#document = documentRoot;
    this.#images =
      images ??
      createRuleset6AcceptedImageResolver(documentRoot, () => this.#draw());
  }

  mount(container: HTMLElement, callbacks: CanvasBoardHostCallbacksV6): void {
    this.#detach(true);
    this.#container = container;
    this.#callbacks = callbacks;
    const canvas = this.#document.createElement("canvas");
    const activator = this.#document.createElement("button");
    const description = this.#document.createElement("p");
    const descriptionId = `ruleset6-map-cursor-${nextDescriptionId}`;
    nextDescriptionId += 1;

    canvas.className = "board-canvas board-canvas-v6";
    canvas.tabIndex = 0;
    canvas.dataset.focusId = "board-v6";
    canvas.setAttribute("role", "application");
    canvas.setAttribute(
      "aria-label",
      "Ruleset 6 square-grid battlefield. Arrow keys move the map cursor by row or column, Shift plus an arrow moves diagonally, Enter or Space activates once, drag pans, and plus or minus zooms.",
    );
    canvas.setAttribute("aria-describedby", descriptionId);
    canvas.style.touchAction = "none";
    canvas.textContent =
      "The battlefield requires Canvas. The map cursor and actions also have semantic controls.";

    activator.type = "button";
    activator.className = "sr-only map-cursor-activator";
    activator.textContent = "Activate map cursor";
    activator.setAttribute("aria-describedby", descriptionId);

    description.className = "sr-only";
    description.id = descriptionId;
    description.setAttribute("aria-live", "polite");

    this.#canvas = canvas;
    this.#activator = activator;
    this.#description = description;
    try {
      this.#context = canvas.getContext("2d");
    } catch {
      this.#context = null;
    }
    canvas.addEventListener("pointerdown", this.#onPointerDown);
    canvas.addEventListener("pointermove", this.#onPointerMove);
    canvas.addEventListener("pointerup", this.#onPointerUp);
    canvas.addEventListener("pointercancel", this.#onPointerCancel);
    canvas.addEventListener("pointerleave", this.#onPointerLeave);
    canvas.addEventListener("wheel", this.#onWheel, { passive: false });
    canvas.addEventListener("keydown", this.#onKeyDown);
    activator.addEventListener("click", this.#onSemanticActivate);
    this.#document.defaultView?.addEventListener("resize", this.#onResize);
    container.replaceChildren(canvas, activator, description);
    if (typeof ResizeObserver !== "undefined") {
      this.#resizeObserver = new ResizeObserver(() => this.#resize());
      this.#resizeObserver.observe(container);
    }
    this.#resize();
    this.#draw();
  }

  unmount(): void {
    this.#detach(false);
  }

  update(model: CanvasBoardHostModelV6): void {
    const previousModel = this.#model;
    const matchChanged =
      previousModel === null ||
      previousModel.matchInstanceId !== model.matchInstanceId;
    if (matchChanged) this.#resetCombatPresentation();
    const commandChanged =
      !matchChanged &&
      this.#observedCommandIndex !== null &&
      this.#observedCommandIndex !== model.view.commandIndex;
    const activePlayerId = model.view.turnOrder[model.view.activeSeatIndex];
    const readinessPhaseKey = `${String(model.matchInstanceId)}:${model.view.round}:${activePlayerId ?? "none"}`;
    if (readinessPhaseKey !== this.#readinessPhaseKey) {
      this.#readinessPhaseKey = readinessPhaseKey;
      this.#readinessPhaseStartedAt = this.#now();
    }
    this.#model = model;
    this.#syncCombatPresentationClock(model);
    this.#observedCommandIndex = model.view.commandIndex;

    const key = `${String(model.matchInstanceId)}:${model.view.board.width}x${model.view.board.height}`;
    if (this.#boardKey !== key) {
      this.#boardKey = key;
      this.#camera = fitCamera(model.view.board, this.#viewport);
      this.#focused = initialFocusV6(model.view);
      this.#activeTarget = null;
      this.#selection = model.interaction.selection;
      this.#inspectionCycle = null;
      this.#resetGestures();
      const bounds = boardWorldBounds(
        model.view.board.width,
        model.view.board.height,
      );
      const doesNotFit =
        (bounds.right - bounds.left) * this.#camera.zoom >
          this.#viewport.width * 1.02 ||
        (bounds.bottom - bounds.top) * this.#camera.zoom >
          this.#viewport.height * 1.02;
      if (this.#camera.zoom === MIN_ZOOM && doesNotFit) {
        this.#camera = centerCameraOn(
          this.#camera,
          projectGrid(this.#focused),
          this.#viewport,
        );
      }
    } else {
      this.#selection = model.interaction.selection;
    }
    if (commandChanged) this.#inspectionCycle = null;
    this.#validatePublicPresentation();
    this.#canvas?.setAttribute("aria-disabled", String(!model.interactive));
    if (this.#canvas !== null)
      this.#canvas.dataset.interactive = String(model.interactive);
    this.#draw();
    this.#syncAnimationFrame();
  }

  activate(at: CoordV6): void {
    this.#activateTile(at);
  }

  select(selection: BoardSelectionV6): void {
    const model = this.#model;
    if (model === null || selectionCoordV6(model.view, selection) === null)
      return;
    if (!sameSelectionV6(selection, this.#selection))
      this.#inspectionCycle = null;
    this.#selection = selection;
    this.#callbacks?.onSelection(selection);
    this.#draw();
  }

  resetActivationCycle(): void {
    this.#inspectionCycle = null;
  }

  zoom(direction: "IN" | "OUT"): void {
    const fixed = {
      x: this.#viewport.width / 2,
      y: this.#viewport.height / 2,
    };
    const factor = direction === "IN" ? 1.2 : 1 / 1.2;
    this.#camera = zoomCameraAt(
      this.#camera,
      this.#camera.zoom * factor,
      fixed,
    );
    this.#callbacks?.onZoom(direction);
    this.#draw();
  }

  focus(): void {
    this.#canvas?.focus({ preventScroll: true });
  }

  screenPoint(at: CoordV6): Point | null {
    return this.#model === null
      ? null
      : worldToScreen(projectGrid(at), this.#camera);
  }

  destroy(): void {
    this.#detach(false);
    this.#model = null;
    this.#selection = null;
    this.#focused = null;
    this.#activeTarget = null;
    this.#inspectionCycle = null;
    this.#observedCommandIndex = null;
    this.#boardKey = null;
    this.#readinessPhaseKey = null;
    this.#readinessPhaseStartedAt = 0;
    this.#resetCombatPresentation();
    this.#camera = { offsetX: 0, offsetY: 0, zoom: 1 };
  }

  readonly #onResize = (): void => this.#resize();

  readonly #onSemanticActivate = (): void => {
    if (this.#focused !== null) this.#activateTile(this.#focused);
  };

  readonly #onPointerDown = (event: PointerEvent): void => {
    const point = this.#eventPoint(event);
    this.#pointers.set(event.pointerId, { start: point, current: point });
    this.#canvas?.setPointerCapture?.(event.pointerId);
    if (this.#pointers.size === 1) this.#didDrag = false;
    if (this.#pointers.size === 2) {
      const [first, second] = [...this.#pointers.values()];
      if (first !== undefined && second !== undefined) {
        this.#pinch = {
          distance: Math.max(1, distanceV6(first.current, second.current)),
          midpoint: midpointV6(first.current, second.current),
          camera: this.#camera,
        };
        this.#didDrag = true;
      }
    }
    event.preventDefault();
  };

  readonly #onPointerMove = (event: PointerEvent): void => {
    const point = this.#eventPoint(event);
    const active = this.#pointers.get(event.pointerId);
    if (active === undefined) {
      this.#activeTarget = this.#pick(point);
      this.#draw();
      return;
    }
    this.#pointers.set(event.pointerId, {
      start: active.start,
      current: point,
    });
    if (this.#pointers.size >= 2 && this.#pinch !== null) {
      const [first, second] = [...this.#pointers.values()];
      if (first !== undefined && second !== undefined) {
        const currentMidpoint = midpointV6(first.current, second.current);
        const previousZoom = this.#camera.zoom;
        const zoomed = zoomCameraAt(
          this.#pinch.camera,
          this.#pinch.camera.zoom *
            (distanceV6(first.current, second.current) / this.#pinch.distance),
          this.#pinch.midpoint,
        );
        this.#camera = panCamera(zoomed, {
          x: currentMidpoint.x - this.#pinch.midpoint.x,
          y: currentMidpoint.y - this.#pinch.midpoint.y,
        });
        if (this.#camera.zoom !== previousZoom) {
          this.#callbacks?.onZoom(
            this.#camera.zoom > previousZoom ? "IN" : "OUT",
          );
        }
      }
    } else {
      if (distanceV6(active.start, point) > DRAG_THRESHOLD)
        this.#didDrag = true;
      if (this.#didDrag) {
        this.#camera = panCamera(this.#camera, {
          x: point.x - active.current.x,
          y: point.y - active.current.y,
        });
      }
    }
    this.#activeTarget = this.#pick(point);
    this.#draw();
    event.preventDefault();
  };

  readonly #onPointerUp = (event: PointerEvent): void => {
    const point = this.#eventPoint(event);
    const wasPinching = this.#pinch !== null;
    this.#pointers.delete(event.pointerId);
    this.#canvas?.releasePointerCapture?.(event.pointerId);
    if (this.#pointers.size < 2) this.#pinch = null;
    if (!this.#didDrag && !wasPinching) this.#activatePoint(point);
    if (this.#pointers.size === 0) this.#didDrag = false;
    event.preventDefault();
  };

  readonly #onPointerCancel = (event: PointerEvent): void => {
    this.#pointers.delete(event.pointerId);
    if (this.#pointers.size < 2) this.#pinch = null;
    if (this.#pointers.size === 0) this.#didDrag = false;
  };

  readonly #onPointerLeave = (): void => {
    if (this.#pointers.size === 0) {
      this.#activeTarget = null;
      this.#draw();
    }
  };

  readonly #onWheel = (event: WheelEvent): void => {
    const point = this.#eventPoint(event);
    const direction = event.deltaY < 0 ? "IN" : "OUT";
    const factor = direction === "IN" ? 1.12 : 1 / 1.12;
    this.#camera = zoomCameraAt(
      this.#camera,
      this.#camera.zoom * factor,
      point,
    );
    this.#callbacks?.onZoom(direction);
    this.#draw();
    event.preventDefault();
  };

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    const model = this.#model;
    if (model === null) return;
    if (event.key === "+" || event.key === "=") {
      this.zoom("IN");
      consumeKey(event);
      return;
    }
    if (event.key === "-") {
      this.zoom("OUT");
      consumeKey(event);
      return;
    }
    if (event.key === "Escape") {
      if (
        model.interaction.targetMode !== null ||
        model.interaction.economicPreview !== null
      ) {
        this.#callbacks?.onCancel?.();
        this.#descriptionText("Map target cancelled.");
        consumeKey(event);
        return;
      }
      if (this.#selection !== null || this.#inspectionCycle !== null) {
        this.#selection = null;
        this.#inspectionCycle = null;
        this.#callbacks?.onSelection(null);
        this.#descriptionText("Map selection cleared.");
        this.#draw();
        consumeKey(event);
      }
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      if (this.#focused !== null) this.#activateTile(this.#focused);
      consumeKey(event);
      return;
    }
    const delta = keyboardDeltaV6(event.key, event.shiftKey);
    if (delta === null) return;
    const current = this.#focused ?? initialFocusV6(model.view);
    this.#focused = {
      x: Math.max(0, Math.min(model.view.board.width - 1, current.x + delta.x)),
      y: Math.max(
        0,
        Math.min(model.view.board.height - 1, current.y + delta.y),
      ),
    };
    this.#activeTarget = this.#focused;
    this.#draw();
    consumeKey(event);
  };

  #activatePoint(point: Point): void {
    const at = this.#pick(point);
    if (at !== null) this.#activateTile(at);
  }

  #activateTile(at: CoordV6): void {
    const model = this.#model;
    if (model === null || !onBoardV6(model.view, at)) return;
    this.#focused = at;
    this.#activeTarget = at;
    if (
      this.#inspectionCycle !== null &&
      !sameCoord(this.#inspectionCycle.at, at)
    ) {
      this.#inspectionCycle = null;
    }

    const plan = this.#plan();
    const candidates = commandCandidatesAtV6(plan, at);
    if (model.interactive && candidates.length > 0) {
      this.#callbacks?.onCommandCandidates(candidates, at);
      return;
    }

    const activation = resolveInspectionActivationV6(
      model.view,
      at,
      this.#inspectionCycle,
    );
    const selectionChanged = !sameSelectionV6(
      activation.selection,
      this.#selection,
    );
    this.#inspectionCycle = activation.cycle;
    if (!selectionChanged && activation.cycle === null) {
      this.#callbacks?.onInspect(activation.selection);
      this.#draw();
      return;
    }
    this.#selection = activation.selection;
    this.#callbacks?.onSelection(activation.selection);
    this.#draw();
  }

  #plan(): BoardRenderPlanV6 {
    const model = this.#model;
    if (model === null)
      throw new Error("Cannot build a ruleset-6 board plan before update");
    return buildRenderPlanV6(model.view, {
      ...model.interaction,
      selection: this.#selection,
      activeTarget: this.#activeTarget ?? model.interaction.activeTarget,
    });
  }

  #pick(point: Point): CoordV6 | null {
    const model = this.#model;
    return model === null
      ? null
      : pickGridTile(point, this.#camera, model.view.board);
  }

  #eventPoint(event: MouseEvent): Point {
    const bounds = this.#canvas?.getBoundingClientRect();
    return {
      x: event.clientX - (bounds?.left ?? 0),
      y: event.clientY - (bounds?.top ?? 0),
    };
  }

  #resize(): void {
    const container = this.#container;
    const canvas = this.#canvas;
    if (container === null || canvas === null) return;
    const bounds = container.getBoundingClientRect();
    const viewport = {
      width: Math.max(1, bounds.width || container.clientWidth || 1024),
      height: Math.max(1, bounds.height || container.clientHeight || 592),
    };
    const previous = this.#viewport;
    this.#viewport = viewport;
    this.#devicePixelRatio = Math.max(
      1,
      this.#document.defaultView?.devicePixelRatio ?? 1,
    );
    canvas.width = Math.round(viewport.width * this.#devicePixelRatio);
    canvas.height = Math.round(viewport.height * this.#devicePixelRatio);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    if (
      this.#boardKey !== null &&
      (previous.width !== viewport.width || previous.height !== viewport.height)
    ) {
      this.#camera = panCamera(this.#camera, {
        x: (viewport.width - previous.width) / 2,
        y: (viewport.height - previous.height) / 2,
      });
    }
    this.#draw();
  }

  #draw(): void {
    const model = this.#model;
    if (model === null) return;
    const currentRatio = Math.max(
      1,
      this.#document.defaultView?.devicePixelRatio ?? 1,
    );
    if (currentRatio !== this.#devicePixelRatio && this.#canvas !== null) {
      this.#resize();
      return;
    }
    const plan = this.#plan();
    if (this.#context !== null) {
      drawBoardV6({
        context: this.#context,
        viewport: this.#viewport,
        camera: this.#camera,
        plan,
        devicePixelRatio: this.#devicePixelRatio,
        images: this.#images,
        readinessElapsedMs: this.#now() - this.#readinessPhaseStartedAt,
        reducedMotion: !boardReadinessAnimationNeededV6(model),
        combatPresentation: model.combatPresentation ?? null,
        combatFrame:
          model.combatPresentation === undefined ||
          model.combatPresentation === null
            ? null
            : combatAnimationFrameV6(
                model.combatPresentation,
                this.#combatElapsedMs(),
              ),
      });
    }
    this.#describe(plan);
  }

  #describe(plan: BoardRenderPlanV6): void {
    const model = this.#model;
    const focused = this.#focused;
    if (model === null || focused === null) return;
    const tile = model.view.board.tiles.find((candidate) =>
      sameCoord(candidate.at, focused),
    );
    const commands = commandCandidatesAtV6(plan, focused).map((candidate) =>
      describeCommandV6(candidate.command),
    );
    let description: string;
    if (tile?.explored !== true) {
      description = "fog; unexplored";
    } else {
      const facts = [tile.terrain.toLowerCase()];
      if (tile.resource === "UNKNOWN_RESOURCE")
        facts.push("unknown resource; research may reveal it");
      else if (tile.resource !== null) facts.push(tile.resource.toLowerCase());
      if (tile.improvement !== null)
        facts.push(tile.improvement.toLowerCase().replaceAll("_", " "));
      if (tile.road) facts.push("road");
      if (tile.territoryOwnerId !== null)
        facts.push(`Player ${tile.territoryOwnerId} territory`);
      const city = model.view.cities.find((candidate) =>
        sameCoord(candidate.at, focused),
      );
      const unit = model.view.units.find((candidate) =>
        sameCoord(candidate.at, focused),
      );
      const wall = model.view.chocolateWalls.find((candidate) =>
        sameCoord(candidate.at, focused),
      );
      if (unit !== undefined)
        facts.push(
          `${factionV6(model.view, unit.ownerId)} ${unit.role.toLowerCase()} unit ${unit.id}, ${unit.hp} of ${unit.maxHp} HP, ${unit.activation.handled ? "handled" : "needs action"}`,
        );
      if (city !== undefined)
        facts.push(
          `City ${city.id}, level ${city.level}, Player ${city.ownerId}; ${cityPopulationPresentationV6(city).accessibleText}`,
        );
      if (wall !== undefined)
        facts.push(
          `Chocolate Wall ${wall.id}, Player ${wall.ownerId}, ${wall.hp} of 10 HP`,
        );
      description = facts.join(", ");
    }
    const actionText =
      commands.length === 0
        ? "No map action at this coordinate."
        : model.interactive
          ? `Available: ${commands.join(", ")}.`
          : `View only; ${commands.length} map action${commands.length === 1 ? " is" : "s are"} disabled.`;
    this.#descriptionText(
      `Map cursor column ${focused.x + 1}, row ${focused.y + 1}: ${description}. ${actionText}`,
    );
    this.#activator?.setAttribute(
      "aria-label",
      `Activate map cursor at column ${focused.x + 1}, row ${focused.y + 1}`,
    );
  }

  #descriptionText(text: string): void {
    if (this.#description !== null && this.#description.textContent !== text)
      this.#description.textContent = text;
  }

  #validatePublicPresentation(): void {
    const model = this.#model;
    if (model === null) return;
    if (
      this.#selection !== null &&
      selectionCoordV6(model.view, this.#selection) === null
    ) {
      this.#selection = null;
      this.#inspectionCycle = null;
    }
    const cycle = this.#inspectionCycle;
    if (cycle === null) return;
    const visible =
      cycle.occupant.kind === "UNIT"
        ? model.view.units.some(
            (unit) =>
              unit.id === cycle.occupant.id && sameCoord(unit.at, cycle.at),
          )
        : model.view.chocolateWalls.some(
            (wall) =>
              wall.id === cycle.occupant.id && sameCoord(wall.at, cycle.at),
          );
    if (!visible) this.#inspectionCycle = null;
  }

  #resetGestures(): void {
    this.#pointers.clear();
    this.#pinch = null;
    this.#didDrag = false;
  }

  #detach(preserveCombatClock: boolean): void {
    this.#cancelAnimationFrame();
    this.#cancelCombatCompletionTimer();
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#document.defaultView?.removeEventListener("resize", this.#onResize);
    if (this.#canvas !== null) {
      this.#canvas.removeEventListener("pointerdown", this.#onPointerDown);
      this.#canvas.removeEventListener("pointermove", this.#onPointerMove);
      this.#canvas.removeEventListener("pointerup", this.#onPointerUp);
      this.#canvas.removeEventListener("pointercancel", this.#onPointerCancel);
      this.#canvas.removeEventListener("pointerleave", this.#onPointerLeave);
      this.#canvas.removeEventListener("wheel", this.#onWheel);
      this.#canvas.removeEventListener("keydown", this.#onKeyDown);
    }
    this.#activator?.removeEventListener("click", this.#onSemanticActivate);
    this.#container?.replaceChildren();
    this.#resetGestures();
    this.#container = null;
    this.#canvas = null;
    this.#context = null;
    this.#activator = null;
    this.#description = null;
    this.#callbacks = null;
    if (!preserveCombatClock) this.#resetCombatPresentation();
  }

  #scheduleAnimationFrame(): void {
    if (this.#animationFrame !== null) return;
    const model = this.#model;
    const browser = this.#document.defaultView;
    if (model === null || browser === null || !boardAnimationNeededV6(model))
      return;
    this.#animationFrame = browser.requestAnimationFrame(() => {
      this.#animationFrame = null;
      const current = this.#model;
      if (current === null || !boardAnimationNeededV6(current)) return;
      if (this.#combatPresentationFinished(current)) {
        this.#completeCombatPresentation(current);
        return;
      }
      this.#draw();
      this.#scheduleAnimationFrame();
    });
  }

  #syncAnimationFrame(): void {
    const model = this.#model;
    if (model !== null && boardAnimationNeededV6(model)) {
      this.#scheduleAnimationFrame();
    } else {
      this.#cancelAnimationFrame();
    }
    this.#syncReducedMotionCompletion(model);
  }

  #cancelAnimationFrame(): void {
    if (this.#animationFrame === null) return;
    this.#document.defaultView?.cancelAnimationFrame(this.#animationFrame);
    this.#animationFrame = null;
  }

  #now(): number {
    return this.#document.defaultView?.performance.now() ?? 0;
  }

  #syncCombatPresentationClock(model: CanvasBoardHostModelV6): void {
    const presentation = model.combatPresentation ?? null;
    const key =
      presentation === null
        ? null
        : `${String(model.matchInstanceId)}:${presentation.key}`;
    if (key === this.#combatPresentationKey) return;
    this.#cancelCombatCompletionTimer();
    this.#combatPresentationKey = key;
    this.#completedCombatPresentationKey = null;
    this.#combatPresentationStartedAt = key === null ? 0 : this.#now();
  }

  #combatElapsedMs(): number {
    return this.#combatPresentationKey === null
      ? 0
      : Math.max(0, this.#now() - this.#combatPresentationStartedAt);
  }

  #combatPresentationFinished(model: CanvasBoardHostModelV6): boolean {
    const presentation = model.combatPresentation ?? null;
    return (
      presentation !== null &&
      this.#combatElapsedMs() >= presentation.durationMs
    );
  }

  #completeCombatPresentation(model: CanvasBoardHostModelV6): void {
    const presentation = model.combatPresentation ?? null;
    if (presentation === null) return;
    const key = `${String(model.matchInstanceId)}:${presentation.key}`;
    if (
      key !== this.#combatPresentationKey ||
      key === this.#completedCombatPresentationKey
    )
      return;
    this.#completedCombatPresentationKey = key;
    this.#cancelAnimationFrame();
    this.#cancelCombatCompletionTimer();
    this.#callbacks?.onCombatPresentationComplete?.(presentation.key);
  }

  #syncReducedMotionCompletion(model: CanvasBoardHostModelV6 | null): void {
    this.#cancelCombatCompletionTimer();
    const presentation = model?.combatPresentation ?? null;
    if (
      presentation === null ||
      presentation.motion !== "REDUCED" ||
      this.#combatPresentationKey === this.#completedCombatPresentationKey
    ) {
      return;
    }
    const remaining = Math.max(
      0,
      presentation.durationMs - this.#combatElapsedMs(),
    );
    const browser = this.#document.defaultView;
    if (browser === null) return;
    this.#combatCompletionTimer = browser.setTimeout(() => {
      this.#combatCompletionTimer = null;
      const current = this.#model;
      if (current !== null) this.#completeCombatPresentation(current);
    }, remaining);
  }

  #cancelCombatCompletionTimer(): void {
    if (this.#combatCompletionTimer === null) return;
    this.#document.defaultView?.clearTimeout(this.#combatCompletionTimer);
    this.#combatCompletionTimer = null;
  }

  #resetCombatPresentation(): void {
    this.#cancelCombatCompletionTimer();
    this.#combatPresentationKey = null;
    this.#completedCombatPresentationKey = null;
    this.#combatPresentationStartedAt = 0;
  }
}

export function boardAnimationNeededV6(model: CanvasBoardHostModelV6): boolean {
  const combat = model.combatPresentation ?? null;
  return (
    (combat !== null && combat.motion === "FULL") ||
    boardReadinessAnimationNeededV6(model)
  );
}

export function boardReadinessAnimationNeededV6(
  model: CanvasBoardHostModelV6,
): boolean {
  if (!model.interactive || model.motion === "REDUCED") return false;
  const activePlayerId = model.view.turnOrder[model.view.activeSeatIndex];
  if (activePlayerId !== model.view.viewer.id) return false;
  const viewer = model.view.players.find(
    (player) => player.id === model.view.viewer.id,
  );
  if (viewer?.controller !== "HUMAN") return false;
  const readyUnitIds = new Set(model.interaction.readyUnitIds);
  return model.view.units.some(
    (unit) =>
      unit.ownerId === model.view.viewer.id &&
      unit.hp > 0 &&
      readyUnitIds.has(unit.id) &&
      model.view.board.tiles.some(
        (tile) => tile.explored && sameCoord(tile.at, unit.at),
      ),
  );
}

/**
 * Returns the exact stable plan targets exposed at a coordinate. Target-entry
 * membership is the presentation gate; the host never re-derives legality.
 */
export function commandCandidatesAtV6(
  plan: BoardRenderPlanV6,
  at: CoordV6,
): readonly MapCommandTargetV6[] {
  const exposed = new Set(
    plan.entries
      .filter(
        (
          entry,
        ): entry is Extract<
          RenderPlanEntryV6,
          {
            readonly kind:
              | "MOVE_TARGET"
              | "ATTACK_TARGET"
              | "ROLL_TARGET"
              | "HEAL_TARGET"
              | "WALL_TARGET"
              | "ABILITY_TARGET"
              | "ECONOMIC_TARGET"
              | "TRAIN_TARGET"
              | "CHOICE_TARGET";
          }
        > => TARGET_ENTRY_KINDS.has(entry.kind) && sameCoord(entry.at, at),
      )
      .map((entry) => commandKeyV6(entry.details.command)),
  );
  const seen = new Set<string>();
  return Object.freeze(
    plan.commandTargets.filter((target) => {
      const key = commandKeyV6(target.command);
      if (!sameCoord(target.at, at) || !exposed.has(key) || seen.has(key))
        return false;
      seen.add(key);
      return true;
    }),
  );
}

export function resolveInspectionActivationV6(
  view: PlayerViewV6,
  at: CoordV6,
  previous: InspectionActivationCycleV6 | null,
): {
  readonly selection: BoardSelectionV6;
  readonly cycle: InspectionActivationCycleV6 | null;
} {
  const tile = view.board.tiles.find((candidate) =>
    sameCoord(candidate.at, at),
  );
  if (tile?.explored !== true)
    return { selection: { kind: "TILE", at }, cycle: null };
  const unit = view.units.find((candidate) => sameCoord(candidate.at, at));
  if (unit !== undefined) {
    const occupant = { kind: "UNIT", id: unit.id } as const;
    if (
      sameCycleOccupantV6(previous, at, occupant) &&
      previous.next === "UNDERLYING"
    ) {
      return {
        selection: underlyingSelectionV6(view, at),
        cycle: { at, occupant, next: "OCCUPANT" },
      };
    }
    return {
      selection: { kind: "UNIT", unitId: unit.id },
      cycle: { at, occupant, next: "UNDERLYING" },
    };
  }
  const wall = view.chocolateWalls.find((candidate) =>
    sameCoord(candidate.at, at),
  );
  if (wall !== undefined) {
    const occupant = { kind: "WALL", id: wall.id } as const;
    if (
      sameCycleOccupantV6(previous, at, occupant) &&
      previous.next === "UNDERLYING"
    ) {
      return {
        selection: underlyingSelectionV6(view, at),
        cycle: { at, occupant, next: "OCCUPANT" },
      };
    }
    return {
      selection: { kind: "WALL", wallId: wall.id },
      cycle: { at, occupant, next: "UNDERLYING" },
    };
  }
  return { selection: underlyingSelectionV6(view, at), cycle: null };
}

function underlyingSelectionV6(
  view: PlayerViewV6,
  at: CoordV6,
): BoardSelectionV6 {
  const city = view.cities.find((candidate) => sameCoord(candidate.at, at));
  return city === undefined
    ? { kind: "TILE", at }
    : { kind: "CITY", cityId: city.id };
}

function sameCycleOccupantV6(
  cycle: InspectionActivationCycleV6 | null,
  at: CoordV6,
  occupant: InspectionActivationCycleV6["occupant"],
): cycle is InspectionActivationCycleV6 {
  return (
    cycle !== null &&
    sameCoord(cycle.at, at) &&
    cycle.occupant.kind === occupant.kind &&
    cycle.occupant.id === occupant.id
  );
}

function initialFocusV6(view: PlayerViewV6): CoordV6 {
  return (
    view.cities.find(
      (city) => city.ownerId === view.viewer.id && city.isCapital,
    )?.at ??
    view.board.tiles.find((tile) => tile.explored)?.at ?? { x: 0, y: 0 }
  );
}

function sameSelectionV6(
  left: BoardSelectionV6,
  right: BoardSelectionV6 | null,
): boolean {
  if (right === null || left.kind !== right.kind) return false;
  if (left.kind === "TILE" && right.kind === "TILE")
    return sameCoord(left.at, right.at);
  if (left.kind === "UNIT" && right.kind === "UNIT")
    return left.unitId === right.unitId;
  if (left.kind === "CITY" && right.kind === "CITY")
    return left.cityId === right.cityId;
  return (
    left.kind === "WALL" &&
    right.kind === "WALL" &&
    left.wallId === right.wallId
  );
}

function commandKeyV6(command: CommandV6): string {
  return JSON.stringify(command);
}

function describeCommandV6(command: CommandV6): string {
  return command.kind.toLowerCase().replaceAll("_", " ");
}

function factionV6(view: PlayerViewV6, ownerId: number): string {
  return (
    view.players.find((player) => player.id === ownerId)?.faction ?? "unknown"
  ).toLowerCase();
}

function onBoardV6(view: PlayerViewV6, at: CoordV6): boolean {
  return (
    at.x >= 0 &&
    at.y >= 0 &&
    at.x < view.board.width &&
    at.y < view.board.height
  );
}

function keyboardDeltaV6(key: string, shifted: boolean): CoordV6 | null {
  if (shifted) {
    if (key === "ArrowUp") return { x: -1, y: -1 };
    if (key === "ArrowDown") return { x: 1, y: 1 };
    if (key === "ArrowLeft") return { x: -1, y: 1 };
    if (key === "ArrowRight") return { x: 1, y: -1 };
  } else {
    if (key === "ArrowUp") return { x: 0, y: -1 };
    if (key === "ArrowDown") return { x: 0, y: 1 };
    if (key === "ArrowLeft") return { x: -1, y: 0 };
    if (key === "ArrowRight") return { x: 1, y: 0 };
  }
  return null;
}

function distanceV6(left: Point, right: Point): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function midpointV6(left: Point, right: Point): Point {
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
}

function consumeKey(event: KeyboardEvent): void {
  event.preventDefault();
  event.stopPropagation();
}
