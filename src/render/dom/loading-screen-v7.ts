import type { ChibiRasterEnvironmentV7 } from "../canvas/chibi-art-resolver-v7";
import {
  TitleSceneViewV7,
  titleSceneHorizonCssV7,
} from "./title-scene-view-v7";

/**
 * The loading screen (beads pulp_wars-2yc.6, pulp_wars-502h), shown while
 * the asset preloader fetches the look's art: the title scene, the diorama
 * of the game's own art (src/render/dom/title-scene-view-v7.ts), with a
 * cream plate over its sky that holds the label and the progress bar.
 *
 * The start preloads the scene's own files first. Until all of them are in
 * (`scene.ready()`, asked again at every progress step) the screen is a
 * plain sky over grass drawn by CSS, so no piece is ever drawn half-loaded
 * or as a broken image; then the scene is mounted whole, in one frame. A
 * screen mounted without a scene keeps the plain backdrop.
 *
 * The bar carries its state for assistive technology (role progressbar,
 * labelled by the visible "Loading"; the percentage beside it repeats
 * `aria-valuenow` and is hidden from it). The bar moves in steps, with a
 * short eased transition and the scene fading in only with full motion;
 * with reduced motion the scene is a still picture (v7.css).
 */
export interface LoadingScreenV7 {
  readonly root: HTMLElement;
  /** `settled` of `total` rasters are done. */
  update(progress: { readonly settled: number; readonly total: number }): void;
  destroy(): void;
}

export interface LoadingScreenOptionsV7 {
  /** The title scene behind the bar, once its rasters are preloaded. */
  readonly scene?: {
    readonly environment: ChibiRasterEnvironmentV7;
    /** True when every raster the scene draws is preloaded. */
    readonly ready: () => boolean;
  };
  readonly motion?: "FULL" | "REDUCED";
}

const SVG_NS = "http://www.w3.org/2000/svg";

/** A shield with a star, in the palette of the title. */
function crest(documentRoot: Document): SVGElement {
  const svg = documentRoot.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "v7-loading-icon");
  const shape = (tag: string, attributes: Record<string, string>): void => {
    const node = documentRoot.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attributes))
      node.setAttribute(name, value);
    svg.append(node);
  };
  shape("path", {
    d: "M32 5 54 13v17c0 14-9 23-22 29C19 53 10 44 10 30V13Z",
    class: "v7-loading-shield",
  });
  shape("path", {
    d: "m32 17 4.1 8.6 9.4 1.2-6.9 6.5 1.8 9.3L32 38l-8.4 4.6 1.8-9.3-6.9-6.5 9.4-1.2Z",
    class: "v7-loading-star",
  });
  return svg;
}

/** The plate of the loading screen: the crest, "Loading" and the bar. */
export interface LoadingPlateV7 {
  readonly root: HTMLElement;
  /** `settled` of `total` files are done; the bar never moves backwards. */
  update(progress: { readonly settled: number; readonly total: number }): void;
}

/**
 * The plate alone. The loading screen holds it over the title scene; a
 * board that waits for its factions' art (bead pulp_wars-2yc.42) holds
 * the same plate over the screen that asked for the board.
 */
export function createLoadingPlateV7(documentRoot: Document): LoadingPlateV7 {
  const plate = documentRoot.createElement("div");
  plate.className = "v7-loading-plate";
  const heading = documentRoot.createElement("div");
  heading.className = "v7-loading-heading";
  const label = documentRoot.createElement("span");
  label.className = "v7-loading-label";
  label.id = "v7-loading-label";
  label.textContent = "Loading";
  const percent = documentRoot.createElement("span");
  percent.className = "v7-loading-percent";
  percent.setAttribute("aria-hidden", "true");
  percent.textContent = "0%";
  heading.append(crest(documentRoot), label, percent);

  const bar = documentRoot.createElement("div");
  bar.className = "v7-loading-bar";
  bar.setAttribute("role", "progressbar");
  bar.setAttribute("aria-labelledby", label.id);
  bar.setAttribute("aria-valuemin", "0");
  bar.setAttribute("aria-valuemax", "100");
  bar.setAttribute("aria-valuenow", "0");
  const fill = documentRoot.createElement("span");
  fill.className = "v7-loading-fill";
  fill.style.width = "0%";
  bar.append(fill);
  plate.append(heading, bar);
  let shown = 0;
  return {
    root: plate,
    update({ settled, total }) {
      const value =
        total <= 0 ? 100 : Math.floor((Math.min(settled, total) / total) * 100);
      // The bar never moves backwards and is not touched for a sub-percent
      // step, so a look of 900 files writes the DOM at most 100 times.
      if (value <= shown) return;
      shown = value;
      bar.setAttribute("aria-valuenow", String(value));
      fill.style.width = `${value}%`;
      percent.textContent = `${value}%`;
    },
  };
}

export function mountLoadingScreenV7(
  documentRoot: Document,
  root: HTMLElement,
  options: LoadingScreenOptionsV7 = {},
): LoadingScreenV7 {
  const motion = options.motion ?? "FULL";
  const shell = documentRoot.createElement("div");
  shell.className = "v7-app-shell";
  shell.dataset.phase = "loading";
  shell.dataset.motion = motion.toLowerCase();
  const main = documentRoot.createElement("main");
  main.className = "v7-loading";
  main.dataset.v7Loading = "true";
  main.dataset.scene = options.scene === undefined ? "none" : "waiting";

  const plate = createLoadingPlateV7(documentRoot);
  main.append(plate.root);
  shell.append(main);
  root.replaceChildren(shell);

  // The backdrop's horizon is where the scene's ground will start, so the
  // scene does not move it when it arrives.
  const browser = documentRoot.defaultView;
  const placeHorizon = (): void => {
    const width = documentRoot.documentElement.clientWidth;
    const height = documentRoot.documentElement.clientHeight;
    if (width <= 0 || height <= 0) return;
    main.style.setProperty(
      "--v7-loading-horizon",
      `${titleSceneHorizonCssV7(width, height)}px`,
    );
  };
  placeHorizon();
  browser?.addEventListener("resize", placeHorizon);

  let view: TitleSceneViewV7 | null = null;
  /** Mounts the scene once its rasters are all in: never half-drawn. */
  const showScene = (): void => {
    const scene = options.scene;
    if (scene === undefined || view !== null) return;
    let ready: boolean;
    try {
      ready = scene.ready();
    } catch {
      // A broken check keeps the plain backdrop.
      ready = false;
    }
    if (!ready) return;
    view = new TitleSceneViewV7(documentRoot, {
      environment: scene.environment,
      motion,
    });
    main.prepend(view.root);
    main.dataset.scene = "ready";
    view.start();
  };
  showScene();

  return {
    root: shell,
    update(progress) {
      showScene();
      plate.update(progress);
    },
    destroy() {
      browser?.removeEventListener("resize", placeHorizon);
      view?.destroy();
      view = null;
      if (shell.parentNode === root) root.replaceChildren();
    },
  };
}
