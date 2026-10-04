import type { CuriosityOverlayIdV7 } from "../../assets/chibi-art-v7";

/**
 * Map curiosities in the interface (bead pulp_wars-737.6): the code-drawn
 * figures the LEGACY art set and the classic look show where the live look
 * shows a raster: the Giant Spider (a neutral disc with a spider, matching
 * the board's code-drawn Spider) and the five legend glyphs (web, basin,
 * arch, mast, coins). Neutral colours only, never a faction colour.
 */

const NAMESPACE = "http://www.w3.org/2000/svg";
const INK = "#1d1a17";
const BONE = "#efe6d0";
const STONE = "#a9a59a";
const UMBER = "#8a5a33";

function svgV7(
  documentRoot: Document,
  viewBox: string,
  className: string,
  assetId: string,
): {
  readonly svg: SVGSVGElement;
  readonly shape: (
    tag: "ellipse" | "path" | "circle" | "rect",
    attributes: Readonly<Record<string, string>>,
  ) => void;
} {
  const svg = documentRoot.createElementNS(NAMESPACE, "svg");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("class", className);
  svg.dataset.assetId = assetId;
  return {
    svg,
    shape: (tag, attributes) => {
      const node = documentRoot.createElementNS(NAMESPACE, tag);
      for (const [name, value] of Object.entries(attributes))
        node.setAttribute(name, value);
      svg.append(node);
    },
  };
}

/** The code-drawn Giant Spider of the dock and the unit dialog. */
export function spiderFigureV7(documentRoot: Document): SVGSVGElement {
  const { svg, shape } = svgV7(
    documentRoot,
    "0 0 64 64",
    "v7-art-frame v7-spider-figure",
    "unit-neutral-giant-spider-code",
  );
  shape("circle", {
    cx: "32",
    cy: "32",
    r: "29",
    fill: "#b9a58a",
    stroke: INK,
    "stroke-width": "3",
  });
  shape("path", {
    d: "M24 30 15 20 8 30M24 33 13 30 6 40M24 37 13 40 8 50M26 40 18 50 16 58M40 30 49 20 56 30M40 33 51 30 58 40M40 37 51 40 56 50M38 40 46 50 48 58",
    fill: "none",
    stroke: INK,
    "stroke-width": "3",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  });
  shape("ellipse", {
    cx: "32",
    cy: "29",
    rx: "11",
    ry: "12",
    fill: UMBER,
    stroke: INK,
    "stroke-width": "3",
  });
  shape("circle", {
    cx: "32",
    cy: "42",
    r: "7",
    fill: "#5f3d22",
    stroke: INK,
    "stroke-width": "3",
  });
  shape("circle", { cx: "29", cy: "42", r: "1.8", fill: "#ffffff" });
  shape("circle", { cx: "35", cy: "42", r: "1.8", fill: "#ffffff" });
  return svg;
}

/** A code-drawn legend glyph: a web, a basin, an arch, a mast, or coins. */
export function curiosityGlyphV7(
  documentRoot: Document,
  id: CuriosityOverlayIdV7 | "BOUNTY",
): SVGSVGElement {
  const { svg, shape } = svgV7(
    documentRoot,
    "0 0 32 32",
    "v7-curiosity-icon v7-curiosity-glyph",
    `curiosity-${id.toLowerCase()}-code`,
  );
  const stroke = { stroke: INK, "stroke-width": "1.6" } as const;
  if (id === "WEB")
    shape("path", {
      d: "M16 3V29M3 16H29M7 7 25 25M25 7 7 25M16 8 24 16 16 24 8 16ZM16 12 20 16 16 20 12 16Z",
      fill: "none",
      stroke: BONE,
      "stroke-width": "1.6",
      "stroke-linejoin": "round",
    });
  else if (id === "FOUNTAIN") {
    shape("ellipse", {
      cx: "16",
      cy: "22",
      rx: "13",
      ry: "6",
      fill: STONE,
      ...stroke,
    });
    shape("ellipse", {
      cx: "16",
      cy: "21",
      rx: "9",
      ry: "3.5",
      fill: "#dff6f4",
      ...stroke,
    });
    shape("path", { d: "M13 20Q16 2 19 20Z", fill: "#ffffff", ...stroke });
  } else if (id === "SHRINE") {
    shape("path", {
      d: "M6 28V14A10 10 0 0 1 26 14V28H21V15A5 5 0 0 0 11 15V28Z",
      fill: STONE,
      ...stroke,
    });
    shape("circle", { cx: "16", cy: "23", r: "3", fill: "#fff6dc", ...stroke });
  } else if (id === "WRECK") {
    shape("path", {
      d: "M13 25 17 4",
      fill: "none",
      stroke: INK,
      "stroke-width": "3.2",
    });
    shape("path", {
      d: "M17 6 27 11 22 15 24 19 15 16Z",
      fill: BONE,
      ...stroke,
    });
    shape("path", {
      d: "M3 20Q16 28 29 18L25 26H7Z",
      fill: "#8c7a66",
      ...stroke,
    });
  } else
    for (const [cx, cy] of [
      ["12", "20"],
      ["20", "20"],
      ["16", "13"],
    ] as const)
      shape("ellipse", {
        cx,
        cy,
        rx: "7",
        ry: "5",
        fill: "#ffd75a",
        ...stroke,
      });
  return svg;
}
