import {
  effectiveUnitLabel,
  queryPlayerCombatPreview,
  queryPlayerCommands,
  type Command,
  type Coord,
  type PlayerView,
} from "../../engine/index";
import type { CandyPresentation, CombatPresentation } from "../../app/types";
import { type BoardAssetBindings } from "./asset-bindings";
import { drawBoard } from "./board-renderer";
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
import { buildRenderPlan, selectionCoord } from "./render-plan";
import { createPixelLabAssetBindings } from "./pixellab-asset-bindings";
import { combatAnimationFrame } from "./combat-presentation";
import { accessibleCombatPreview } from "./combat-preview-label";
import { unitNeedsReadinessPulse } from "./readiness-presentation";
import {
  selectionJumpDurationMs,
  type SelectionJumpSpeed,
} from "./selection-jump-presentation";

export type BoardSelection =
  | { readonly kind: "TILE"; readonly at: Coord }
  | { readonly kind: "UNIT"; readonly unitId: number }
  | { readonly kind: "CITY"; readonly cityId: number }
  | { readonly kind: "WALL"; readonly wallId: number };

export type BoardTargetMode =
  | { readonly kind: "ROLL"; readonly unitId: number }
  | { readonly kind: "BUILD_WALL"; readonly unitId: number };

export interface BoardHostCallbacks {
  readonly onSelection: (selection: BoardSelection | null) => void;
  readonly onInspect: (selection: BoardSelection) => void;
  readonly onCommand: (command: Command) => void;
  readonly onZoom: (direction: "IN" | "OUT") => void;
  readonly onCancelTarget?: () => void;
}

export interface BoardHostModel {
  readonly matchInstanceId: number;
  readonly view: PlayerView;
  readonly interactive: boolean;
  readonly motion?: "FULL" | "REDUCED";
  readonly animationSpeed?: SelectionJumpSpeed;
  readonly selected: BoardSelection | null;
  readonly combatPresentation?: CombatPresentation | null;
  readonly candyPresentation?: CandyPresentation | null;
  readonly targetMode?: BoardTargetMode | null;
}

export interface BoardHost {
  mount(container: HTMLElement, callbacks: BoardHostCallbacks): void;
  update(model: BoardHostModel): void;
  activate(at: Coord): void;
  select(selection: BoardSelection): void;
  resetActivationCycle(): void;
  zoom(direction: "IN" | "OUT"): void;
  focus(): void;
  screenPoint(at: Coord): Point | null;
  destroy(): void;
}

interface ActivePointer {
  readonly start: Point;
  readonly previous: Point;
  readonly current: Point;
}

interface PinchGesture {
  readonly distance: number;
  readonly midpoint: Point;
  readonly camera: CameraState;
}

export interface InspectionActivationCycle {
  readonly at: Coord;
  readonly unitId: number;
  readonly next: "UNDERLYING" | "UNIT";
}

const DRAG_THRESHOLD = 6;

/**
 * Responsive PlayerView-only Canvas board. Camera and logical selection live
 * on the host instance, so DOM screen redraws may remount the Canvas without
 * altering presentation state or the authoritative simulation.
 */
export class CanvasBoardHost implements BoardHost {
  readonly #document: Document;
  readonly #assets: BoardAssetBindings;
  #container: HTMLElement | null = null;
  #canvas: HTMLCanvasElement | null = null;
  #context: CanvasRenderingContext2D | null = null;
  #description: HTMLElement | null = null;
  #callbacks: BoardHostCallbacks | null = null;
  #model: BoardHostModel | null = null;
  #selection: BoardSelection | null = null;
  #focused: Coord | null = null;
  #hovered: Coord | null = null;
  #inspectionCycle: InspectionActivationCycle | null = null;
  #observedCommandIndex: number | null = null;
  #camera: CameraState = { offsetX: 0, offsetY: 0, zoom: 1 };
  #viewport: Size = { width: 1024, height: 592 };
  #devicePixelRatio = 1;
  #boardKey: string | null = null;
  #resizeObserver: ResizeObserver | null = null;
  readonly #pointers = new Map<number, ActivePointer>();
  #pinch: PinchGesture | null = null;
  #didDrag = false;
  #combatPhaseKey: string | null = null;
  #combatPhaseStartedAt = 0;
  #readinessPhaseKey: string | null = null;
  #readinessPhaseStartedAt = 0;
  #selectionJumpUnitId: number | null = null;
  #selectionJumpStartedAt = 0;
  #animationFrame: number | null = null;

