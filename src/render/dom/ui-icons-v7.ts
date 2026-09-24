/**
 * Small monochrome interface glyphs for the Ruleset 7 HUD and docks.
 * They inherit `currentColor` so they follow the active theme; game art
 * (units, terrain, buildings, coins, population) stays PixelLab-generated.
 */
export type UiIconIdV7 =
  | "hp"
  | "attack"
  | "defense"
  | "move"
  | "range"
  | "sight"
  | "menu"
  | "tech"
  | "close"
  | "zoom-in"
  | "zoom-out"
  | "skip"
  | "trophy"
  | "info"
  | "units";

const PATHS: Readonly<Record<UiIconIdV7, string>> = {
  hp: "M12 20.5 4.2 12.8a4.6 4.6 0 0 1 6.5-6.5L12 7.6l1.3-1.3a4.6 4.6 0 0 1 6.5 6.5Z",
  attack: "M20 4 9.5 14.5M20 4h-4.5M20 4v4.5M6.5 11.5l6 6M9.5 14.5 4 20",
  defense: "M12 3 4.5 6v5.5c0 4.4 3.1 8.2 7.5 9.5 4.4-1.3 7.5-5.1 7.5-9.5V6Z",
  move: "M4 12h14M13 6.5 18.5 12 13 17.5",
  range:
    "M12 3v4m0 10v4M3 12h4m10 0h4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 3.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6Z",
  sight:
    "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Zm9.5-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  menu: "M4 6.5h16M4 12h16M4 17.5h16",
  tech: "M9 3h6M10 3v6.2L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.2V3M7.5 14h9",
  close: "M6 6l12 12M18 6 6 18",
  "zoom-in": "M5 12h14M12 5v14",
  "zoom-out": "M5 12h14",
  skip: "M4 6l7 6-7 6ZM13 6l7 6-7 6Z",
  trophy:
    "M8 4h8v5a4 4 0 0 1-8 0ZM8 6H4.5v1.5A3.5 3.5 0 0 0 8 11M16 6h3.5v1.5A3.5 3.5 0 0 1 16 11M12 13v4M8.5 20h7M9.5 17h5v3h-5Z",
  units:
    "M12 3.5a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6ZM4.5 20.5c0-4.1 3.4-7.4 7.5-7.4s7.5 3.3 7.5 7.4Z",
  info: "M12 11v6M12 7.2v.1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
};

const FILLED: ReadonlySet<UiIconIdV7> = new Set([
  "hp",
  "defense",
  "skip",
  "units",
]);

export function uiIconV7(
  documentRoot: Document,
  id: UiIconIdV7,
  className = "v7-ui-icon",
): SVGSVGElement {
  const svg = documentRoot.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("class", className);
  svg.dataset.icon = id;
  const path = documentRoot.createElementNS(
    "http://www.w3.org/2000/svg",
    "path",
  );
  path.setAttribute("d", PATHS[id]);
  path.setAttribute("fill", FILLED.has(id) ? "currentColor" : "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);
  return svg;
}
