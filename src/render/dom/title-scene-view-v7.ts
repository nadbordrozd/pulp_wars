import { chibiAnchorV7 } from "../../assets/chibi-art-v7";
import {
  resolveChibiWithFallbackV7,
  type ChibiBoardArtV7,
  type ChibiRasterEnvironmentV7,
} from "../canvas/chibi-art-resolver-v7";
import {
  COAST_LAYER_REACH_V7,
  coastSandEnabledV7,
  createCoastSandArtV7,
  type CoastSandArtV7,
} from "../canvas/coast-sand-v7";
import { factionColourV7 } from "../canvas/faction-colours-v7";
import {
  GALLERY_TILE_BOX_V7,
  createGalleryArtV7,
  galleryUnitShadowV7,
} from "../canvas/gallery-sprite-v7";
import { DIRECTED_GROUND_SHADOW_COLOUR_V7 } from "../canvas/visual-direction-v7";
import {
  titleSceneHorizonV7,
  titleSceneV7,
  type TitleSceneV7,
} from "../title-scene-v7";

/**
 * The title scene's canvas (bead pulp_wars-2yc.4): draws the layout of
 * src/render/title-scene-v7.ts with the live look's art chain (the one the
 * board host and the Gallery use), at a whole number of screen pixels per
 * art pixel. With full motion the clouds drift and the units bob by one
 * art pixel, at ten frames a second; with reduced motion it is a still
 * picture and no frame is requested. It makes no sound and takes no input.
 * The coast's sand and surf are the board's (bead pulp_wars-eu3r.6), drawn
 * by code and switched off with the board's (`?coast-sand=0`).
 */
export type TitleSceneStateV7 = "EMPTY" | "LOADING" | "READY";

/** Frames a second of the idle motion: pixel art moves in steps. */
const TICKS_PER_SECOND = 10;

/**
 * Screen pixels per art pixel for a canvas of this CSS size. The scene
 * fills the screen behind the main menu (bead pulp_wars-2yc.18), so the
 * scale is the largest that still leaves a wide picture: room for the
 * ranks beside the menu, and sky above the range.
 */
export function titleSceneScaleV7(width: number, height: number): number {
  let scale = 4;
  for (; scale > 1; scale -= 1) {
    const rows = height / scale;
    // A wide picture on a landscape screen; an upright one may be narrower.
    if (
      rows >= 300 &&
      width / scale >= Math.min(480, Math.max(240, rows * 0.45))
    )
      break;
  }
  return scale;
}

/**
 * CSS pixels from the top to where the ground of a scene of this CSS size
 * starts: the horizon of the loading screen's plain backdrop.
 */
export function titleSceneHorizonCssV7(width: number, height: number): number {
  const scale = titleSceneScaleV7(width, height);
  return titleSceneHorizonV7(height / scale) * scale;
}

/**
 * The share of the scene's width the menu may claim at the west edge; a
 * wider menu (a phone's, centred) is not cleared for: it sits in the sky.
 */
const MENU_CLEAR_LIMIT = 0.5;

export class TitleSceneViewV7 {
  readonly root: HTMLElement;
  readonly #document: Document;
  readonly #canvas: HTMLCanvasElement;
  readonly #environment: ChibiRasterEnvironmentV7;
  readonly #art: ChibiBoardArtV7;
  readonly #coastArt: CoastSandArtV7 | null;
  readonly #rasters = new Map<
    string,
    { ready: boolean; image: CanvasImageSource | null }
  >();
  #motion: "FULL" | "REDUCED";
  #running = false;
  #frame: number | null = null;
  #lastTick = -1;
  #redrawQueued = false;
  #observer: ResizeObserver | null = null;
  #destroyed = false;
  readonly #menuWidth: () => number;

  constructor(
    documentRoot: Document,
    options: {
      readonly environment: ChibiRasterEnvironmentV7;
      readonly motion: "FULL" | "REDUCED";
      /**
       * CSS pixels the menu covers at the scene's west edge (0: none); the
       * units keep clear of it.
       */
      readonly menuWidth?: () => number;
    },
  ) {
    this.#document = documentRoot;
    this.#environment = options.environment;
    this.#motion = options.motion;
    this.#menuWidth = options.menuWidth ?? (() => 0);
    this.root = documentRoot.createElement("div");
    this.root.className = "v7-title-scene";
    this.root.setAttribute("aria-hidden", "true");
    this.root.dataset.state = "empty";
    this.#canvas = documentRoot.createElement("canvas");
    this.root.append(this.#canvas);
    this.#art = createGalleryArtV7(options.environment, () =>
      this.#queueRedraw(),
    );
    this.#coastArt = coastSandEnabledV7()
      ? createCoastSandArtV7(options.environment)
      : null;
    const Observer = documentRoot.defaultView?.ResizeObserver;
    if (Observer !== undefined) {
      this.#observer = new Observer(() => this.#queueRedraw());
      this.#observer.observe(this.root);
    }
  }