  constructor(documentRoot: Document, assets?: BoardAssetBindings) {
    this.#document = documentRoot;
    this.#assets =
      assets ?? createPixelLabAssetBindings(documentRoot, () => this.#draw());
  }

  mount(container: HTMLElement, callbacks: BoardHostCallbacks): void {
    this.#unmount();
    this.#cancelSelectionJump();
    this.#container = container;
    this.#callbacks = callbacks;
    const canvas = this.#document.createElement("canvas");
    canvas.className = "board-canvas";
    canvas.tabIndex = 0;
    canvas.dataset.focusId = "board";
    canvas.setAttribute("role", "application");
    canvas.setAttribute(
      "aria-label",
      "Square-grid battlefield. Arrow keys move the map cursor by row or column, Shift plus an arrow moves diagonally, Enter or Space activates once, drag pans, and plus or minus zooms.",
    );
    canvas.textContent =
      "The battlefield requires Canvas. Game information and actions are also available through semantic inspection controls.";
    const description = this.#document.createElement("p");
    description.className = "sr-only";
    description.id = "map-cursor-description";
    description.setAttribute("aria-live", "polite");
    canvas.setAttribute("aria-describedby", description.id);
    this.#canvas = canvas;
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
    this.#document.defaultView?.addEventListener("resize", this.#onResize);
    container.replaceChildren(canvas, description);
    if (typeof ResizeObserver !== "undefined") {
      this.#resizeObserver = new ResizeObserver(() => this.#resize());
      this.#resizeObserver.observe(container);
    }
    this.#resize();
  }

  update(model: BoardHostModel): void {
    const previousModel = this.#model;
    const previousSelection = this.#selection;
    const activePlayerId = model.view.turnOrder[model.view.activeSeatIndex];
    const readinessPhaseKey = `${model.matchInstanceId}:${model.view.round}:${activePlayerId ?? "none"}`;
    if (readinessPhaseKey !== this.#readinessPhaseKey) {
      this.#readinessPhaseKey = readinessPhaseKey;
      this.#readinessPhaseStartedAt = this.#now();
    }
    const commandResolved =
      this.#observedCommandIndex !== null &&
      this.#observedCommandIndex !== model.view.commandIndex;
    this.#observedCommandIndex = model.view.commandIndex;
    if (commandResolved) this.#inspectionCycle = null;
    this.#model = model;
    const presentation = model.combatPresentation ?? null;
    const candyPresentation = model.candyPresentation ?? null;
    const phaseKey =
      presentation === null && candyPresentation === null
        ? null
        : presentation !== null
          ? `${model.matchInstanceId}:${presentation.queueToken}:${presentation.commandIndex}:${presentation.phase}:${presentation.phaseElapsedMs}:${presentation.paused}`
          : `${model.matchInstanceId}:${candyPresentation?.queueToken}:${candyPresentation?.commandIndex}:${candyPresentation?.kind}:${candyPresentation?.elapsedMs}:${candyPresentation?.paused}`;
    if (phaseKey !== this.#combatPhaseKey) {
      this.#combatPhaseKey = phaseKey;
      this.#combatPhaseStartedAt = this.#now();
    }
    const key = `${model.matchInstanceId}:${model.view.board.width}x${model.view.board.height}`;
    if (this.#boardKey !== key) {
      this.#cancelSelectionJump();
      this.#boardKey = key;
      this.#camera = fitCamera(model.view.board, this.#viewport);
      this.#focused = initialFocus(model.view);
      this.#selection = model.selected;
      this.#hovered = null;
      const worldBounds = boardWorldBounds(
        model.view.board.width,
        model.view.board.height,
      );
      const boardDoesNotFit =
        (worldBounds.right - worldBounds.left) * this.#camera.zoom >
          this.#viewport.width * 1.02 ||
        (worldBounds.bottom - worldBounds.top) * this.#camera.zoom >
          this.#viewport.height * 1.02;
      if (this.#camera.zoom === MIN_ZOOM && boardDoesNotFit) {
        this.#camera = centerCameraOn(
          this.#camera,
          projectGrid(this.#focused),
          this.#viewport,
        );
      }
      this.#inspectionCycle = null;
    }
    this.#selection = model.selected;
    if (
      previousModel !== null &&
      previousModel.matchInstanceId === model.matchInstanceId &&
      model.selected?.kind === "UNIT" &&
      !sameSelection(model.selected, previousSelection)
    ) {
      this.#startSelectionJump(model.selected.unitId);
    } else if (
      model.selected?.kind !== "UNIT" ||
      model.selected.unitId !== this.#selectionJumpUnitId ||
      model.motion === "REDUCED" ||
      model.combatPresentation != null ||
      model.candyPresentation != null
    ) {
      this.#cancelSelectionJump();
    }
    const inspectionCycle = this.#inspectionCycle;
    if (
      inspectionCycle !== null &&
      !(inspectionCycle.unitId < 0
        ? model.view.chocolateWalls.some(
            (wall) =>
              wall.id === -inspectionCycle.unitId &&
              sameCoord(wall.at, inspectionCycle.at),
          )
        : model.view.units.some(
            (unit) =>
              unit.id === inspectionCycle.unitId &&
              sameCoord(unit.at, inspectionCycle.at),
          ))
    )
      this.#inspectionCycle = null;
    if (
      this.#selection !== null &&
      selectionCoord(model.view, this.#selection) === null
    ) {
      this.#selection = null;
      this.#cancelSelectionJump();
    }
    this.#canvas?.setAttribute("aria-disabled", String(!model.interactive));
    if (this.#canvas !== null)
      this.#canvas.dataset.interactive = String(model.interactive);
    if (this.#canvas !== null) {
      if (presentation === null) {
        delete this.#canvas.dataset.combatPhase;
        delete this.#canvas.dataset.combatMotion;
      } else {
        this.#canvas.dataset.combatPhase = presentation.phase.toLowerCase();
        this.#canvas.dataset.combatMotion = presentation.motion.toLowerCase();
      }
    }
    this.#draw();
    this.#syncAnimationFrame();
  }

  activate(at: Coord): void {
    this.#activateScreenTile(at);
  }

  select(selection: BoardSelection): void {
    const selectionChanged = !sameSelection(selection, this.#selection);
    this.#callbacks?.onSelection(selection);
    this.#selection = selection;
    if (selectionChanged && selection.kind === "UNIT")
      this.#startSelectionJump(selection.unitId);
    else if (selection.kind !== "UNIT") this.#cancelSelectionJump();
    this.#describe();
    this.#draw();
    this.#syncAnimationFrame();
  }

  resetActivationCycle(): void {
    this.#inspectionCycle = null;
  }

  zoom(direction: "IN" | "OUT"): void {
    const center = {
      x: this.#viewport.width / 2,
      y: this.#viewport.height / 2,
    };
    const factor = direction === "IN" ? 1.2 : 1 / 1.2;
    this.#camera = zoomCameraAt(
      this.#camera,
      this.#camera.zoom * factor,
      center,
    );
    this.#callbacks?.onZoom(direction);
    this.#draw();
  }

  focus(): void {
    this.#canvas?.focus({ preventScroll: true });
  }

  screenPoint(at: Coord): Point | null {
    return this.#model === null
      ? null
      : worldToScreen(projectGrid(at), this.#camera);
  }

  destroy(): void {
    this.#unmount();
    this.#model = null;
    this.#hovered = null;
    this.#cancelSelectionJump();
  }

  readonly #onResize = (): void => this.#resize();

  readonly #onPointerDown = (event: PointerEvent): void => {
    const point = this.#eventPoint(event);
    this.#pointers.set(event.pointerId, {
      start: point,
      previous: point,
      current: point,
    });
    this.#canvas?.setPointerCapture?.(event.pointerId);
    if (this.#pointers.size === 1) this.#didDrag = false;
    if (this.#pointers.size === 2) {
      const pair = [...this.#pointers.values()];
      const first = pair[0];
      const second = pair[1];
      if (first !== undefined && second !== undefined) {
        this.#pinch = {
          distance: Math.max(1, distance(first.current, second.current)),
          midpoint: midpoint(first.current, second.current),
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
      this.#hovered = this.#pick(point);
      this.#draw();
      return;
    }
    this.#pointers.set(event.pointerId, {
      start: active.start,
      previous: active.current,
      current: point,
    });
    if (this.#pointers.size >= 2 && this.#pinch !== null) {
      const pair = [...this.#pointers.values()];
      const first = pair[0];
      const second = pair[1];
      if (first !== undefined && second !== undefined) {
        const currentMidpoint = midpoint(first.current, second.current);
        const zoomed = zoomCameraAt(
          this.#pinch.camera,
          this.#pinch.camera.zoom *
            (distance(first.current, second.current) / this.#pinch.distance),
          this.#pinch.midpoint,
        );
        this.#camera = panCamera(zoomed, {
          x: currentMidpoint.x - this.#pinch.midpoint.x,
          y: currentMidpoint.y - this.#pinch.midpoint.y,
        });
        this.#callbacks?.onZoom(
          this.#camera.zoom >= this.#pinch.camera.zoom ? "IN" : "OUT",
        );
      }
    } else {
      if (distance(active.start, point) > DRAG_THRESHOLD) this.#didDrag = true;
      if (this.#didDrag) {
        this.#camera = panCamera(this.#camera, {
          x: point.x - active.current.x,
          y: point.y - active.current.y,
        });
      }
    }
    this.#hovered = this.#pick(point);
    this.#draw();
    event.preventDefault();
  };

  readonly #onPointerUp = (event: PointerEvent): void => {
    const point = this.#eventPoint(event);
    const wasPinching = this.#pinch !== null;
    this.#pointers.delete(event.pointerId);
    this.#canvas?.releasePointerCapture?.(event.pointerId);
    if (this.#pointers.size < 2) this.#pinch = null;
    if (!this.#didDrag && !wasPinching) this.#activate(point);
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
      this.#hovered = null;
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
    const key = event.key.toLowerCase();
    if (event.key === "+" || event.key === "=") {
      this.zoom("IN");
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key === "-") {
      this.zoom("OUT");
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (
      key === "escape" &&
      (model.targetMode != null ||
        this.#selection !== null ||
        this.#inspectionCycle !== null)
    ) {
      if (model.targetMode != null) {
        this.#callbacks?.onCancelTarget?.();
        this.#descriptionText("Special targeting cancelled.");
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      this.#selection = null;
      this.#cancelSelectionJump();
      this.#inspectionCycle = null;
      this.#callbacks?.onSelection(null);
      this.#descriptionText("Map selection cleared.");
      this.#draw();
      this.#syncAnimationFrame();
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      if (this.#focused !== null) this.#activateScreenTile(this.#focused);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const delta = keyboardDelta(event.key, event.shiftKey);
    if (delta === null) return;
    const current = this.#focused ?? initialFocus(model.view);
    this.#focused = {
      x: Math.max(0, Math.min(model.view.board.width - 1, current.x + delta.x)),
      y: Math.max(
        0,
        Math.min(model.view.board.height - 1, current.y + delta.y),
      ),
    };
    this.#describe();
    this.#draw();
    event.preventDefault();
    event.stopPropagation();
  };

  #activate(point: Point): void {
    const at = this.#pick(point);
    if (at !== null) this.#activateScreenTile(at);
  }

  #activateScreenTile(at: Coord): void {
    const model = this.#model;
    if (model === null) return;
    this.#focused = at;
    if (
      this.#inspectionCycle !== null &&
      !sameCoord(this.#inspectionCycle.at, at)
    )
      this.#inspectionCycle = null;
    if (model.interactive && this.#selection?.kind === "UNIT") {
      const spatial = spatialCommandAt(
        model.view,
        this.#selection.unitId,
        at,
        model.targetMode ?? null,
      );
      if (spatial !== null) {
        this.#callbacks?.onCommand(spatial);
        return;
      }
    }
    const activation = resolveInspectionActivation(
      model.view,
      at,
      this.#inspectionCycle,
    );
    const selection = activation.selection;
    const selectionChanged = !sameSelection(selection, this.#selection);
    this.#inspectionCycle = activation.cycle;
    if (
      activation.cycle === null &&
      sameSelection(selection, this.#selection)
    ) {
      this.#callbacks?.onInspect(selection);
      return;
    }
    this.#callbacks?.onSelection(selection);
    this.#selection = selection;
    if (selectionChanged && selection.kind === "UNIT")
      this.#startSelectionJump(selection.unitId);
    else if (selection.kind !== "UNIT") this.#cancelSelectionJump();
    this.#describe();
    this.#draw();
    this.#syncAnimationFrame();
  }

  #pick(point: Point): Coord | null {
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
    const context = this.#context;
    if (model === null) return;
    const currentRatio = Math.max(
      1,
      this.#document.defaultView?.devicePixelRatio ?? 1,
    );
    if (currentRatio !== this.#devicePixelRatio && this.#canvas !== null) {
      this.#resize();
      return;
    }
    const plan = buildRenderPlan(
      model.view,
      this.#selection,
      this.#hovered ?? this.#focused,
      model.targetMode ?? null,
    );
    if (context !== null) {
      drawBoard({
        context,
        viewport: this.#viewport,
        camera: this.#camera,
        view: model.view,
        plan,
        assets: this.#assets,
        focused: this.#focused,
        devicePixelRatio: this.#devicePixelRatio,
        combatPresentation: model.combatPresentation ?? null,
        combatFrame:
          model.combatPresentation === undefined ||
          model.combatPresentation === null
            ? null
            : combatAnimationFrame(
                model.combatPresentation,
                model.combatPresentation.phaseElapsedMs +
                  (model.combatPresentation.paused
                    ? 0
                    : this.#now() - this.#combatPhaseStartedAt),
              ),
        candyPresentation: model.candyPresentation ?? null,
        candyElapsedMs:
          model.candyPresentation === undefined ||
          model.candyPresentation === null
            ? 0
            : model.candyPresentation.elapsedMs +
              (model.candyPresentation.paused
                ? 0
                : this.#now() - this.#combatPhaseStartedAt),
        readinessElapsedMs: this.#now() - this.#readinessPhaseStartedAt,
        reducedMotion: model.motion === "REDUCED",
        selectionJump: this.#selectionJumpFrame(),
      });
    }
    this.#describe(plan.legalCommands);
  }

  #describe(commands?: readonly Command[]): void {
    const model = this.#model;
    const focused = this.#focused;
    if (model === null || focused === null) return;
    const tile = model.view.board.tiles.find((candidate) =>
      sameCoord(candidate.at, focused),
    );
    const unit = model.view.units.find((candidate) =>
      sameCoord(candidate.at, focused),
    );
    const city = model.view.cities.find((candidate) =>
      sameCoord(candidate.at, focused),
    );
    const wall = model.view.chocolateWalls.find((candidate) =>
      sameCoord(candidate.at, focused),
    );
    const offered = (
      commands ?? queryPlayerCommands(model.view).map(({ command }) => command)
    )
      .filter((command) =>
        commandTouches(command, unit?.id ?? null, city?.id ?? null, focused),
      )
      .map((command) => describeCommand(model.view, command));
    const tileDescription =
      tile?.explored === true
        ? `${tile.terrain.toLowerCase()}${tile.resource === "ORE" ? ", ore" : tile.resource === "ANIMAL" ? ", animal" : ""}${tile.improvement === "MINE" ? ", mine" : tile.improvement === "LUMBER_MILL" ? ", lumber mill" : ""}`
        : "unexplored cloud";
    const occupants = [
      city === undefined
        ? null
        : `City ${city.id}, level ${city.level}, Player ${city.ownerId}`,
      unit === undefined
        ? null
        : `${effectiveUnitLabel(ownerFaction(model.view, unit.ownerId), unit.type)} unit ${unit.id}, Player ${unit.ownerId}, ${unit.hp} of ${unit.maxHp} HP, ${unit.activation.handled ? "handled" : "needs action"}`,
      wall === undefined
        ? null
        : `Chocolate Wall ${wall.id}, Player ${wall.ownerId}, ${wall.hp} of ${wall.maxHp} HP`,
    ].filter((value): value is string => value !== null);
    this.#descriptionText(
      `Map cursor column ${focused.x + 1}, row ${focused.y + 1}: ${tileDescription}. ${occupants.join(". ")}${occupants.length > 0 ? ". " : ""}${offered.length > 0 ? `Available: ${offered.join(", ")}.` : "No available action on this tile."}`,
    );
  }

  #descriptionText(text: string): void {
    if (this.#description !== null) this.#description.textContent = text;
  }

  #unmount(): void {
    if (this.#animationFrame !== null) {
      this.#document.defaultView?.cancelAnimationFrame(this.#animationFrame);
      this.#animationFrame = null;
    }
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
    this.#container?.replaceChildren();
    this.#pointers.clear();
    this.#pinch = null;
    this.#container = null;
    this.#canvas = null;
    this.#context = null;
    this.#description = null;
    this.#callbacks = null;
  }

  #scheduleAnimationFrame(): void {
    if (this.#animationFrame !== null || this.#context === null) return;
    const model = this.#model;
    if (model === null || !this.#animationNeeded(model)) return;
    const browser = this.#document.defaultView;
    if (browser === null) return;
    this.#animationFrame = browser.requestAnimationFrame(() => {
      this.#animationFrame = null;
      if (this.#model === null) return;
      this.#draw();
      if (this.#animationNeeded(this.#model)) this.#scheduleAnimationFrame();
    });
  }

  #syncAnimationFrame(): void {
    if (this.#model !== null && this.#animationNeeded(this.#model)) {
      this.#scheduleAnimationFrame();
      return;
    }
    if (this.#animationFrame !== null) {
      this.#document.defaultView?.cancelAnimationFrame(this.#animationFrame);
      this.#animationFrame = null;
    }
  }

  #now(): number {
    return this.#document.defaultView?.performance.now() ?? 0;
  }

  #startSelectionJump(unitId: number): void {
    const model = this.#model;
    if (
      model === null ||
      model.motion === "REDUCED" ||
      model.combatPresentation != null ||
      model.candyPresentation != null
    ) {
      this.#cancelSelectionJump();
      return;
    }
    this.#selectionJumpUnitId = unitId;
    this.#selectionJumpStartedAt = this.#now();
  }

  #cancelSelectionJump(): void {
    this.#selectionJumpUnitId = null;
    this.#selectionJumpStartedAt = 0;
  }

  #selectionJumpFrame(): {
    readonly unitId: number;
    readonly elapsedMs: number;
    readonly speed: SelectionJumpSpeed;
  } | null {
    const model = this.#model;
    const unitId = this.#selectionJumpUnitId;
    if (model === null || unitId === null) return null;
    const speed = model.animationSpeed ?? "NORMAL";
    const elapsedMs = Math.max(0, this.#now() - this.#selectionJumpStartedAt);
    if (elapsedMs >= selectionJumpDurationMs(speed)) {
      this.#cancelSelectionJump();
      return null;
    }
    return { unitId, elapsedMs, speed };
  }

  #animationNeeded(model: BoardHostModel): boolean {
    return boardAnimationNeeded(model, this.#selectionJumpFrame() !== null);
  }
}

