import {
  RULESET7_TACTICAL_UI_SYMBOL_BY_ID,
  RULESET7_TACTICAL_UI_THEME_TREATMENTS,
  type Ruleset7TacticalUiSymbolId,
  type TacticalSymbolTheme,
  type TacticalSymbolTone,
} from "../../assets/ruleset7-tactical-ui-symbols";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** Renders the accepted code-native 24×24 registry geometry without deriving state. */
export function createTacticalSymbolV7(
  documentRoot: Document,
  id: Ruleset7TacticalUiSymbolId,
  theme: TacticalSymbolTheme,
): SVGSVGElement {
  const definition = RULESET7_TACTICAL_UI_SYMBOL_BY_ID[id];
  const treatment = RULESET7_TACTICAL_UI_THEME_TREATMENTS[theme];
  const svg = documentRoot.createElementNS(SVG_NAMESPACE, "svg");
  svg.classList.add("v7-tactical-symbol");
  svg.dataset.symbolId = id;
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", definition.semanticLabel);
  for (const primitive of definition.primitives) {
    const shape = documentRoot.createElementNS(SVG_NAMESPACE, primitive.kind);
    if (primitive.kind === "line") {
      shape.setAttribute("x1", String(primitive.x1));
      shape.setAttribute("y1", String(primitive.y1));
      shape.setAttribute("x2", String(primitive.x2));
      shape.setAttribute("y2", String(primitive.y2));
      shape.setAttribute("stroke-width", String(primitive.width));
      shape.setAttribute("stroke", lineColor(primitive.tone, treatment));
      shape.setAttribute("stroke-linecap", "round");
    } else if (primitive.kind === "circle") {
      shape.setAttribute("cx", String(primitive.cx));
      shape.setAttribute("cy", String(primitive.cy));
      shape.setAttribute("r", String(primitive.radius));
      shape.setAttribute("fill", treatment.tones[primitive.fill]);
      shape.setAttribute("stroke", treatment.tones[primitive.stroke]);
      shape.setAttribute("stroke-width", "1.5");
    } else if (primitive.kind === "rect") {
      shape.setAttribute("x", String(primitive.x));
      shape.setAttribute("y", String(primitive.y));
      shape.setAttribute("width", String(primitive.width));
      shape.setAttribute("height", String(primitive.height));
      shape.setAttribute("rx", String(primitive.radius));
      shape.setAttribute("fill", treatment.tones[primitive.fill]);
      shape.setAttribute("stroke", treatment.tones[primitive.stroke]);
      shape.setAttribute("stroke-width", "1.5");
    } else {
      shape.setAttribute(
        "points",
        primitive.points.map(([x, y]) => `${x},${y}`).join(" "),
      );
      shape.setAttribute("fill", treatment.tones[primitive.fill]);
      shape.setAttribute("stroke", treatment.tones[primitive.stroke]);
      shape.setAttribute("stroke-width", "1.5");
      shape.setAttribute("stroke-linejoin", "round");
    }
    svg.append(shape);
  }
  return svg;
}

function lineColor(
  tone: TacticalSymbolTone,
  treatment: (typeof RULESET7_TACTICAL_UI_THEME_TREATMENTS)[TacticalSymbolTheme],
): string {
  return treatment.lineTonePolicy === "BOUNDARY_TONE"
    ? treatment.boundary
    : treatment.tones[tone];
}
