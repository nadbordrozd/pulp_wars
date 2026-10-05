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
    "stroke-width": "2.2",
  });
  if (spec.shape === "RING_PLUS") {
    svg.append(
      shape(documentRoot, "circle", { cx: "12", cy: "12", r: "8.5" }),
      shape(documentRoot, "circle", {
        cx: "18.5",
        cy: "5.5",
        r: "4",
        fill: spec.stroke,
        stroke: "#10131c",
        "stroke-width": "1",
      }),
      shape(documentRoot, "path", {
        d: "M16.5 5.5h4M18.5 3.5v4",
        stroke: "#10131c",
        "stroke-width": "1.4",
      }),
    );
    return svg;
  }
  svg.append(
    shape(documentRoot, "rect", {
      x: "3",
      y: "3",
      width: "18",
      height: "18",
      ...(spec.shape === "DASHED_TILE" ? { "stroke-dasharray": "5 3" } : {}),
      ...(spec.shape === "DOTTED_PIPS"
        ? { "stroke-dasharray": "0.5 3.5", "stroke-linecap": "round" }
        : {}),
    }),
  );
  if (spec.shape === "BRACKET_TILE")
    svg.append(
      shape(documentRoot, "path", {
        d: "M6.5 10V6.5H10M14 6.5h3.5V10M17.5 14v3.5H14M10 17.5H6.5V14",
      }),
    );
  if (spec.shape === "DOTTED_PIPS")
    for (const [x, y] of [
      [6, 6],
      [15.5, 6],
      [15.5, 15.5],
      [6, 15.5],
    ] as const)
      svg.append(
        shape(documentRoot, "rect", {
          x: String(x),
          y: String(y),
          width: "2.5",
          height: "2.5",
          fill: spec.stroke,
          stroke: "none",
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