export function boardAnimationNeeded(
  model: BoardHostModel,
  selectionJumpActive = false,
): boolean {
  if (
    model.combatPresentation !== undefined &&
    model.combatPresentation !== null &&
    !model.combatPresentation.paused
  )
    return true;
  if (
    model.candyPresentation !== undefined &&
    model.candyPresentation !== null &&
    !model.candyPresentation.paused
  )
    return true;
  if (selectionJumpActive && model.motion !== "REDUCED") return true;
  if (!model.interactive || model.motion === "REDUCED") return false;
  return model.view.units.some((unit) =>
    unitNeedsReadinessPulse(model.view, unit),
  );
}

/** Compatibility alias for injected tests and callers from the previous bead. */
export { CanvasBoardHost as PlaceholderBoardHost };

function initialFocus(view: PlayerView): Coord {
  return (
    view.cities.find(
      (city) => city.ownerId === view.viewer.id && city.isCapital,
    )?.at ??
    view.board.tiles.find((tile) => tile.explored)?.at ?? { x: 0, y: 0 }
  );
}

function selectionAt(view: PlayerView, at: Coord): BoardSelection {
  const unit = view.units.find((candidate) => sameCoord(candidate.at, at));
  if (unit !== undefined) return { kind: "UNIT", unitId: unit.id };
  const wall = view.chocolateWalls.find((candidate) =>
    sameCoord(candidate.at, at),
  );
  if (wall !== undefined) return { kind: "WALL", wallId: wall.id };
  const city = view.cities.find((candidate) => sameCoord(candidate.at, at));
  if (city !== undefined) return { kind: "CITY", cityId: city.id };
  return { kind: "TILE", at };
}

