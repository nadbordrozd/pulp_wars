import { TECHNOLOGY_TREE_SHAPES_V7 } from "./technology-tree-layout-v7";

export interface TechnologyTreeViewportSizeV7 {
  readonly width: number;
  readonly height: number;
  /** Stage scale from which every name and price shows. */
  readonly labelScale?: number;
  /** Screen pixels Fit leaves at each side, and above and below. */
  readonly fitGutterX?: number;
  readonly fitGutterY?: number;
}

/** Where a graph point is on screen, relative to the viewport's corner. */
export interface TechnologyTreeScreenPointV7 {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface PointV7 {
  readonly x: number;
  readonly y: number;
}

interface ActivePointerV7 extends PointV7 {
  readonly startX: number;
  readonly startY: number;
}

const MIN_ZOOM_V7 = 1;
const MAX_ZOOM_V7 = 2.8;
/**
 * Zooming in always reaches this stage scale, so a small phone can still
 * zoom far enough for the names (TECHNOLOGY_LABEL_SCALE_V7) to show.
 */
const MAX_SCALE_FLOOR_V7 = 1.75;
/**
 * The largest scale Fit uses (bead pulp_wars-2yc.66): a 1920 x 1080
 * desktop fills its height, a bigger screen stops before the badges grow
 * into posters.
 */
export const TECHNOLOGY_TREE_MAX_FIT_SCALE_V7 = 1.6;
const PAN_SLOP_V7 = 7;

/** The stage scale at which Fit shows the whole graph in a viewport. */
export function technologyTreeFitScaleV7(
  viewport: TechnologyTreeViewportSizeV7,
  graph: TechnologyTreeViewportSizeV7,
): number {
  const compact = TECHNOLOGY_TREE_SHAPES_V7.compact;
  const gutterX = graph.fitGutterX ?? compact.fitGutterX;
  const gutterY = graph.fitGutterY ?? compact.fitGutterY;
  const availableWidth = Math.max(1, viewport.width - gutterX * 2);
  const availableHeight = Math.max(1, viewport.height - gutterY * 2);
  return Math.min(
    availableWidth / graph.width,
    availableHeight / graph.height,
    TECHNOLOGY_TREE_MAX_FIT_SCALE_V7,
  );
}

/** The largest stage scale zooming in reaches from a given Fit scale. */
export function technologyTreeMaxScaleV7(fitScale: number): number {
  return Math.max(fitScale * MAX_ZOOM_V7, MAX_SCALE_FLOOR_V7);
}

/**
 * Persistent camera for the compact technology graph. Zoom is stored as a
 * multiple of the current fit scale and the centre is stored in graph
 * coordinates, so replacing art or resizing the viewport does not reset the
 * player's view.
 */
export class TechnologyTreeViewportV7 {
  #graph: TechnologyTreeViewportSizeV7 = { width: 1, height: 1 };
  #viewport: HTMLElement | null = null;
  #stage: HTMLElement | null = null;
  #zoomLabel: HTMLElement | null = null;
  #centre: PointV7 = { x: 0.5, y: 0.5 };
  /**
   * A screen offset while a detail covers part of the graph: it moves the
   * chosen node into the uncovered part without touching the stored camera,
   * so closing the detail puts the tree back where it was.
   */
  #peek: PointV7 = { x: 0, y: 0 };
  #zoom = 1;
  #initialised = false;
  #pointers = new Map<number, ActivePointerV7>();
  #lastPan: PointV7 | null = null;
  #pinchDistance: number | null = null;
  #pinchMidpoint: PointV7 | null = null;
  #gestureMoved = false;
  #keyboardNavigation = false;
  #suppressClick = false;
  #suppressClickTimer: number | null = null;
  #resizeObserver: ResizeObserver | null = null;
  #cleanups: (() => void)[] = [];

  get zoom(): number {
    return this.#zoom;
  }

  reset(): void {
    this.#zoom = 1;
    this.#initialised = false;
    this.#apply();
  }

  fit(): void {
    this.#zoom = 1;
    this.#centre = {
      x: this.#graph.width / 2,
      y: this.#graph.height / 2,
    };
    this.#initialised = true;
    this.#apply();
  }