  setMotion(motion: "FULL" | "REDUCED"): void {
    if (this.#motion === motion) return;
    this.#motion = motion;
    this.#lastTick = -1;
    if (this.#running) this.#schedule();
    this.#queueRedraw();
  }

  /** The scene is on screen: draw it and, with full motion, animate it. */
  start(): void {
    if (this.#destroyed) return;
    this.#running = true;
    this.#queueRedraw();
    this.#schedule();
  }

  /** The scene left the screen: no frame is requested until `start`. */
  stop(): void {
    this.#running = false;
    const browser = this.#document.defaultView;
    if (this.#frame !== null) browser?.cancelAnimationFrame?.(this.#frame);
    this.#frame = null;
  }

  destroy(): void {
    this.stop();
    this.#destroyed = true;
    this.#observer?.disconnect();
    this.root.remove();
  }

  #schedule(): void {
    const browser = this.#document.defaultView;
    if (
      !this.#running ||
      this.#motion !== "FULL" ||
      this.#frame !== null ||
      browser === null ||
      typeof browser.requestAnimationFrame !== "function"
    )
      return;
    this.#frame = browser.requestAnimationFrame((now) => {
      this.#frame = null;
      if (!this.#running || this.#motion !== "FULL") return;
      const tick = Math.floor((now / 1000) * TICKS_PER_SECOND);
      if (tick !== this.#lastTick && this.root.isConnected) {
        this.#lastTick = tick;
        this.#draw(tick / TICKS_PER_SECOND);
      }
      this.#schedule();
    });
  }

  #queueRedraw(): void {
    if (this.#redrawQueued || this.#destroyed) return;
    this.#redrawQueued = true;
    queueMicrotask(() => {
      this.#redrawQueued = false;
      if (this.#destroyed || !this.#running) return;
      this.#draw(
        this.#motion === "FULL" && this.#lastTick >= 0
          ? this.#lastTick / TICKS_PER_SECOND
          : 0,
      );
    });
  }

  #raster(url: string): CanvasImageSource | null {
    let record = this.#rasters.get(url);
    if (record === undefined) {
      const created: { ready: boolean; image: CanvasImageSource | null } = {
        ready: false,
        image: null,
      };
      record = created;
      this.#rasters.set(url, created);
      let returned = false;
      created.image = this.#environment.loadImage(url, (ok) => {
        created.ready = ok;
        // A synchronous settle (a preloaded raster) needs no redraw.
        if (returned) this.#queueRedraw();
      });
      returned = true;
    }
    return record.ready ? record.image : null;
  }

  #draw(seconds: number): void {
    const rect = this.root.getBoundingClientRect();
    const cssWidth = Math.round(rect.width);
    const cssHeight = Math.round(rect.height);
    if (cssWidth <= 0 || cssHeight <= 0) return;
    const scale = titleSceneScaleV7(cssWidth, cssHeight);
    const dpr = Math.max(1, this.#document.defaultView?.devicePixelRatio ?? 1);
    const deviceScale = scale * dpr;
    const menu = this.#menuWidth();
    const scene = titleSceneV7({
      width: cssWidth / scale,
      height: cssHeight / scale,
      clearLeft:
        menu > 0 && menu <= cssWidth * MENU_CLEAR_LIMIT ? menu / scale : 0,
    });
    // Resolve everything first: a context is asked for only with something
    // to draw (a DOM without canvas support draws nothing). The coast is
    // drawn by code: it never waits and does not count as art.
    const resolved = scene.items.map((item) =>
      item.kind === "COAST"
        ? null
        : item.kind === "RASTER"
          ? this.#raster(item.url)
          : resolveChibiWithFallbackV7(this.#art, {
              subject: item.subject,
              at: item.at,
              ownerColor:
                item.faction === undefined
                  ? undefined
                  : factionColourV7(item.faction),
              deviceScale,
            }).resolution,
    );
    const ready = resolved.filter(
      (entry) =>
        entry !== null && (!("kind" in entry) || entry.kind === "READY"),
    ).length;
    const art = scene.items.filter((item) => item.kind !== "COAST").length;
    const state: TitleSceneStateV7 =
      ready === 0 ? "EMPTY" : ready < art ? "LOADING" : "READY";
    this.root.dataset.state = state.toLowerCase();
    if (ready === 0) return;
    let context: CanvasRenderingContext2D | null | undefined;
    try {
      context = this.#canvas.getContext("2d");
    } catch {
      context = null;
    }
    // A DOM without canvas support may hand back nothing at all.
    if (context === null || context === undefined) return;
    const width = Math.round(cssWidth * dpr);
    const height = Math.round(cssHeight * dpr);
    if (this.#canvas.width !== width) this.#canvas.width = width;
    if (this.#canvas.height !== height) this.#canvas.height = height;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, width, height);
    context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
    context.imageSmoothingEnabled = !Number.isInteger(deviceScale);
    this.#clouds(context, scene, seconds);
    scene.items.forEach((item, index) => {
      if (item.kind === "COAST") {
        this.#coast(context, item);
        return;
      }
      const entry = resolved[index];
      if (entry === null || entry === undefined) return;
      if (item.kind === "RASTER") {
        if ("kind" in entry) return;
        context.drawImage(entry, item.x, item.y, item.width, item.height);
        return;
      }
      if (!("kind" in entry) || entry.kind !== "READY") return;
      const anchor = chibiAnchorV7(entry.asset);
      // Idle: a unit rises by one art pixel for part of its cycle.
      const bob =
        item.unit === undefined
          ? 0
          : Math.sin(
                (seconds / (item.unit.afloat ? 3.2 : 2) + item.unit.phase) *
                  Math.PI *
                  2,
              ) > 0.35
            ? -1
            : 0;
      const x = item.cx - anchor.x;
      const y = item.cy - anchor.y;
      if (item.unit !== undefined && !item.unit.afloat) {
        const shadow = galleryUnitShadowV7(item.subject, entry.asset);
        if (shadow !== null) {
          context.beginPath();
          context.ellipse(
            shadow.x - GALLERY_TILE_BOX_V7.cellCentreX + item.cx,
            shadow.y - GALLERY_TILE_BOX_V7.cellCentreY + item.cy,
            shadow.radiusX,
            shadow.radiusY,
            0,
            0,
            Math.PI * 2,
          );
          context.fillStyle = DIRECTED_GROUND_SHADOW_COLOUR_V7;
          context.fill();
        }
      }
      context.drawImage(
        entry.image,
        x,
        y + bob,
        entry.asset.width,
        entry.asset.height,
      );
    });
  }

  /**
   * A cell's shoreline layer, as the board draws it; where the nearer row
   * covers the cell's foot, its far band is drawn at the foot of the strip
   * that shows and the empty middle is left out.
   */
  #coast(
    context: CanvasRenderingContext2D,
    item: Extract<TitleSceneV7["items"][number], { kind: "COAST" }>,
  ): void {
    const image = this.#coastArt?.layer(
      item.layer,
      item.neighbours,
      item.phase,
    );
    if (image === null || image === undefined) return;
    const cell = 80;
    const band = Math.min(COAST_LAYER_REACH_V7, Math.floor(item.rows / 2));
    if (item.rows >= cell) {
      context.drawImage(image, item.x, item.y, cell, cell);
      return;
    }
    const top = item.rows - band;
    context.drawImage(image, 0, 0, cell, top, item.x, item.y, cell, top);
    context.drawImage(
      image,
      0,
      cell - band,
      cell,
      band,
      item.x,
      item.y + top,
      cell,
      band,
    );
  }

  /** Soft clouds, drawn in code; they wrap round the canvas. */
  #clouds(
    context: CanvasRenderingContext2D,
    scene: TitleSceneV7,
    seconds: number,
  ): void {
    for (const cloud of scene.clouds) {
      const lane = scene.width + cloud.width * 2;
      const x = Math.round(
        ((((cloud.x + seconds * cloud.speed) % lane) + lane) % lane) -
          cloud.width,
      );
      const { width, height } = cloud;
      // Three puffs on a flat base, one art-pixel row at a time; the last
      // rows are shaded.
      const puffs = [
        { cx: width * 0.27, cy: height * 0.64, r: height * 0.36 },
        { cx: width * 0.52, cy: height * 0.46, r: height * 0.46 },
        { cx: width * 0.76, cy: height * 0.68, r: height * 0.32 },
      ];
      for (let row = 0; row < height; row += 1) {
        let left = Infinity;
        let right = -Infinity;
        for (const puff of puffs) {
          const dy = Math.min(row + 0.5, puff.cy) - puff.cy;
          const half = Math.sqrt(Math.max(0, puff.r * puff.r - dy * dy));
          if (half <= 0) continue;
          left = Math.min(left, puff.cx - half);
          right = Math.max(right, puff.cx + half);
        }
        if (right <= left) continue;
        context.fillStyle = row >= height - 2 ? "#cfdff0" : "#fffaf0";
        context.fillRect(
          x + Math.round(left),
          cloud.y + row,
          Math.max(1, Math.round(right - left)),
          1,
        );
      }
    }
  }
}