export function resolveInspectionActivation(
  view: PlayerView,
  at: Coord,
  previous: InspectionActivationCycle | null,
): {
  readonly selection: BoardSelection;
  readonly cycle: InspectionActivationCycle | null;
} {
  const unit = view.units.find((candidate) => sameCoord(candidate.at, at));
  const wall = view.chocolateWalls.find((candidate) =>
    sameCoord(candidate.at, at),
  );
  if (unit === undefined && wall === undefined)
    return { selection: selectionAt(view, at), cycle: null };
  if (unit === undefined && wall !== undefined) {
    const continuing =
      previous !== null &&
      previous.unitId === -wall.id &&
      sameCoord(previous.at, at);
    if (continuing && previous.next === "UNDERLYING") {
      const city = view.cities.find((candidate) => sameCoord(candidate.at, at));
      return {
        selection:
          city === undefined
            ? { kind: "TILE", at }
            : { kind: "CITY", cityId: city.id },
        cycle: { at, unitId: -wall.id, next: "UNIT" },
      };
    }
    return {
      selection: { kind: "WALL", wallId: wall.id },
      cycle: { at, unitId: -wall.id, next: "UNDERLYING" },
    };
  }
  if (unit === undefined)
    return { selection: selectionAt(view, at), cycle: null };
  const continuing =
    previous !== null &&
    previous.unitId === unit.id &&
    sameCoord(previous.at, at);
  if (continuing && previous.next === "UNDERLYING") {
    const city = view.cities.find((candidate) => sameCoord(candidate.at, at));
    return {
      selection:
        city === undefined
          ? { kind: "TILE", at }
          : { kind: "CITY", cityId: city.id },
      cycle: { at, unitId: unit.id, next: "UNIT" },
    };
  }
  return {
    selection: { kind: "UNIT", unitId: unit.id },
    cycle: { at, unitId: unit.id, next: "UNDERLYING" },
  };
}

