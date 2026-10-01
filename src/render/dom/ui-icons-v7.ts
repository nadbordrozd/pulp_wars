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
  | "units"
  | "skull"
  | "grave"
  | "devour"
  | "wail"
  | "plague"
  | "bite"
  | "goblin"
  | "bomb";

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
  skull:
    "M12 3a7.5 7.5 0 0 0-5 13.1V19a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2.9A7.5 7.5 0 0 0 12 3Zm-3 8.2a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Zm6 0a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4ZM11 17v3m2-3v3",
  grave: "M7 20V9.5a5 5 0 0 1 10 0V20M4 20h16M12 9v6M9.5 11.5h5",
  devour:
    "M4 9c2 3 14 3 16 0M4 9l2 6c3 3 9 3 12 0l2-6M8 10.5l1 2 1-2M14 10.5l1 2 1-2",
  wail: "M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14",
  // Revision 14: a miasma cloud with falling drops, and a bite of two jaws.
  plague:
    "M7.5 15.5a3.5 3.5 0 0 1-.4-7A5 5 0 0 1 16.6 7.6a3.9 3.9 0 0 1 .4 7.9ZM9 18.5v1.5M12.5 18.5v2.5M16 18.5v1.5",
  bite: "M4 8.5l2.7 4.5 2.6-4.5 2.7 4.5 2.7-4.5 2.6 4.5L20 8.5M5.5 18l2.3-3.5 2.4 3.5 1.8-3.5 1.8 3.5 2.4-3.5 2.3 3.5",
  // Revision 17: a goblin head with long sideways ears (the Goblin badge;
  // the eyes are even-odd holes when filled). The Kaboom! bomb is drawn
  // from BOMB_PARTS; this path is only its single-stroke outline.
  goblin:
    "M12 7.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM7.4 10.6 1.8 8.4l5.4 5ZM16.6 10.6l5.6-2.2-5.4 5ZM10 11.2a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2ZM14 11.2a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z",
  bomb: "M14.2 9.6A6.5 6.5 0 1 1 10.4 8M13 7.4l2.4 2.4M14.2 8.6l1.6-1.6c.9-.9 2.2-1.1 3.2-.4M19.5 2.5v2M22 5h-2M21 3.5l-1 1",
};

/** One shape of a multi-part icon; `fill` may be a fixed colour. */
interface IconPartV7 {
  readonly d: string;
  readonly fill: string;
  readonly stroke: string;
  readonly width: number;
}

/**
 * Revision 17 Kaboom! (docs/art/factions/GOBLIN.md: "a round black bomb with
 * a lit cream fuse and a pale spark"): a filled charcoal round body with a
 * light rim and glint in the button's colour, a fuse cap, a short curved
 * fuse, and a four-point pale spark at its tip.
 */
const BOMB_PARTS: readonly IconPartV7[] = [
  {
    d: "M10 7.6a6.9 6.9 0 1 0 0 13.8 6.9 6.9 0 0 0 0-13.8Z",
    fill: "#2b2d33",
    stroke: "currentColor",
    width: 1.6,
  },
  {
    d: "M6.2 13.4a4.2 4.2 0 0 1 2.6-3.1",
    fill: "none",
    stroke: "currentColor",
    width: 1.5,
  },
  {
    d: "M13.1 8.2l2.3-2.3 2 2-2.3 2.3Z",
    fill: "#2b2d33",
    stroke: "currentColor",
    width: 1.3,
  },
  {
    d: "M16.6 6.4c.5-1.7 1.8-2.6 3.3-2.5",
    fill: "none",
    stroke: "currentColor",
    width: 1.6,
  },
  {
    d: "M20.2.4l1.1 2.4 2.4 1.1-2.4 1.1-1.1 2.4-1.1-2.4-2.4-1.1 2.4-1.1Z",
    fill: "#fff8d0",
    stroke: "#2b2d33",
    width: 0.6,
  },
];

const PARTS: Partial<Record<UiIconIdV7, readonly IconPartV7[]>> = {
  bomb: BOMB_PARTS,
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
  const parts = PARTS[id];
  if (parts !== undefined) {
    for (const part of parts) {
      const shape = documentRoot.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      shape.setAttribute("d", part.d);
      shape.setAttribute("fill", part.fill);
      shape.setAttribute("stroke", part.stroke);
      shape.setAttribute("stroke-width", String(part.width));
      shape.setAttribute("stroke-linecap", "round");
      shape.setAttribute("stroke-linejoin", "round");
      svg.append(shape);
    }
    return svg;
  }
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
