import type { FactionIdV7, PlayerViewV7 } from "../../engine/index";
import type { StorageAdapter } from "../../persistence/index";
import {
  chibiFallbackSubjectV7,
  type ArtSubjectV7,
} from "../../assets/chibi-art-v7";
import {
  portraitSubjectV7,
  technologySubjectV7,
} from "../../assets/chibi-ui-art-v7";
import { CanvasBoardHostV7, type BoardHostV7 } from "../canvas/board-host-v7";
import {
  browserChibiRasterEnvironmentV7,
  type ChibiBoardArtV7,
  type ChibiRasterEnvironmentV7,
} from "../canvas/chibi-art-resolver-v7";
import { factionColourV7 } from "../canvas/faction-colours-v7";
import {
  LIVE_DIRECTION_ART_REGISTRY_V7,
  liveBoardLookV7,
} from "../canvas/live-board-look-v7";
import {
  createGalleryArtV7,
  drawGalleryTileV7,
  type GalleryTileRequestV7,
} from "../canvas/gallery-sprite-v7";
import {
  CHIBI_DOM_BOXES_V7,
  browserChibiDomEnvironmentV7,
  chibiDomImageV7,
  createChibiDomArtV7,
  type ChibiDomArtV7,
  type ChibiDomBoxV7,
  type ChibiDomEnvironmentV7,
} from "./chibi-dom-art-v7";
import { uiIconV7, type UiIconIdV7 } from "./ui-icons-v7";
import {
  GALLERY_BUILDING_ROWS_V7,
  GALLERY_FACTIONS_V7,
  GALLERY_FILTERS_STORAGE_KEY_V7,
  GALLERY_UNIT_ROWS_V7,
  galleryBuildingDetailsV7,
  galleryBuildingGroundV7,
  galleryBuildingPerFactionV7,
  galleryBuildingSubjectV7,
  galleryNavalRowV7,
  galleryRowLabelV7,
  galleryUnitCellV7,
  galleryUnitDetailsV7,
  parseGalleryFiltersV7,
  serializeGalleryFiltersV7,
  toggleGalleryFilterV7,
  type GalleryBuildingRowIdV7,
  type GalleryFiltersV7,
  type GalleryTabV7,
  type GalleryUnitCellV7,
  type GalleryUnitRowIdV7,
} from "../gallery-presentation-v7";
import {
  GALLERY_DEMO_CUE_ABILITIES_V7,
  buildGalleryDemoSceneV7,
  galleryDemoCuesV7,
  type GalleryDemoCueV7,
  type GalleryDemoSceneV7,
} from "../gallery-demo-v7";
import { roleAbilityNameV7 } from "../role-presentation-v7";
import { factionNameV7 } from "../undead-presentation-v7";

/**
 * The Gallery screen (bead pulp_wars-ic8, docs/ui/SCREEN_FLOW.md
 * "Gallery"): opened from the front screen, it shows every faction's units
 * (one row per mechanical role, one column per faction) and buildings in
 * the live CHIBI look, with remembered row and column filters, a keyboard
 * grid, and a detail dialog with stats, abilities and an animation preview
 * played by the real board host on a small demo board.
 */

export interface GalleryViewOptionsV7 {
  /** Remembers the filters per viewer; null keeps them for the page only. */
  readonly storage: StorageAdapter | null;
  readonly onBack: () => void;
  /** The viewer's motion preference, read whenever a preview starts. */
  readonly motion: () => "FULL" | "REDUCED";
  /** Raster seams of the sprite tiles (tests); the browser's by default. */
  readonly rasterEnvironment?: ChibiRasterEnvironmentV7;
  /** Raster seams of the portraits and icons; the browser's by default. */
  readonly domEnvironment?: ChibiDomEnvironmentV7;
  /** The animation preview's board host (tests inject a fake). */
  readonly createDemoHost?: () => BoardHostV7;
}

type GalleryDetailV7 =
  | {
      readonly tab: "UNITS";
      readonly row: GalleryUnitRowIdV7;
      readonly faction: FactionIdV7;
    }
  | {
      readonly tab: "BUILDINGS";
      readonly row: GalleryBuildingRowIdV7;
      /** Null for a building every faction shares. */
      readonly faction: FactionIdV7 | null;
    };

type DemoStateV7 = "idle" | "playing" | "done";

/** The table's tile scale and the detail dialog's (CSS px per master px). */
const TABLE_SCALE = 1;
const DETAIL_SCALE = 2;
/** The column emblem: the faction's Fighter portrait. */
const EMBLEM_BOX: ChibiDomBoxV7 = { width: 32, height: 32 };
/** The pause on the idle board before a cue plays (full motion). */
const IDLE_BEFORE_CUE_MS = 450;
/** The preview width (CSS px) from which it zooms in to the play zoom. */
const DEMO_ZOOM_IN_WIDTH = 440;

const STAT_ICONS: Readonly<Record<string, UiIconIdV7>> = {
  HP: "hp",
  ATTACK: "attack",
  DEFENSE: "defense",
  MOVE: "move",
  RANGE: "range",
  SIGHT: "sight",
  SLOTS: "units",
};

function el(
  documentRoot: Document,
  tag: string,
  className: string,
): HTMLElement {
  const node = documentRoot.createElement(tag);
  node.className = className;
  return node;
}

function text(
  documentRoot: Document,
  tag: string,
  value: string,
  className = "",
): HTMLElement {
  const node = el(documentRoot, tag, className);
  node.textContent = value;
  return node;
}

function button(
  documentRoot: Document,
  label: string,
  action: string,
  className = "",
): HTMLButtonElement {
  const node = documentRoot.createElement("button");
  node.type = "button";
  node.className = className;
  node.dataset.action = action;
  node.dataset.focusKey = action;
  node.textContent = label;
  return node;
}

function iconButton(
  documentRoot: Document,
  icon: UiIconIdV7,
  label: string,
  action: string,
  className = "",
): HTMLButtonElement {
  const node = button(documentRoot, "", action, `v7-icon-button ${className}`);
  node.append(uiIconV7(documentRoot, icon));
  node.setAttribute("aria-label", label);
  node.title = label;
  return node;
}

function cellKey(row: string, faction: FactionIdV7 | null): string {
  return `cell:${row}:${faction ?? "ALL"}`;
}

/** A rotated chevron, drawn in CSS-free SVG (the steppers' arrows). */
function chevron(
  documentRoot: Document,
  direction: "LEFT" | "RIGHT" | "UP" | "DOWN",
): SVGSVGElement {
  const svg = documentRoot.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("class", "v7-ui-icon");
  const path = documentRoot.createElementNS(
    "http://www.w3.org/2000/svg",
    "path",
  );
  path.setAttribute(
    "d",
    direction === "LEFT"
      ? "M15 5 8 12l7 7"
      : direction === "RIGHT"
        ? "M9 5l7 7-7 7"
        : direction === "UP"
          ? "M5 15l7-7 7 7"
          : "M5 9l7 7 7-7",
  );
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2.5");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);
  return svg;
}