export function spatialCommandAt(
  view: PlayerView,
  unitId: number,
  at: Coord,
  targetMode: BoardTargetMode | null = null,
): Command | null {
  const commands = queryPlayerCommands(view).map(({ command }) => command);
  if (targetMode?.unitId === unitId && targetMode.kind === "BUILD_WALL") {
    return (
      commands.find(
        (command) =>
          command.kind === "BUILD_CHOCOLATE_WALL" &&
          command.unitId === unitId &&
          sameCoord(command.at, at),
      ) ?? null
    );
  }
  if (targetMode?.unitId === unitId && targetMode.kind === "ROLL") {
    const actor = view.units.find((unit) => unit.id === unitId);
    if (actor === undefined) return null;
    const dx = at.x - actor.at.x;
    const dy = at.y - actor.at.y;
    const direction =
      dx === 0 && dy === -1
        ? "NORTH"
        : dx === 1 && dy === 0
          ? "EAST"
          : dx === 0 && dy === 1
            ? "SOUTH"
            : dx === -1 && dy === 0
              ? "WEST"
              : null;
    return direction === null
      ? null
      : (commands.find(
          (command) =>
            command.kind === "KAMIKAZE_ROLL" &&
            command.unitId === unitId &&
            command.direction === direction,
        ) ?? null);
  }
  if (targetMode !== null) return null;
  const attack = commands.find((command) => {
    if (command.kind !== "ATTACK" || command.unitId !== unitId) return false;
    const targetRef = command.target;
    const target =
      targetRef.kind === "UNIT"
        ? view.units.find((unit) => unit.id === targetRef.unitId)
        : view.chocolateWalls.find((wall) => wall.id === targetRef.wallId);
    return target !== undefined && sameCoord(target.at, at);
  });
  if (attack !== undefined) return attack;
  const paths = commands.filter(
    (
      command,
    ): command is Extract<Command, { readonly kind: "MOVE" | "ESCAPE_MOVE" }> =>
      (command.kind === "MOVE" || command.kind === "ESCAPE_MOVE") &&
      command.unitId === unitId &&
      sameCoord(command.path.at(-1) ?? { x: -1, y: -1 }, at),
  );
  return paths[0] ?? null;
}