  zoomBy(factor: number, anchor?: PointV7): void {
    const viewport = this.#viewport;
    if (viewport === null || !Number.isFinite(factor) || factor <= 0) return;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    const point = anchor ?? { x: width / 2, y: height / 2 };
    const oldScale = this.#scale(width, height);
    const oldZoom = this.#zoom;
    this.#zoom = clamp(
      oldZoom * factor,
      MIN_ZOOM_V7,
      this.#maxZoom(width, height),
    );
    const newScale = this.#scale(width, height);
    if (oldScale > 0 && newScale > 0) {
      const offsetX = point.x - width / 2;
      const offsetY = point.y - height / 2;
      this.#centre = {
        x: this.#centre.x + offsetX / oldScale - offsetX / newScale,
        y: this.#centre.y + offsetY / oldScale - offsetY / newScale,
      };
    }
    this.#apply();
  }

  panBy(screenX: number, screenY: number): void {
    const viewport = this.#viewport;
    if (viewport === null) return;
    const scale = this.#scale(viewport.clientWidth, viewport.clientHeight);
    if (scale <= 0) return;
    this.#centre = {
      x: this.#centre.x - screenX / scale,
      y: this.#centre.y - screenY / scale,
    };
    this.#apply();
  }

  centreOn(x: number, y: number): void {
    this.#centre = { x, y };
    this.#apply();
  }

  /**
   * Keeps a graph point (and a margin round it) out from under `cover`, a
   * box in viewport pixels such as the technology detail, by shifting the
   * drawing; `clearReveal` undoes it.
   */
  reveal(
    x: number,
    y: number,
    cover: {
      readonly left: number;
      readonly top: number;
      readonly right: number;
      readonly bottom: number;
    },
    margin = 48,
  ): void {
    const point = this.project(x, y);
    if (point === null) return;
    const { width, height } = point;
    // A detail docked above or below spans most of the width.
    const coversWidth = cover.right - cover.left > width * 0.6;
    let free: { left: number; top: number; right: number; bottom: number };
    if (coversWidth)
      free =
        cover.top > height - cover.bottom
          ? { left: 0, top: 0, right: width, bottom: cover.top }
          : { left: 0, top: cover.bottom, right: width, bottom: height };
    else
      free =
        cover.left > width - cover.right
          ? { left: 0, top: 0, right: cover.left, bottom: height }
          : { left: cover.right, top: 0, right: width, bottom: height };
    const shift = (at: number, low: number, high: number): number => {
      if (at - margin >= low && at + margin <= high) return 0;
      return (low + high) / 2 - at;
    };
    this.#peek = {
      x: coversWidth ? 0 : shift(point.x, free.left, free.right),
      y: coversWidth ? shift(point.y, free.top, free.bottom) : 0,
    };
    this.#apply();
  }

  clearReveal(): void {
    if (this.#peek.x === 0 && this.#peek.y === 0) return;
    this.#peek = { x: 0, y: 0 };
    this.#apply();
  }

  /** Where a graph point is drawn now, or null before the graph is shown. */
  project(x: number, y: number): TechnologyTreeScreenPointV7 | null {
    const viewport = this.#viewport;
    if (viewport === null) return null;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    if (width <= 0 || height <= 0) return null;
    const scale = this.#scale(width, height);
    return {
      x: width / 2 + (x - this.#centre.x) * scale,
      y: height / 2 + (y - this.#centre.y) * scale,
      width,
      height,
    };
  }

  attach(
    viewport: HTMLElement,
    stage: HTMLElement,
    graph: TechnologyTreeViewportSizeV7,
    zoomLabel: HTMLElement | null = null,
  ): void {
    this.detach();
    this.#viewport = viewport;
    this.#stage = stage;
    this.#zoomLabel = zoomLabel;
    // The tree changing shape (a turned screen) keeps the zoom and the
    // same part of the tree in the middle.
    const previous = this.#graph;
    if (previous.width !== graph.width || previous.height !== graph.height)
      this.#centre = {
        x: (this.#centre.x * graph.width) / previous.width,
        y: (this.#centre.y * graph.height) / previous.height,
      };
    this.#graph = graph;
    if (!this.#initialised) this.fit();
    else this.#apply();

    this.#listen(viewport, "pointerdown", this.#onPointerDown);
    this.#listen(viewport, "pointermove", this.#onPointerMove);
    this.#listen(viewport, "pointerup", this.#onPointerEnd);
    this.#listen(viewport, "pointercancel", this.#onPointerEnd);
    this.#listen(viewport, "wheel", this.#onWheel, { passive: false });
    this.#listen(viewport, "click", this.#onClickCapture, true);
    this.#listen(viewport, "keydown", this.#onKeyDown);
    this.#listen(viewport, "focusin", this.#onFocusIn);
    const ResizeObserverClass =
      viewport.ownerDocument.defaultView?.ResizeObserver;
    if (ResizeObserverClass !== undefined) {
      this.#resizeObserver = new ResizeObserverClass(() => this.#apply());
      this.#resizeObserver.observe(viewport);
    }
    viewport.ownerDocument.defaultView?.requestAnimationFrame?.(() => {
      if (this.#viewport === viewport) this.#apply();
    });
  }

  detach(): void {
    for (const cleanup of this.#cleanups.splice(0)) cleanup();
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    if (this.#suppressClickTimer !== null)
      this.#viewport?.ownerDocument.defaultView?.clearTimeout(
        this.#suppressClickTimer,
      );
    this.#suppressClickTimer = null;
    this.#suppressClick = false;
    this.#viewport = null;
    this.#stage = null;
    this.#zoomLabel = null;
    this.#pointers.clear();
    this.#lastPan = null;
    this.#pinchDistance = null;
    this.#pinchMidpoint = null;
  }

  #listen<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions | boolean,
  ): void {
    target.addEventListener(type, listener as EventListener, options);
    this.#cleanups.push(() =>
      target.removeEventListener(type, listener as EventListener, options),
    );
  }

  readonly #onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 && event.pointerType !== "touch") return;
    this.#keyboardNavigation = false;
    this.#pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
    });
    this.#lastPan = { x: event.clientX, y: event.clientY };
    this.#gestureMoved = false;
    if (this.#pointers.size >= 2) {
      this.#startPinch();
      for (const pointerId of this.#pointers.keys())
        this.#viewport?.setPointerCapture?.(pointerId);
    }
  };

  readonly #onPointerMove = (event: PointerEvent): void => {
    const active = this.#pointers.get(event.pointerId);
    if (active === undefined) return;
    this.#pointers.set(event.pointerId, {
      ...active,
      x: event.clientX,
      y: event.clientY,
    });
    if (this.#pointers.size >= 2) {
      const [first, second] = [...this.#pointers.values()];
      if (first === undefined || second === undefined) return;
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      const midpoint = {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      };
      if (this.#pinchDistance !== null && this.#pinchMidpoint !== null) {
        this.panBy(
          midpoint.x - this.#pinchMidpoint.x,
          midpoint.y - this.#pinchMidpoint.y,
        );
        if (this.#pinchDistance > 0)
          this.zoomBy(distance / this.#pinchDistance, this.#local(midpoint));
      }
      this.#pinchDistance = distance;
      this.#pinchMidpoint = midpoint;
      this.#gestureMoved = true;
      event.preventDefault();
      return;
    }
    const moved = Math.hypot(
      event.clientX - active.startX,
      event.clientY - active.startY,
    );
    if (moved < PAN_SLOP_V7 && !this.#gestureMoved) return;
    if (!this.#gestureMoved)
      this.#viewport?.setPointerCapture?.(event.pointerId);
    this.#gestureMoved = true;
    if (this.#lastPan !== null)
      this.panBy(
        event.clientX - this.#lastPan.x,
        event.clientY - this.#lastPan.y,
      );
    this.#lastPan = { x: event.clientX, y: event.clientY };
    event.preventDefault();
  };

  readonly #onPointerEnd = (event: PointerEvent): void => {
    if (!this.#pointers.has(event.pointerId)) return;
    this.#pointers.delete(event.pointerId);
    if (this.#viewport?.hasPointerCapture?.(event.pointerId) === true)
      this.#viewport.releasePointerCapture(event.pointerId);
    if (
      event.type !== "pointercancel" &&
      (this.#gestureMoved || this.#pinchDistance !== null)
    )
      this.#armClickSuppression();
    else if (event.type === "pointercancel") this.#clearClickSuppression();
    this.#lastPan = null;
    if (this.#pointers.size < 2) {
      this.#pinchDistance = null;
      this.#pinchMidpoint = null;
    }
  };

  readonly #onClickCapture = (event: MouseEvent): void => {
    if (!this.#suppressClick) return;
    if (event.detail === 0) {
      this.#clearClickSuppression();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.#clearClickSuppression();
  };

  readonly #onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.zoomBy(
      Math.exp(-event.deltaY * 0.0015),
      this.#local({ x: event.clientX, y: event.clientY }),
    );
  };

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    this.#keyboardNavigation = true;
    if (event.target !== this.#viewport) return;
    const step = event.shiftKey ? 72 : 36;
    if (event.key === "ArrowLeft") this.panBy(step, 0);
    else if (event.key === "ArrowRight") this.panBy(-step, 0);
    else if (event.key === "ArrowUp") this.panBy(0, step);
    else if (event.key === "ArrowDown") this.panBy(0, -step);
    else if (event.key === "+" || event.key === "=") this.zoomBy(1.22);
    else if (event.key === "-" || event.key === "_") this.zoomBy(1 / 1.22);
    else if (event.key === "0" || event.key.toLowerCase() === "f") this.fit();
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  readonly #onFocusIn = (event: FocusEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches(".v7-tech-card"))
      return;
    // Pointer focus happens between down and up. Moving the stage at that
    // point retargets the release and loses a real tap on an edge node.
    if (!this.#keyboardNavigation) return;
    const x = Number(target.dataset.graphX);
    const y = Number(target.dataset.graphY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const viewport = this.#viewport;
    if (viewport === null) return;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    const scale = this.#scale(width, height);
    const screenX = width / 2 + (x - this.#centre.x) * scale;
    const screenY = height / 2 + (y - this.#centre.y) * scale;
    const margin = Math.min(72, Math.min(width, height) / 4);
    if (
      screenX < margin ||
      screenX > width - margin ||
      screenY < margin ||
      screenY > height - margin
    )
      this.centreOn(x, y);
  };

  #startPinch(): void {
    const [first, second] = [...this.#pointers.values()];
    if (first === undefined || second === undefined) return;
    this.#pinchDistance = Math.hypot(second.x - first.x, second.y - first.y);
    this.#pinchMidpoint = {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
    };
  }

  #armClickSuppression(): void {
    this.#clearClickSuppression();
    this.#suppressClick = true;
    this.#suppressClickTimer =
      this.#viewport?.ownerDocument.defaultView?.setTimeout(() => {
        this.#suppressClick = false;
        this.#suppressClickTimer = null;
      }, 0) ?? null;
  }

  #clearClickSuppression(): void {
    this.#suppressClick = false;
    if (this.#suppressClickTimer !== null)
      this.#viewport?.ownerDocument.defaultView?.clearTimeout(
        this.#suppressClickTimer,
      );
    this.#suppressClickTimer = null;
  }

  #local(point: PointV7): PointV7 {
    const viewport = this.#viewport;
    const rect = viewport?.getBoundingClientRect();
    return rect === undefined || viewport === null
      ? point
      : {
          x: point.x - rect.left - viewport.clientLeft,
          y: point.y - rect.top - viewport.clientTop,
        };
  }

  #fitScale(width: number, height: number): number {
    return technologyTreeFitScaleV7({ width, height }, this.#graph);
  }

  #maxZoom(width: number, height: number): number {
    const fit = this.#fitScale(width, height);
    return fit > 0 ? technologyTreeMaxScaleV7(fit) / fit : MAX_ZOOM_V7;
  }

  #scale(width: number, height: number): number {
    return this.#fitScale(width, height) * this.#zoom;
  }

  #apply(): void {
    const viewport = this.#viewport;
    const stage = this.#stage;
    if (viewport === null || stage === null) return;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    if (width <= 0 || height <= 0) return;
    const scale = this.#scale(width, height);
    this.#clampCentre(width, height, scale);
    stage.style.transform = `translate(${width / 2 + this.#peek.x}px, ${height / 2 + this.#peek.y}px) scale(${scale}) translate(${-this.#centre.x}px, ${-this.#centre.y}px)`;
    stage.dataset.zoom = String(this.#zoom);
    // Names and prices keep their size on screen (v7.css reads the inverse).
    stage.style.setProperty("--tech-inverse", String(1 / scale));
    stage.dataset.labels =
      scale >=
      (this.#graph.labelScale ?? TECHNOLOGY_TREE_SHAPES_V7.compact.labelScale) -
        1e-9
        ? "show"
        : "hidden";
    viewport.dataset.zoom = String(this.#zoom);
    if (this.#zoomLabel !== null) {
      this.#zoomLabel.textContent = `${Math.round(this.#zoom * 100)}%`;
      this.#zoomLabel.setAttribute(
        "aria-label",
        `Technology tree zoom ${Math.round(this.#zoom * 100)} percent`,
      );
    }
  }

  #clampCentre(width: number, height: number, scale: number): void {
    if (scale <= 0) return;
    const visibleWidth = width / scale;
    const visibleHeight = height / scale;
    const overscroll = 52 / scale;
    const minX = Math.min(this.#graph.width / 2, visibleWidth / 2 - overscroll);
    const maxX = Math.max(
      this.#graph.width / 2,
      this.#graph.width - visibleWidth / 2 + overscroll,
    );
    const minY = Math.min(
      this.#graph.height / 2,
      visibleHeight / 2 - overscroll,
    );
    const maxY = Math.max(
      this.#graph.height / 2,
      this.#graph.height - visibleHeight / 2 + overscroll,
    );
    this.#centre = {
      x: clamp(this.#centre.x, minX, maxX),
      y: clamp(this.#centre.y, minY, maxY),
    };
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
