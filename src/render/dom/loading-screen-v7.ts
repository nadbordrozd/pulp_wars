/**
 * The loading screen (bead pulp_wars-2yc.6): an icon over a progress bar,
 * shown while the asset preloader fetches the look's art. It is drawn
 * without any raster (none is loaded yet) and has no visible text; the bar
 * carries its state for assistive technology. The bar moves in steps, with
 * a short eased transition only when motion is not reduced (v7.css).
 */
export interface LoadingScreenV7 {
  readonly root: HTMLElement;
  /** `settled` of `total` rasters are done. */
  update(progress: { readonly settled: number; readonly total: number }): void;
  destroy(): void;
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

export function mountLoadingScreenV7(
  documentRoot: Document,
  root: HTMLElement,
): LoadingScreenV7 {
  const shell = documentRoot.createElement("div");
  shell.className = "v7-app-shell";
  shell.dataset.phase = "loading";
  const main = documentRoot.createElement("main");
  main.className = "v7-loading";
  main.dataset.v7Loading = "true";
  const bar = documentRoot.createElement("div");
  bar.className = "v7-loading-bar";
  bar.setAttribute("role", "progressbar");
  bar.setAttribute("aria-label", "Loading");
  bar.setAttribute("aria-valuemin", "0");
  bar.setAttribute("aria-valuemax", "100");
  bar.setAttribute("aria-valuenow", "0");
  const fill = documentRoot.createElement("span");
  fill.className = "v7-loading-fill";
  fill.style.width = "0%";
  bar.append(fill);
  main.append(crest(documentRoot), bar);
  shell.append(main);
  root.replaceChildren(shell);
  let shown = 0;
  return {
    root: shell,
    update({ settled, total }) {
      const percent =
        total <= 0 ? 100 : Math.floor((Math.min(settled, total) / total) * 100);
      // The bar never moves backwards and is not touched for a sub-percent
      // step, so a look of 700 files writes the DOM at most 100 times.
      if (percent <= shown) return;
      shown = percent;
      bar.setAttribute("aria-valuenow", String(percent));
      fill.style.width = `${percent}%`;
    },
    destroy() {
      if (shell.parentNode === root) root.replaceChildren();
    },
  };
}