function commandTouches(
  command: Command,
  unitId: number | null,
  cityId: number | null,
  at: Coord,
): boolean {
  if (
    (command.kind === "MOVE" || command.kind === "ESCAPE_MOVE") &&
    sameCoord(command.path.at(-1) ?? { x: -1, y: -1 }, at)
  )
    return true;
  if ("unitId" in command && command.unitId === unitId) return true;
  if (
    command.kind === "ATTACK" &&
    command.target.kind === "UNIT" &&
    command.target.unitId === unitId
  )
    return true;
  if (command.kind === "TRAIN" && command.cityId === cityId) return true;
  if (command.kind === "CHOOSE_CITY_REWARD" && command.cityId === cityId)
    return true;
  return (
    (command.kind === "BUILD_MINE" || command.kind === "HARVEST_FRUIT") &&
    sameCoord(command.at, at)
  );
}

function keyboardDelta(key: string, shifted: boolean): Coord | null {
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

function sameSelection(
  left: BoardSelection,
  right: BoardSelection | null,
): boolean {
  if (right === null || left.kind !== right.kind) return false;
  if (left.kind === "TILE" && right.kind === "TILE")
    return sameCoord(left.at, right.at);
  if (left.kind === "UNIT" && right.kind === "UNIT")
    return left.unitId === right.unitId;
  if (left.kind === "WALL" && right.kind === "WALL")
    return left.wallId === right.wallId;
  return (
    left.kind === "CITY" &&
    right.kind === "CITY" &&
    left.cityId === right.cityId
  );
}

function ownerFaction(view: PlayerView, ownerId: number) {
  return (
    view.players.find((player) => player.id === ownerId)?.faction ?? "ORIGINAL"
  );
}

function distance(left: Point, right: Point): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function midpoint(left: Point, right: Point): Point {
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
}

function describeCommand(view: PlayerView, command: Command): string {
  if (command.kind === "MOVE" || command.kind === "ESCAPE_MOVE") {
    const destination = command.path.at(-1);
    return `${command.kind === "MOVE" ? "move" : "escape move"}${destination === undefined ? "" : ` to ${destination.x}, ${destination.y} by ${command.path.map((at) => `${at.x},${at.y}`).join(" then ")}`}`;
  }
  if (command.kind === "ATTACK") {
    const preview = queryPlayerCombatPreview(
      view,
      command.unitId,
      command.target,
    );
    return preview === null
      ? "attack"
      : `attack; ${accessibleCombatPreview(preview)}`;
  }
  return command.kind.replace("_", " ").toLowerCase();
}
