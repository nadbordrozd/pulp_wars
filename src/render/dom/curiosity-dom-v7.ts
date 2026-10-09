import type { CuriosityIconIdV7 } from "../curiosity-presentation-v7";

/**
 * Map curiosities in the interface (bead pulp_wars-737.6): the code-drawn
 * figures the LEGACY art set and the classic look show where the live look
 * shows a raster: the Giant Spider (a neutral disc with a spider, matching
 * the board's code-drawn Spider) and the five legend glyphs (web, basin,
 * arch, mast, coins); round 2 (bead pulp_wars-737.16): Bigfoot (a neutral
 * disc with a footprint) and the glyphs of the saucer, the headstones, the
 * gate's ring, the well and the footprint. Neutral colours only, never a
 * faction colour.
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

/** The code-drawn Bigfoot of the dock and the unit dialog. */
export function bigfootFigureV7(documentRoot: Document): SVGSVGElement {
  const { svg, shape } = svgV7(
    documentRoot,
    "0 0 64 64",
    "v7-art-frame v7-bigfoot-figure",
    "unit-neutral-bigfoot-code",
  );
  shape("circle", {
    cx: "32",
    cy: "32",
    r: "29",
    fill: "#b9a58a",
    stroke: INK,
    "stroke-width": "3",
  });
  footprint(shape, 32, 34, 1.4);
  return svg;
}

/** One big five-toed footprint centred on (cx, cy). */
function footprint(
  shape: ReturnType<typeof svgV7>["shape"],
  cx: number,
  cy: number,
  scale: number,
): void {
  shape("ellipse", {
    cx: String(cx),
    cy: String(cy + 4 * scale),
    rx: String(7 * scale),
    ry: String(10.5 * scale),
    fill: UMBER,
  });
  for (const [dx, dy, r] of [
    [-6, -9, 2.5],
    [-2, -11, 2.2],
    [2.2, -11.4, 2.1],
    [6, -9.6, 1.9],
    [8.4, -6, 1.7],
  ] as const)
    shape("circle", {
      cx: String(cx + dx * scale),
      cy: String(cy + dy * scale),
      r: String(r * scale),
      fill: UMBER,
    });
}

/**
 * A code-drawn legend glyph: a web, a basin, an arch, a mast, coins; round
 * 2: a saucer, headstones, a ring of stones, a well, a footprint.
 */
export function curiosityGlyphV7(
  documentRoot: Document,
  id: CuriosityIconIdV7,
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
  } else if (id === "DOWNED_SAUCER") {
    shape("path", {
      d: "M10 15A7 6 0 0 1 22 11Z",
      fill: "#d9e6ea",
      ...stroke,
    });
    shape("ellipse", {
      cx: "16",
      cy: "18",
      rx: "13",
      ry: "4.5",
      fill: "#9ea3a8",
      transform: "rotate(-18 16 18)",
      ...stroke,
    });
  } else if (id === "GRAVEYARD") {
    shape("path", {
      d: "M5 26V14A4 4 0 0 1 13 14V26ZM15 26V10A4.5 4.5 0 0 1 24 10V26Z",
      fill: STONE,
      ...stroke,
    });
    shape("path", {
      d: "M3 29H29M7 29V23M26 29V23",
      fill: "none",
      stroke: INK,
      "stroke-width": "1.6",
    });
  } else if (id === "GATE") {
    shape("ellipse", {
      cx: "16",
      cy: "20",
      rx: "10",
      ry: "5",
      fill: "#f6f3ff",
      ...stroke,
    });
    shape("path", {
      d: "M3 22V12H7V22ZM25 22V12H29V22ZM9 16V6H13V16ZM19 16V6H23V16Z",
      fill: STONE,
      ...stroke,
    });
  } else if (id === "WISHING_WELL") {
    shape("path", { d: "M4 12 16 4 28 12Z", fill: UMBER, ...stroke });
    shape("path", {
      d: "M7 12V27M25 12V27",
      fill: "none",
      stroke: INK,
      "stroke-width": "2",
    });
    shape("path", {
      d: "M6 18H26V27A10 3 0 0 1 6 27Z",
      fill: STONE,
      ...stroke,
    });
    shape("circle", { cx: "19", cy: "22", r: "1.8", fill: "#ffd75a" });
  } else if (id === "BIGFOOT") footprint(shape, 16, 17, 1.05);
  else
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
