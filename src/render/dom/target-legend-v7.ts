/**
 * The Help legend of the board's target highlights (bead pulp_wars-9im):
 * one small drawing per style of `target-highlight-v7`, in the style's own
 * colour and shape, with its one-word name. The sentence of each mark is
 * its tooltip and accessible name.
 */
import {
  TARGET_HIGHLIGHTS_V7,
  TARGET_HIGHLIGHT_STYLES_V7,
  type TargetHighlightSpecV7,
} from "../canvas/target-highlight-v7";

const SVG = "http://www.w3.org/2000/svg";

function shape(
  documentRoot: Document,
  name: string,
  attributes: Readonly<Record<string, string>>,
): SVGElement {
  const node = documentRoot.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attributes))
    node.setAttribute(key, value);
  return node;
}

function swatch(
  documentRoot: Document,
  spec: TargetHighlightSpecV7,
): SVGElement {
  const svg = shape(documentRoot, "svg", {
    viewBox: "0 0 24 24",
    width: "24",
    height: "24",
    class: "v7-target-legend-swatch",
    "aria-hidden": "true",
    fill: "none",
    stroke: spec.stroke,
    // Bead pulp_wars-2yc.88: the board's weights, light to heavy.
    "stroke-width":
      spec.shape === "BRACKETS"
        ? "1.8"
        : spec.shape === "BRACKETS_FRAME"
          ? "2.6"
          : "2.2",
  });
  // A thin frame first (an Attack), then the four corner brackets inside
  // the swatch's tile, as the board draws them.
  if (spec.shape === "BRACKETS_FRAME")
    svg.append(
      shape(documentRoot, "rect", {
        x: "2",
        y: "2",
        width: "20",
        height: "20",
        "stroke-width": "1",
      }),
    );
  svg.append(
    shape(documentRoot, "path", {
      d: "M4.5 9.5v-5h5M14.5 4.5h5v5M19.5 14.5v5h-5M9.5 19.5h-5v-5",
    }),
  );
  if (spec.shape === "BRACKETS_PLUS")
    svg.append(
      shape(documentRoot, "circle", {
        cx: "4.5",
        cy: "4.5",
        r: "4",
        fill: spec.stroke,
        stroke: "#10131c",
        "stroke-width": "1",
      }),
      shape(documentRoot, "path", {
        d: "M2.5 4.5h4M4.5 2.5v4",
        stroke: "#10131c",
        "stroke-width": "1.4",
      }),
    );
  if (spec.shape === "BRACKETS_PIPS")
    for (const [x, y] of [
      [4.5, 4.5],
      [19.5, 4.5],
      [19.5, 19.5],
      [4.5, 19.5],
    ] as const)
      svg.append(
        shape(documentRoot, "rect", {
          x: String(x - 1.75),
          y: String(y - 1.75),
          width: "3.5",
          height: "3.5",
          fill: spec.stroke,
          stroke: "#10131c",
          "stroke-width": "0.75",
        }),
      );
  return svg;
}

/** The four target marks with their names, as a list. */
export function targetLegendV7(documentRoot: Document): HTMLElement {
  const list = documentRoot.createElement("ul");
  list.className = "v7-target-legend";
  list.setAttribute("aria-label", "Map targets");
  for (const style of TARGET_HIGHLIGHT_STYLES_V7) {
    const spec = TARGET_HIGHLIGHTS_V7[style];
    const item = documentRoot.createElement("li");
    item.className = "v7-target-legend-item";
    item.dataset.targetStyle = style.toLowerCase();
    item.title = `${spec.name}: ${spec.look}`;
    item.setAttribute("aria-label", item.title);
    const label = documentRoot.createElement("span");
    label.textContent = spec.name;
    item.append(swatch(documentRoot, spec), label);
    list.append(item);
  }
  return list;
}