export class GalleryViewV7 {
  /** The screen; the app view places it in its shell while it is open. */
  readonly root: HTMLElement;
  readonly #document: Document;
  readonly #options: GalleryViewOptionsV7;
  readonly #art: ChibiBoardArtV7;
  readonly #domArt: ChibiDomArtV7;
  #filters: GalleryFiltersV7;
  #content: HTMLElement | null = null;
  #dialog: HTMLElement | null = null;
  #scrim: HTMLElement | null = null;
  #detail: GalleryDetailV7 | null = null;
  /** The grid cell that holds the table's one tab stop. */
  #gridFocusKey: string | null = null;
  #tiles: {
    readonly canvas: HTMLCanvasElement;
    readonly request: GalleryTileRequestV7;
    readonly cell: HTMLElement | null;
  }[] = [];
  #artSlots: {
    readonly slot: HTMLElement;
    readonly subject: ArtSubjectV7;
    readonly box: ChibiDomBoxV7;
    readonly ownerColor: string | undefined;
  }[] = [];
  #redrawQueued = false;
  #demo: GalleryDemoV7 | null = null;
  readonly #scenes = new Map<string, GalleryDemoSceneV7 | null>();
  readonly #cues = new Map<string, readonly GalleryDemoCueV7[]>();
  #destroyed = false;
  /** The filter panel starts open, except on a phone, where it is tall. */
  #filtersOpen: boolean;

  constructor(documentRoot: Document, options: GalleryViewOptionsV7) {
    this.#document = documentRoot;
    this.#options = options;
    this.#filtersOpen =
      documentRoot.defaultView?.matchMedia?.("(max-width: 720px)").matches !==
      true;
    this.root = el(documentRoot, "main", "v7-gallery");
    this.root.dataset.v7Gallery = "true";
    this.root.setAttribute("aria-labelledby", "v7-gallery-title");
    this.root.addEventListener("keydown", this.#onKeyDown);
    let stored: string | null;
    try {
      stored = options.storage?.getItem(GALLERY_FILTERS_STORAGE_KEY_V7) ?? null;
    } catch {
      // Restricted storage: the default filters, kept for this page.
      stored = null;
    }
    this.#filters = parseGalleryFiltersV7(stored);
    this.#art = createGalleryArtV7(
      options.rasterEnvironment ??
        browserChibiRasterEnvironmentV7(documentRoot),
      () => this.#queueRedraw(),
    );
    this.#domArt = createChibiDomArtV7({
      environment:
        options.domEnvironment ?? browserChibiDomEnvironmentV7(documentRoot),
      onChange: () => this.#queueRedraw(),
      preferred: LIVE_DIRECTION_ART_REGISTRY_V7,
    });
    this.#renderContent();
  }

  /** Focuses the screen's first control (Back). */
  focus(): void {
    this.root
      .querySelector<HTMLElement>('[data-action="gallery-back"]')
      ?.focus();
  }

  /** Leaves the screen: the detail closes and its preview stops. */
  suspend(): void {
    this.#closeDetail(false);
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#closeDetail(false);
    this.root.removeEventListener("keydown", this.#onKeyDown);
    this.root.replaceChildren();
  }

  // ---------------------------------------------------------------- state

  #setFilters(next: GalleryFiltersV7): void {
    this.#filters = next;
    try {
      this.#options.storage?.setItem(
        GALLERY_FILTERS_STORAGE_KEY_V7,
        serializeGalleryFiltersV7(next),
      );
    } catch {
      // Restricted storage keeps the choice for this page only.
    }
    this.#renderContent();
  }

  #visibleRows(): readonly string[] {
    return this.#filters.tab === "UNITS"
      ? this.#filters.unitRows
      : this.#filters.buildingRows;
  }

  // ---------------------------------------------------------------- render

  #renderContent(): void {
    if (this.#destroyed) return;
    const active = this.#document.activeElement;
    const focusKey =
      active instanceof HTMLElement && this.#content?.contains(active) === true
        ? (active.dataset.focusKey ?? null)
        : null;
    this.#tiles = this.#tiles.filter(
      (tile) => this.#dialog?.contains(tile.canvas) === true,
    );
    this.#artSlots = this.#artSlots.filter(
      (slot) => this.#dialog?.contains(slot.slot) === true,
    );
    const content = el(this.#document, "div", "v7-gallery-content");
    content.append(this.#header(), this.#tabs(), this.#panel());
    if (this.#dialog !== null) content.setAttribute("inert", "");
    const previous = this.#content;
    this.#content = content;
    if (previous !== null && previous.parentNode === this.root)
      previous.replaceWith(content);
    else this.root.prepend(content);
    if (focusKey !== null)
      content
        .querySelector<HTMLElement>(`[data-focus-key="${focusKey}"]`)
        ?.focus();
    this.#redraw();
  }

  #header(): HTMLElement {
    const header = el(this.#document, "header", "v7-gallery-header");
    const back = button(
      this.#document,
      "",
      "gallery-back",
      "v7-gallery-back back-button",
    );
    back.append(chevron(this.#document, "LEFT"), "Back");
    back.onclick = () => this.#options.onBack();
    const heading = text(this.#document, "h1", "Gallery");
    heading.id = "v7-gallery-title";
    header.append(back, heading);
    return header;
  }

  #tabs(): HTMLElement {
    const list = el(this.#document, "div", "v7-gallery-tabs");
    list.setAttribute("role", "tablist");
    list.setAttribute("aria-label", "Gallery");
    for (const [tab, label] of [
      ["UNITS", "Units"],
      ["BUILDINGS", "Buildings"],
    ] as const) {
      const selected = this.#filters.tab === tab;
      const node = button(
        this.#document,
        label,
        `gallery-tab-${tab.toLowerCase()}`,
        "v7-gallery-tab",
      );
      node.id = `v7-gallery-tab-${tab.toLowerCase()}`;
      node.setAttribute("role", "tab");
      node.setAttribute("aria-selected", String(selected));
      node.setAttribute("aria-controls", "v7-gallery-panel");
      node.tabIndex = selected ? 0 : -1;
      node.onclick = () => {
        if (this.#filters.tab !== tab) this.#selectTab(tab);
      };
      list.append(node);
    }
    list.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      this.#selectTab(this.#filters.tab === "UNITS" ? "BUILDINGS" : "UNITS");
      this.#content
        ?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
        ?.focus();
    });
    return list;
  }

  #selectTab(tab: GalleryTabV7): void {
    this.#gridFocusKey = null;
    this.#setFilters({ ...this.#filters, tab });
  }

  #panel(): HTMLElement {
    const panel = el(this.#document, "div", "v7-gallery-panel");
    panel.id = "v7-gallery-panel";
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute(
      "aria-labelledby",
      `v7-gallery-tab-${this.#filters.tab.toLowerCase()}`,
    );
    panel.dataset.tab = this.#filters.tab.toLowerCase();
    panel.append(this.#filterControls(), this.#table());
    return panel;
  }

  #filterControls(): HTMLElement {
    const details = this.#document.createElement("details");
    details.className = "v7-gallery-filters";
    details.open = this.#filtersOpen;
    details.addEventListener("toggle", () => {
      this.#filtersOpen = details.open;
    });
    const summary = text(this.#document, "summary", "Filters");
    summary.dataset.focusKey = "gallery-filters";
    details.append(summary);
    const factions = this.#filters.factions;
    details.append(
      this.#chipGroup(
        "Factions",
        "factions",
        GALLERY_FACTIONS_V7.map((faction) => ({
          value: faction,
          label: factionNameV7(faction),
          colour: factionColourV7(faction),
        })),
        factions,
        (next) => this.#setFilters({ ...this.#filters, factions: next }),
      ),
    );
    if (this.#filters.tab === "UNITS")
      details.append(
        this.#chipGroup(
          "Units",
          "rows",
          GALLERY_UNIT_ROWS_V7.map((row) => ({
            value: row,
            label: galleryRowLabelV7(row),
          })),
          this.#filters.unitRows,
          (next) =>
            this.#setFilters({
              ...this.#filters,
              unitRows: next as readonly GalleryUnitRowIdV7[],
            }),
        ),
      );
    else
      details.append(
        this.#chipGroup(
          "Buildings",
          "rows",
          GALLERY_BUILDING_ROWS_V7.map((row) => ({
            value: row,
            label: galleryRowLabelV7(row),
          })),
          this.#filters.buildingRows,
          (next) =>
            this.#setFilters({
              ...this.#filters,
              buildingRows: next as readonly GalleryBuildingRowIdV7[],
            }),
        ),
      );
    return details;
  }

  #chipGroup<Value extends string>(
    label: string,
    filter: "factions" | "rows",
    options: readonly {
      readonly value: Value;
      readonly label: string;
      readonly colour?: string;
    }[],
    selected: readonly Value[],
    apply: (next: readonly Value[]) => void,
  ): HTMLElement {
    const group = el(this.#document, "div", "v7-gallery-filter");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", label);
    group.dataset.filter = filter;
    const all = options.map((option) => option.value);
    const heading = el(this.#document, "div", "v7-gallery-filter-heading");
    heading.append(text(this.#document, "span", label));
    for (const [mode, modeLabel] of [
      ["all", "All"],
      ["none", "None"],
    ] as const) {
      const node = button(
        this.#document,
        modeLabel,
        `gallery-${filter}-${mode}`,
        "v7-gallery-filter-mode",
      );
      node.setAttribute("aria-label", `${modeLabel} ${label.toLowerCase()}`);
      node.onclick = () => apply(mode === "all" ? all : []);
      heading.append(node);
    }
    const chips = el(this.#document, "div", "v7-gallery-chips");
    for (const option of options) {
      const pressed = selected.includes(option.value);
      const chip = button(
        this.#document,
        "",
        `gallery-${filter}-toggle`,
        "v7-gallery-chip",
      );
      chip.dataset.value = option.value;
      chip.dataset.focusKey = `chip:${filter}:${option.value}`;
      chip.setAttribute("aria-pressed", String(pressed));
      if (option.colour !== undefined) {
        chip.style.setProperty("--faction", option.colour);
        chip.append(el(this.#document, "span", "v7-gallery-swatch"));
      }
      chip.append(text(this.#document, "span", option.label));
      chip.onclick = () =>
        apply(toggleGalleryFilterV7(selected, option.value, all));
      chips.append(chip);
    }
    group.append(heading, chips);
    return group;
  }

  #table(): HTMLElement {
    const scroll = el(this.#document, "div", "v7-gallery-scroll");
    const factions = this.#filters.factions;
    const rows = this.#visibleRows();
    if (factions.length === 0 || rows.length === 0) {
      scroll.append(
        text(this.#document, "p", "Nothing selected.", "v7-gallery-nothing"),
      );
      return scroll;
    }
    const units = this.#filters.tab === "UNITS";
    const table = el(this.#document, "table", "v7-gallery-table");
    table.setAttribute("role", "grid");
    table.setAttribute("aria-label", units ? "Units" : "Buildings");
    table.setAttribute("aria-rowcount", String(rows.length + 1));
    table.setAttribute("aria-colcount", String(factions.length + 1));
    const head = this.#document.createElement("thead");
    const headRow = this.#document.createElement("tr");
    const corner = el(this.#document, "th", "v7-gallery-corner");
    corner.setAttribute("scope", "col");
    corner.append(
      text(this.#document, "span", units ? "Unit" : "Building", "v7-sr-only"),
    );
    headRow.append(corner);
    for (const faction of factions) {
      const th = el(this.#document, "th", "v7-gallery-faction");
      th.setAttribute("scope", "col");
      th.dataset.faction = faction;
      th.style.setProperty("--faction", factionColourV7(faction));
      const emblem = el(this.#document, "span", "v7-gallery-emblem");
      this.#fillArt(
        emblem,
        portraitSubjectV7("FIGHTER", faction),
        EMBLEM_BOX,
        factionColourV7(faction),
      );
      th.append(emblem, text(this.#document, "span", factionNameV7(faction)));
      headRow.append(th);
    }
    head.append(headRow);
    const body = this.#document.createElement("tbody");
    const keys: string[] = [];
    rows.forEach((row, rowIndex) => {
      const tr = this.#document.createElement("tr");
      tr.dataset.row = row;
      const th = text(
        this.#document,
        "th",
        galleryRowLabelV7(row as GalleryUnitRowIdV7),
        "v7-gallery-row-head",
      );
      th.setAttribute("scope", "row");
      tr.append(th);
      if (units)
        factions.forEach((faction, column) => {
          const cell = galleryUnitCellV7(row as GalleryUnitRowIdV7, faction);
          tr.append(this.#unitCell(cell, rowIndex, column, keys));
        });
      else {
        const building = row as GalleryBuildingRowIdV7;
        if (galleryBuildingPerFactionV7(building))
          factions.forEach((faction, column) =>
            tr.append(
              this.#buildingCell(building, faction, rowIndex, column, 1, keys),
            ),
          );
        else
          tr.append(
            this.#buildingCell(
              building,
              null,
              rowIndex,
              0,
              factions.length,
              keys,
            ),
          );
      }
      body.append(tr);
    });
    if (this.#gridFocusKey === null || !keys.includes(this.#gridFocusKey))
      this.#gridFocusKey = keys[0] ?? null;
    for (const node of body.querySelectorAll<HTMLElement>("[data-grid-row]"))
      node.tabIndex = node.dataset.focusKey === this.#gridFocusKey ? 0 : -1;
    table.append(head, body);
    table.addEventListener("keydown", this.#onGridKeyDown);
    table.addEventListener("focusin", (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.dataset.gridRow !== undefined)
        this.#moveGridStop(target);
    });
    scroll.append(table);
    return scroll;
  }

  #unitCell(
    cell: GalleryUnitCellV7,
    row: number,
    column: number,
    keys: string[],
  ): HTMLElement {
    const td = el(this.#document, "td", "v7-gallery-cell-wrap");
    td.setAttribute("role", "gridcell");
    td.dataset.faction = cell.faction;
    if (cell.kind === "EMPTY") {
      td.classList.add("is-empty");
      td.append(text(this.#document, "span", "—", "v7-gallery-none"));
      td.setAttribute("aria-label", "None");
      return td;
    }
    const key = cellKey(cell.row, cell.faction);
    keys.push(key);
    const node = button(
      this.#document,
      "",
      "gallery-open-unit",
      "v7-gallery-cell",
    );
    node.dataset.focusKey = key;
    node.dataset.row = cell.row;
    node.dataset.faction = cell.faction;
    node.dataset.gridRow = String(row);
    node.dataset.gridColumn = String(column);
    node.style.setProperty("--faction", factionColourV7(cell.faction));
    node.setAttribute(
      "aria-label",
      `${cell.name}, ${factionNameV7(cell.faction)}`,
    );
    const canvas = this.#tile(
      {
        subject: cell.subject,
        ground: galleryNavalRowV7(cell.row)
          ? "TERRAIN:SHALLOW_WATER"
          : "TERRAIN:GRASS",
        ownerColor: factionColourV7(cell.faction),
        scale: TABLE_SCALE,
      },
      node,
    );
    const standIn = text(this.#document, "span", "Shared", "v7-gallery-shared");
    standIn.hidden = true;
    node.append(
      canvas,
      text(this.#document, "span", cell.name, "v7-gallery-cell-name"),
      standIn,
    );
    node.onclick = () =>
      this.#openDetail({ tab: "UNITS", row: cell.row, faction: cell.faction });
    td.append(node);
    return td;
  }

  #buildingCell(
    row: GalleryBuildingRowIdV7,
    faction: FactionIdV7 | null,
    rowIndex: number,
    column: number,
    span: number,
    keys: string[],
  ): HTMLElement {
    const td = el(this.#document, "td", "v7-gallery-cell-wrap");
    td.setAttribute("role", "gridcell");
    if (span > 1) {
      td.setAttribute("colspan", String(span));
      td.classList.add("is-shared");
    }
    const key = cellKey(row, faction);
    keys.push(key);
    const name = galleryRowLabelV7(row);
    const node = button(
      this.#document,
      "",
      "gallery-open-building",
      "v7-gallery-cell",
    );
    node.dataset.focusKey = key;
    node.dataset.row = row;
    node.dataset.faction = faction ?? "ALL";
    node.dataset.gridRow = String(rowIndex);
    node.dataset.gridColumn = String(column);
    node.dataset.gridSpan = String(span);
    if (faction !== null)
      node.style.setProperty("--faction", factionColourV7(faction));
    node.setAttribute(
      "aria-label",
      faction === null
        ? `${name}, every faction`
        : `${name}, ${factionNameV7(faction)}`,
    );
    const canvas = this.#tile(
      {
        subject: galleryBuildingSubjectV7(row, faction ?? "ORIGINAL"),
        ground: galleryBuildingGroundV7(row),
        ownerColor: faction === null ? undefined : factionColourV7(faction),
        scale: TABLE_SCALE,
      },
      node,
    );
    node.append(
      canvas,
      text(this.#document, "span", name, "v7-gallery-cell-name"),
    );
    node.onclick = () => this.#openDetail({ tab: "BUILDINGS", row, faction });
    td.append(node);
    return td;
  }

  #tile(request: GalleryTileRequestV7, cell: HTMLElement | null): HTMLElement {
    const canvas = this.#document.createElement("canvas");
    canvas.className = "v7-gallery-tile";
    canvas.setAttribute("aria-hidden", "true");
    canvas.dataset.subject = request.subject;
    this.#tiles.push({ canvas, request, cell });
    // Keep the box while rasters load (drawGalleryTileV7 sizes it).
    canvas.style.width = `${96 * request.scale}px`;
    canvas.style.height = `${112 * request.scale}px`;
    return canvas;
  }

  #fillArt(
    slot: HTMLElement,
    subject: ArtSubjectV7,
    box: ChibiDomBoxV7,
    ownerColor: string | undefined,
  ): void {
    this.#artSlots.push({ slot, subject, box, ownerColor });
    this.#drawArtSlot(slot, subject, box, ownerColor);
  }

  #drawArtSlot(
    slot: HTMLElement,
    subject: ArtSubjectV7,
    box: ChibiDomBoxV7,
    ownerColor: string | undefined,
  ): void {
    const resolution = this.#domArt.resolve({ subject, ownerColor });
    if (resolution.kind === "MISSING") {
      slot.replaceChildren();
      return;
    }
    const current = slot.firstElementChild;
    if (
      resolution.kind === "READY" &&
      current instanceof HTMLImageElement &&
      current.dataset.chibiAssetId === resolution.asset.id
    )
      return;
    slot.replaceChildren(
      chibiDomImageV7(this.#document, resolution, box, subject),
    );
  }

  #queueRedraw(): void {
    if (this.#redrawQueued || this.#destroyed) return;
    this.#redrawQueued = true;
    queueMicrotask(() => {
      this.#redrawQueued = false;
      this.#redraw();
    });
  }

  #redraw(): void {
    if (this.#destroyed) return;
    const dpr = this.#document.defaultView?.devicePixelRatio ?? 1;
    for (const tile of this.#tiles) {
      const state = drawGalleryTileV7(
        tile.canvas,
        this.#art,
        tile.request,
        dpr,
      );
      tile.canvas.dataset.state = state.kind.toLowerCase();
      // A faction's piece drawn with the shared stand-in art is marked.
      const standIn =
        state.kind === "READY" &&
        !state.factionArt &&
        chibiFallbackSubjectV7(tile.request.subject) !== null;
      if (tile.cell !== null) {
        tile.cell.dataset.standIn = String(standIn);
        const badge =
          tile.cell.querySelector<HTMLElement>(".v7-gallery-shared");
        if (badge !== null) badge.hidden = !standIn;
      }
    }
    for (const slot of this.#artSlots)
      this.#drawArtSlot(slot.slot, slot.subject, slot.box, slot.ownerColor);
  }

  // ---------------------------------------------------------------- grid

  #moveGridStop(target: HTMLElement): void {
    const key = target.dataset.focusKey ?? null;
    if (key === null || key === this.#gridFocusKey) return;
    this.#gridFocusKey = key;
    for (const node of this.#content?.querySelectorAll<HTMLElement>(
      "[data-grid-row]",
    ) ?? [])
      node.tabIndex = node === target ? 0 : -1;
  }

  readonly #onGridKeyDown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (
      !(target instanceof HTMLElement) ||
      target.dataset.gridRow === undefined
    )
      return;
    const moves: Readonly<Record<string, readonly [number, number]>> = {
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
    };
    const cells = [
      ...(this.#content?.querySelectorAll<HTMLElement>("[data-grid-row]") ??
        []),
    ];
    const at = (node: HTMLElement) => ({
      row: Number(node.dataset.gridRow),
      column: Number(node.dataset.gridColumn),
      span: Number(node.dataset.gridSpan ?? "1"),
    });
    const covers = (node: HTMLElement, row: number, column: number) => {
      const place = at(node);
      return (
        place.row === row &&
        column >= place.column &&
        column < place.column + place.span
      );
    };
    const here = at(target);
    let next: HTMLElement | undefined;
    const move = moves[event.key];
    if (move !== undefined) {
      const rows = Math.max(...cells.map((node) => at(node).row)) + 1;
      const columns = this.#filters.factions.length;
      let row = here.row;
      let column = move[1] < 0 ? here.column : here.column + here.span - 1;
      if (move[0] !== 0) column = here.column;
      for (;;) {
        row += move[0];
        column += move[1];
        if (row < 0 || row >= rows || column < 0 || column >= columns) break;
        next = cells.find(
          (node) => node !== target && covers(node, row, column),
        );
        if (next !== undefined) break;
      }
    } else if (event.key === "Home" || event.key === "End") {
      const inRow = cells.filter((node) => at(node).row === here.row);
      next = event.key === "Home" ? inRow[0] : inRow.at(-1);
    } else return;
    event.preventDefault();
    if (next !== undefined) {
      this.#moveGridStop(next);
      next.focus();
    }
  };

  // ---------------------------------------------------------------- detail

  #openDetail(detail: GalleryDetailV7): void {
    this.#detail = detail;
    this.#gridFocusKey = cellKey(detail.row, detail.faction);
    this.#renderDetail();
    this.#dialog
      ?.querySelector<HTMLElement>('[data-action="gallery-detail-close"]')
      ?.focus();
  }

  #closeDetail(returnFocus: boolean): void {
    this.#demo?.destroy();
    this.#demo = null;
    const detail = this.#detail;
    this.#detail = null;
    this.#dialog?.remove();
    this.#scrim?.remove();
    this.#dialog = null;
    this.#scrim = null;
    this.#tiles = this.#tiles.filter(
      (tile) => this.#content?.contains(tile.canvas) === true,
    );
    this.#artSlots = this.#artSlots.filter(
      (slot) => this.#content?.contains(slot.slot) === true,
    );
    this.#content?.removeAttribute("inert");
    if (returnFocus && detail !== null) {
      const key = cellKey(detail.row, detail.faction);
      // Stepping may have reached a cell the filters hide: the table
      // keeps its focus stop then.
      this.#content
        ?.querySelector<HTMLElement>(`[data-focus-key="${key}"]`)
        ?.focus();
    }
  }

  /** The detail's neighbours along its row (factions) and column (rows). */
  #neighbours(detail: GalleryDetailV7): {
    readonly previousFaction: GalleryDetailV7 | null;
    readonly nextFaction: GalleryDetailV7 | null;
    readonly previousRow: GalleryDetailV7 | null;
    readonly nextRow: GalleryDetailV7 | null;
  } {
    const factions =
      this.#filters.factions.length > 0
        ? this.#filters.factions
        : GALLERY_FACTIONS_V7;
    const along = (step: -1 | 1): GalleryDetailV7 | null => {
      if (detail.faction === null) return null;
      const index = factions.indexOf(detail.faction);
      for (let i = index + step; i >= 0 && i < factions.length; i += step) {
        const faction = factions[i] as FactionIdV7;
        if (
          detail.tab === "UNITS" &&
          galleryUnitCellV7(detail.row, faction).kind === "EMPTY"
        )
          continue;
        return { ...detail, faction } as GalleryDetailV7;
      }
      return null;
    };
    const down = (step: -1 | 1): GalleryDetailV7 | null => {
      const visible = this.#visibleRows();
      const rows =
        visible.length > 0
          ? visible
          : detail.tab === "UNITS"
            ? GALLERY_UNIT_ROWS_V7
            : GALLERY_BUILDING_ROWS_V7;
      const index = rows.indexOf(detail.row);
      for (let i = index + step; i >= 0 && i < rows.length; i += step) {
        if (detail.tab === "UNITS") {
          const row = rows[i] as GalleryUnitRowIdV7;
          if (galleryUnitCellV7(row, detail.faction).kind === "EMPTY") continue;
          return { tab: "UNITS", row, faction: detail.faction };
        }
        const row = rows[i] as GalleryBuildingRowIdV7;
        const perFaction = galleryBuildingPerFactionV7(row);
        return {
          tab: "BUILDINGS",
          row,
          faction: perFaction
            ? (detail.faction ?? factions[0] ?? "ORIGINAL")
            : null,
        };
      }
      return null;
    };
    return {
      previousFaction: along(-1),
      nextFaction: along(1),
      previousRow: down(-1),
      nextRow: down(1),
    };
  }

  #renderDetail(): void {
    const detail = this.#detail;
    if (detail === null) return;
    const active = this.#document.activeElement;
    const focusAction =
      active instanceof HTMLElement && this.#dialog?.contains(active) === true
        ? (active.dataset.action ?? null)
        : null;
    this.#demo?.destroy();
    this.#demo = null;
    this.#tiles = this.#tiles.filter(
      (tile) => this.#content?.contains(tile.canvas) === true,
    );
    this.#artSlots = this.#artSlots.filter(
      (slot) => this.#content?.contains(slot.slot) === true,
    );
    const faction = detail.faction;
    const colour = faction === null ? undefined : factionColourV7(faction);
    const dialog = el(this.#document, "section", "v7-gallery-detail");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "v7-gallery-detail-title");
    dialog.dataset.v7Region = "gallery-detail";
    dialog.dataset.tab = detail.tab.toLowerCase();
    dialog.dataset.row = detail.row;
    dialog.dataset.faction = faction ?? "ALL";
    if (colour !== undefined) dialog.style.setProperty("--faction", colour);
    const close = iconButton(
      this.#document,
      "close",
      "Close",
      "gallery-detail-close",
      "close-button",
    );
    close.onclick = () => this.#closeDetail(true);
    dialog.append(close);
    if (detail.tab === "UNITS") this.#unitDetail(dialog, detail);
    else this.#buildingDetail(dialog, detail);
    const scrim = el(this.#document, "div", "v7-scrim v7-gallery-scrim");
    scrim.dataset.dismissable = "true";
    scrim.setAttribute("aria-hidden", "true");
    scrim.onclick = () => this.#closeDetail(true);
    this.#dialog?.remove();
    this.#scrim?.remove();
    this.#dialog = dialog;
    this.#scrim = scrim;
    this.#content?.setAttribute("inert", "");
    this.root.append(scrim, dialog);
    this.#redraw();
    if (detail.tab === "UNITS") this.#startDemo(dialog, detail);
    if (focusAction !== null)
      (
        dialog.querySelector<HTMLElement>(
          `[data-action="${focusAction}"]:not(:disabled)`,
        ) ?? close
      ).focus();
  }

  #detailHeader(
    dialog: HTMLElement,
    input: {
      readonly name: string;
      readonly factionName: string | null;
      readonly kicker: string;
      readonly tile: GalleryTileRequestV7;
      readonly portrait: ArtSubjectV7 | null;
    },
  ): void {
    const header = el(this.#document, "header", "v7-gallery-detail-header");
    const stage = el(this.#document, "div", "v7-gallery-detail-stage");
    stage.append(this.#tile(input.tile, null));
    const titles = el(this.#document, "div", "v7-gallery-detail-titles");
    if (input.factionName !== null) {
      const faction = el(this.#document, "p", "v7-gallery-detail-faction");
      faction.append(
        el(this.#document, "span", "v7-gallery-swatch"),
        text(this.#document, "span", input.factionName),
      );
      titles.append(faction);
    }
    const heading = text(this.#document, "h2", input.name);
    heading.id = "v7-gallery-detail-title";
    titles.append(heading);
    // The transport and the Egg are their own row: no kicker repeats them.
    if (input.kicker !== input.name)
      titles.append(
        text(this.#document, "p", input.kicker, "v7-gallery-detail-kicker"),
      );
    header.append(stage, titles);
    if (input.portrait !== null) {
      const portrait = el(this.#document, "span", "v7-gallery-portrait");
      this.#fillArt(
        portrait,
        input.portrait,
        CHIBI_DOM_BOXES_V7.card,
        this.#detail?.faction === null || this.#detail?.faction === undefined
          ? undefined
          : factionColourV7(this.#detail.faction),
      );
      header.append(portrait);
    }
    dialog.append(header, this.#stepper());
  }

  #stepper(): HTMLElement {
    const detail = this.#detail;
    const nav = el(this.#document, "nav", "v7-gallery-stepper");
    nav.setAttribute("aria-label", "Browse");
    if (detail === null) return nav;
    const neighbours = this.#neighbours(detail);
    const name = (target: GalleryDetailV7 | null, kind: "FACTION" | "ROW") =>
      target === null
        ? ""
        : kind === "FACTION"
          ? target.faction === null
            ? ""
            : factionNameV7(target.faction)
          : galleryRowLabelV7(target.row);
    for (const [action, label, target, direction, kind] of [
      [
        "gallery-previous-faction",
        "Previous faction",
        neighbours.previousFaction,
        "LEFT",
        "FACTION",
      ],
      [
        "gallery-next-faction",
        "Next faction",
        neighbours.nextFaction,
        "RIGHT",
        "FACTION",
      ],
      [
        "gallery-previous-row",
        detail.tab === "UNITS" ? "Previous unit" : "Previous building",
        neighbours.previousRow,
        "UP",
        "ROW",
      ],
      [
        "gallery-next-row",
        detail.tab === "UNITS" ? "Next unit" : "Next building",
        neighbours.nextRow,
        "DOWN",
        "ROW",
      ],
    ] as const) {
      const node = button(this.#document, "", action, "v7-gallery-step");
      node.append(chevron(this.#document, direction));
      const targetName = name(target, kind);
      node.setAttribute(
        "aria-label",
        targetName === "" ? label : `${label}: ${targetName}`,
      );
      node.title = node.getAttribute("aria-label") ?? label;
      node.disabled = target === null;
      node.onclick = () => {
        if (target === null) return;
        this.#detail = target;
        this.#gridFocusKey = cellKey(target.row, target.faction);
        this.#renderDetail();
      };
      nav.append(node);
    }
    return nav;
  }

  #unitDetail(
    dialog: HTMLElement,
    detail: Extract<GalleryDetailV7, { readonly tab: "UNITS" }>,
  ): void {
    const cell = galleryUnitCellV7(detail.row, detail.faction);
    if (cell.kind === "EMPTY") return;
    const details = galleryUnitDetailsV7(cell);
    this.#detailHeader(dialog, {
      name: details.name,
      factionName: details.factionName,
      kicker:
        details.tacticalRole === null
          ? details.roleName
          : `${details.roleName} · ${details.tacticalRole}`,
      tile: {
        subject: cell.subject,
        ground: galleryNavalRowV7(cell.row)
          ? "TERRAIN:SHALLOW_WATER"
          : "TERRAIN:GRASS",
        ownerColor: factionColourV7(cell.faction),
        scale: DETAIL_SCALE,
      },
      portrait: cell.portrait,
    });
    const body = el(this.#document, "div", "v7-gallery-detail-body");
    const facts = el(this.#document, "div", "v7-gallery-facts");
    facts.append(this.#costLine(details.cost, details.costNote));
    if (details.stats.length > 0) {
      const stats = el(this.#document, "dl", "v7-unit-stats v7-gallery-stats");
      for (const stat of details.stats) {
        const row = el(this.#document, "div", "v7-stat");
        row.dataset.stat = stat.label.toLowerCase();
        row.title = stat.label;
        const term = el(this.#document, "dt", "v7-stat-term");
        term.append(
          uiIconV7(
            this.#document,
            STAT_ICONS[stat.label.toUpperCase()] ?? "info",
          ),
          text(this.#document, "span", stat.label, "v7-sr-only"),
        );
        row.append(term, text(this.#document, "dd", stat.value));
        stats.append(row);
      }
      facts.append(stats);
    }
    if (details.technology !== null)
      facts.append(
        this.#technologyLine(
          details.technology.name,
          technologySubjectV7(details.technology.id, detail.faction),
        ),
      );
    if (details.abilities.length > 0) {
      const list = el(this.#document, "ul", "v7-gallery-abilities");
      for (const ability of details.abilities) {
        const item = el(this.#document, "li", "v7-gallery-ability");
        item.dataset.ability = ability.id;
        item.append(
          text(this.#document, "strong", ability.name),
          text(this.#document, "span", ability.description),
        );
        list.append(item);
      }
      facts.append(list);
    }
    if (details.notes.length > 0) {
      const notes = el(this.#document, "ul", "v7-gallery-notes");
      for (const note of details.notes)
        notes.append(text(this.#document, "li", note));
      facts.append(notes);
    }
    body.append(facts);
    const preview = cell.role !== null && this.#unitCues(detail).length > 0;
    if (preview) body.prepend(this.#demoSection(detail));
    dialog.dataset.preview = String(preview);
    dialog.append(body);
  }

  #buildingDetail(
    dialog: HTMLElement,
    detail: Extract<GalleryDetailV7, { readonly tab: "BUILDINGS" }>,
  ): void {
    const details = galleryBuildingDetailsV7(detail.row, detail.faction);
    this.#detailHeader(dialog, {
      name: details.name,
      factionName: details.factionName,
      kicker: detail.faction === null ? "Every faction" : "Building",
      tile: {
        subject: galleryBuildingSubjectV7(
          detail.row,
          detail.faction ?? "ORIGINAL",
        ),
        ground: galleryBuildingGroundV7(detail.row),
        ownerColor:
          detail.faction === null ? undefined : factionColourV7(detail.faction),
        scale: DETAIL_SCALE,
      },
      portrait: null,
    });
    const body = el(this.#document, "div", "v7-gallery-detail-body");
    const facts = el(this.#document, "div", "v7-gallery-facts");
    if (details.cost !== null) facts.append(this.#costLine(details.cost, null));
    facts.append(
      text(this.#document, "p", details.description, "v7-gallery-description"),
    );
    if (details.effects.length > 0) {
      const list = el(this.#document, "ul", "v7-gallery-abilities");
      for (const effect of details.effects)
        list.append(text(this.#document, "li", effect, "v7-gallery-ability"));
      facts.append(list);
    }
    if (details.technology !== null)
      facts.append(
        this.#technologyLine(
          details.technology.name,
          technologySubjectV7(
            details.technology.id,
            detail.faction ?? "ORIGINAL",
          ),
        ),
      );
    body.append(facts);
    dialog.append(body);
  }

  #costLine(cost: number | null, note: string | null): HTMLElement {
    const line = el(this.#document, "p", "v7-gallery-cost");
    if (cost !== null) {
      const icon = el(this.#document, "span", "v7-gallery-coin");
      this.#fillArt(
        icon,
        "ICON:HUD:COIN",
        { width: 20, height: 20 },
        undefined,
      );
      line.append(
        icon,
        text(this.#document, "span", "Cost", "v7-sr-only"),
        text(this.#document, "span", String(cost)),
      );
    } else if (note !== null) line.append(note);
    line.hidden = cost === null && note === null;
    return line;
  }

  #technologyLine(name: string, subject: ArtSubjectV7): HTMLElement {
    const line = el(this.#document, "p", "v7-gallery-tech");
    line.title = "Technology";
    const icon = el(this.#document, "span", "v7-gallery-tech-icon");
    this.#fillArt(icon, subject, { width: 28, height: 28 }, undefined);
    line.append(
      icon,
      text(this.#document, "span", "Technology:", "v7-sr-only"),
      text(this.#document, "span", name),
    );
    return line;
  }

  // ---------------------------------------------------------------- preview

  #unitCues(
    detail: Extract<GalleryDetailV7, { readonly tab: "UNITS" }>,
  ): readonly GalleryDemoCueV7[] {
    const cell = galleryUnitCellV7(detail.row, detail.faction);
    if (cell.kind === "EMPTY" || cell.role === null) return [];
    const key = `${detail.faction}:${cell.role}`;
    let cues = this.#cues.get(key);
    if (cues === undefined) {
      cues = galleryDemoCuesV7(detail.faction, cell.role);
      this.#cues.set(key, cues);
    }
    return cues;
  }

  #scene(
    faction: FactionIdV7,
    role: GalleryUnitRowIdV7,
    cue: GalleryDemoCueV7,
  ): GalleryDemoSceneV7 | null {
    if (role === "TRANSPORT" || role === "EGG") return null;
    const key = `${faction}:${role}:${cue}`;
    if (!this.#scenes.has(key))
      this.#scenes.set(key, buildGalleryDemoSceneV7(faction, role, cue));
    return this.#scenes.get(key) ?? null;
  }

  #demoSection(
    detail: Extract<GalleryDetailV7, { readonly tab: "UNITS" }>,
  ): HTMLElement {
    const section = el(this.#document, "div", "v7-gallery-demo");
    section.dataset.demoState = "idle";
    const board = el(this.#document, "div", "v7-gallery-demo-board");
    board.setAttribute("aria-hidden", "true");
    const controls = el(this.#document, "div", "v7-gallery-demo-controls");
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Animations");
    for (const cue of this.#unitCues(detail)) {
      const node = button(
        this.#document,
        roleAbilityNameV7(GALLERY_DEMO_CUE_ABILITIES_V7[cue], detail.faction),
        `gallery-cue-${cue.toLowerCase().replaceAll("_", "-")}`,
        "v7-gallery-cue",
      );
      node.dataset.cue = cue;
      node.setAttribute("aria-pressed", "false");
      node.onclick = () => void this.#demo?.play(cue);
      controls.append(node);
    }
    const replay = button(
      this.#document,
      "Replay",
      "gallery-replay",
      "v7-gallery-replay",
    );
    replay.prepend(
      text(this.#document, "span", "↻", "v7-gallery-replay-glyph"),
    );
    replay
      .querySelector(".v7-gallery-replay-glyph")
      ?.setAttribute("aria-hidden", "true");
    replay.onclick = () => void this.#demo?.replay();
    controls.append(replay);
    section.append(board, controls);
    return section;
  }

  #startDemo(
    dialog: HTMLElement,
    detail: Extract<GalleryDetailV7, { readonly tab: "UNITS" }>,
  ): void {
    const section = dialog.querySelector<HTMLElement>(".v7-gallery-demo");
    const board = section?.querySelector<HTMLElement>(".v7-gallery-demo-board");
    const cues = this.#unitCues(detail);
    const first = cues[0];
    if (
      section === null ||
      section === undefined ||
      board === null ||
      board === undefined ||
      first === undefined
    )
      return;
    const scenes = (cue: GalleryDemoCueV7) =>
      this.#scene(detail.faction, detail.row, cue);
    const host =
      this.#options.createDemoHost?.() ?? new CanvasBoardHostV7(this.#document);
    const motion = this.#options.motion();
    this.#demo = new GalleryDemoV7({
      documentRoot: this.#document,
      host,
      container: board,
      section,
      key: `gallery:${detail.faction}:${detail.row}`,
      scenes,
      first,
      motion,
    });
    // Full motion plays the first cue at once; reduced motion shows the
    // ready unit and waits for a cue to be chosen.
    if (motion === "FULL") void this.#demo.play(first);
  }

  // ---------------------------------------------------------------- keys

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    if (this.#dialog !== null) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        this.#closeDetail(true);
        return;
      }
      if (event.key === "Tab") {
        this.#trapFocus(event, this.#dialog);
        return;
      }
      const steps: Readonly<Record<string, string>> = {
        ArrowLeft: "gallery-previous-faction",
        ArrowRight: "gallery-next-faction",
        ArrowUp: "gallery-previous-row",
        ArrowDown: "gallery-next-row",
      };
      const action = steps[event.key];
      if (action !== undefined) {
        const step = this.#dialog.querySelector<HTMLButtonElement>(
          `[data-action="${action}"]`,
        );
        if (step !== null && !step.disabled) {
          event.preventDefault();
          step.click();
        }
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.#options.onBack();
    }
  };

  #trapFocus(event: KeyboardEvent, dialog: HTMLElement): void {
    const focusable = [
      ...dialog.querySelectorAll<HTMLElement>(
        "button:not(:disabled), [href], [tabindex]:not([tabindex='-1'])",
      ),
    ];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (first === undefined || last === undefined) return;
    const active = this.#document.activeElement;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (active === last || !dialog.contains(active))
    ) {
      event.preventDefault();
      first.focus();
    }
  }
}

/**
 * The animation preview of one unit: the board host on the demo board, the
 * cue buttons' state and the play/stop sequencing. Each play starts from
 * the cue's "before" board; stopping (another cue, Replay, closing the
 * detail, stepping to another unit) finishes the running presentation.
 */
class GalleryDemoV7 {
  readonly #document: Document;
  readonly #section: HTMLElement;
  readonly #container: HTMLElement;
  readonly #key: string;
  readonly #scenes: (cue: GalleryDemoCueV7) => GalleryDemoSceneV7 | null;
  readonly #motion: "FULL" | "REDUCED";
  readonly #host: BoardHostV7;
  #cue: GalleryDemoCueV7;
  #token = 0;
  #destroyed = false;

  constructor(input: {
    readonly documentRoot: Document;
    readonly host: BoardHostV7;
    readonly container: HTMLElement;
    readonly section: HTMLElement;
    readonly key: string;
    readonly scenes: (cue: GalleryDemoCueV7) => GalleryDemoSceneV7 | null;
    readonly first: GalleryDemoCueV7;
    readonly motion: "FULL" | "REDUCED";
  }) {
    this.#document = input.documentRoot;
    this.#section = input.section;
    this.#container = input.container;
    this.#key = input.key;
    this.#scenes = input.scenes;
    this.#motion = input.motion;
    this.#cue = input.first;
    this.#host = input.host;
    this.#host.mount(this.#container, {
      onSelection: () => undefined,
      onCommand: () => undefined,
    });
    // The preview is a picture: no tab stop, nothing read out.
    for (const canvas of this.#container.querySelectorAll("canvas")) {
      canvas.tabIndex = -1;
      canvas.setAttribute("aria-hidden", "true");
    }
    this.#show(this.#cue, "before");
    // The normal play zoom where the preview is wide enough for the unit,
    // its target and its city; the fitted (smallest) zoom on a phone.
    if (this.#container.getBoundingClientRect().width >= DEMO_ZOOM_IN_WIDTH)
      this.#host.zoom("IN");
    this.#sync("idle");
  }

  #model(
    view: PlayerViewV7,
    commands: GalleryDemoSceneV7["offeredCommands"],
  ): Parameters<BoardHostV7["update"]>[0] {
    return {
      matchInstanceId: this.#key,
      view,
      offeredCommands: commands,
      interaction: {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      },
      interactive: false,
      showCursor: false,
      motion: this.#motion,
      animationSpeed: "NORMAL",
      presentationPaused: false,
      highContrast: false,
      artSet: "CHIBI",
      ...liveBoardLookV7("CHIBI"),
    };
  }

  #show(cue: GalleryDemoCueV7, moment: "before" | "after"): void {
    const scene = this.#scenes(cue);
    if (scene === null || this.#destroyed) return;
    this.#host.update(
      moment === "before"
        ? this.#model(scene.before, scene.offeredCommands)
        : this.#model(scene.after, scene.afterCommands),
    );
  }

  #sync(state: DemoStateV7): void {
    this.#section.dataset.demoState = state;
    this.#section.dataset.demoCue = this.#cue.toLowerCase();
    for (const node of this.#section.querySelectorAll<HTMLElement>(
      "[data-cue]",
    ))
      node.setAttribute("aria-pressed", String(node.dataset.cue === this.#cue));
  }

  async play(cue: GalleryDemoCueV7): Promise<void> {
    if (this.#destroyed) return;
    this.stop();
    const token = this.#token;
    this.#cue = cue;
    this.#sync("playing");
    const host = this.#host;
    const scene = this.#scenes(cue);
    if (scene === null) {
      this.#sync("idle");
      return;
    }
    this.#show(cue, "before");
    if (this.#motion === "FULL") {
      await new Promise<void>((resolve) => {
        const browser = this.#document.defaultView;
        if (browser === null) resolve();
        else browser.setTimeout(resolve, IDLE_BEFORE_CUE_MS);
      });
      if (token !== this.#token) return;
    }
    await host.presentBoundary?.(scene.before, scene.after, scene.events);
    if (token !== this.#token) return;
    this.#show(cue, "after");
    this.#sync("done");
  }

  replay(): Promise<void> {
    return this.play(this.#cue);
  }

  /** Finishes the running cue; the board keeps its current picture. */
  stop(): void {
    this.#token += 1;
    this.#host.finishPresentations?.();
    if (!this.#destroyed) this.#sync("idle");
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.stop();
    this.#destroyed = true;
    this.#section.dataset.demoState = "stopped";
    this.#host.destroy();
  }
}
