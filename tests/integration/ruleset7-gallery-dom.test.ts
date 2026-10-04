// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bootstrapRuleset7App } from "../../src/app/index";
import type {
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import { FACTION_IDS_V7, type PlayerViewV7 } from "../../src/engine/index";
import { GALLERY_FILTERS_STORAGE_KEY_V7 } from "../../src/render/gallery-presentation-v7";
import { SETTINGS_STORAGE_KEY } from "../../src/persistence/index";

/**
 * The Gallery (bead pulp_wars-ic8, docs/ui/SCREEN_FLOW.md "Gallery"): the
 * front screen's entry, the unit and building tables, the remembered
 * filters, the keyboard grid and the detail dialog with its preview.
 */

/** A board host that records the preview's calls and finishes on demand. */
class FakeDemoHost implements BoardHostV7 {
  readonly updates: BoardHostModelV7[] = [];
  readonly presented: { before: PlayerViewV7; after: PlayerViewV7 }[] = [];
  mounted = false;
  destroyed = false;
  finished = 0;
  #resolve: (() => void) | null = null;
  mount(container: HTMLElement): void {
    this.mounted = true;
    container.append(document.createElement("canvas"));
  }
  update(model: BoardHostModelV7): void {
    this.updates.push(model);
  }
  activate(): void {}
  zoom(): void {}
  focus(): void {}
  presentBoundary(before: PlayerViewV7, after: PlayerViewV7): Promise<void> {
    this.presented.push({ before, after });
    return new Promise((resolve) => {
      this.#resolve = resolve;
    });
  }
  finishPresentations(): void {
    this.finished += 1;
    this.complete();
  }
  complete(): void {
    const resolve = this.#resolve;
    this.#resolve = null;
    resolve?.();
  }
  destroy(): void {
    this.destroyed = true;
  }
}

let hosts: FakeDemoHost[] = [];
let app: ReturnType<typeof bootstrapRuleset7App> | null = null;

function mount(): ReturnType<typeof bootstrapRuleset7App> {
  app = bootstrapRuleset7App(document, {
    storage: null,
    settingsStorage: window.localStorage,
    galleryDemoHost: () => {
      const host = new FakeDemoHost();
      hosts.push(host);
      return host;
    },
  });
  return app;
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
  hosts = [];
});

afterEach(() => {
  app?.destroy();
  app = null;
});

function required<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}

function openGallery(): void {
  required<HTMLButtonElement>('[data-action="gallery"]').click();
  required("[data-v7-gallery]");
}

function cell(row: string, faction: string): HTMLButtonElement {
  return required<HTMLButtonElement>(
    `.v7-gallery-cell[data-row="${row}"][data-faction="${faction}"]`,
  );
}

function key(target: Element, value: string): void {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key: value, bubbles: true }),
  );
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Condition not reached");
}

describe("Ruleset 7 Gallery", () => {
  it("opens from the front screen and returns to it", () => {
    mount();
    const entry = required<HTMLButtonElement>('[data-action="gallery"]');
    expect(entry.textContent).toBe("Gallery");
    openGallery();
    expect(document.querySelector("[data-v7-setup]")).toBeNull();
    expect(required("#v7-gallery-title").textContent).toBe("Gallery");
    expect(document.activeElement).toBe(
      required('[data-action="gallery-back"]'),
    );
    required<HTMLButtonElement>('[data-action="gallery-back"]').click();
    required("[data-v7-setup]");
    expect(document.activeElement).toBe(required('[data-action="gallery"]'));
    // Escape on the Gallery also goes back.
    openGallery();
    key(required('[data-action="gallery-back"]'), "Escape");
    required("[data-v7-setup]");
  });

  it("shows every faction's unit for every role, in the frozen order", () => {
    mount();
    openGallery();
    const headers = [
      ...document.querySelectorAll<HTMLElement>(".v7-gallery-faction"),
    ];
    expect(headers.map((header) => header.dataset.faction)).toEqual([
      ...FACTION_IDS_V7,
    ]);
    expect(headers.map((header) => header.textContent)).toEqual([
      "Human",
      "Undead",
      "Goblin",
      "Dinosaur",
      "Martian",
      "Ice Folk",
      "Dwarf",
    ]);
    const rows = [
      ...document.querySelectorAll<HTMLElement>(".v7-gallery-table tbody tr"),
    ];
    expect(rows.map((row) => row.dataset.row)).toEqual([
      "FIGHTER",
      "RAIDER",
      "MARKSMAN",
      "GUARD",
      "CAPTAIN",
      "CATAPULT",
      "KNIGHT",
      "JUGGERNAUT",
      "PATROL_BOAT",
      "BATTLESHIP",
      "TRANSPORT",
      "EGG",
    ]);
    // 11 rows of seven units, and one Egg.
    expect(document.querySelectorAll(".v7-gallery-cell")).toHaveLength(78);
    expect(
      document.querySelectorAll(".v7-gallery-cell-wrap.is-empty"),
    ).toHaveLength(6);
    expect(cell("FIGHTER", "UNDEAD").getAttribute("aria-label")).toBe(
      "Skeleton, Undead",
    );
    expect(cell("CATAPULT", "GOBLIN").textContent).toContain("Rocket Cart");
    expect(
      cell("CATAPULT", "GOBLIN").querySelector("canvas")?.dataset.subject,
    ).toBe("UNIT:GOBLIN:CATAPULT");
    expect(cell("EGG", "DINOSAUR").textContent).toContain("Egg");
    // No coordinates anywhere in the Gallery's text.
    expect(required("[data-v7-gallery]").textContent).not.toMatch(
      /\d+\s*,\s*\d+/,
    );
  });

  it("filters rows and columns and remembers them in this browser", () => {
    mount();
    openGallery();
    required<HTMLButtonElement>(
      '[data-filter="factions"] .v7-gallery-chip[data-value="GOBLIN"]',
    ).click();
    required<HTMLButtonElement>(
      '[data-filter="rows"] [data-action="gallery-rows-none"]',
    ).click();
    required<HTMLButtonElement>(
      '[data-filter="rows"] .v7-gallery-chip[data-value="KNIGHT"]',
    ).click();
    expect(
      [...document.querySelectorAll<HTMLElement>(".v7-gallery-faction")].map(
        (header) => header.dataset.faction,
      ),
    ).toEqual([
      "ORIGINAL",
      "UNDEAD",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
      "DWARF",
    ]);
    expect(
      [...document.querySelectorAll<HTMLElement>(".v7-gallery-cell")].map(
        (node) => node.dataset.row,
      ),
    ).toEqual(Array(6).fill("KNIGHT"));
    expect(
      required(
        '[data-filter="factions"] .v7-gallery-chip[data-value="GOBLIN"]',
      ).getAttribute("aria-pressed"),
    ).toBe("false");
    expect(
      JSON.parse(
        window.localStorage.getItem(GALLERY_FILTERS_STORAGE_KEY_V7) ?? "{}",
      ),
    ).toMatchObject({
      tab: "UNITS",
      factions: [
        "ORIGINAL",
        "UNDEAD",
        "DINOSAUR",
        "MARTIAN",
        "ICE_FOLK",
        "DWARF",
      ],
      unitRows: ["KNIGHT"],
    });
    // A new visit restores the choice.
    app?.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    mount();
    openGallery();
    expect(document.querySelectorAll(".v7-gallery-cell")).toHaveLength(6);
    // None of a kind leaves an empty table; All brings everything back.
    required<HTMLButtonElement>(
      '[data-action="gallery-factions-none"]',
    ).click();
    expect(required(".v7-gallery-nothing").textContent).toBe(
      "Nothing selected.",
    );
    required<HTMLButtonElement>('[data-action="gallery-factions-all"]').click();
    required<HTMLButtonElement>('[data-action="gallery-rows-all"]').click();
    expect(document.querySelectorAll(".v7-gallery-cell")).toHaveLength(78);
  });

  it("survives storage that throws", () => {
    app = bootstrapRuleset7App(document, {
      storage: null,
      settingsStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
        removeItem: () => undefined,
      },
      galleryDemoHost: () => new FakeDemoHost(),
    });
    openGallery();
    required<HTMLButtonElement>(
      '[data-action="gallery-factions-none"]',
    ).click();
    required(".v7-gallery-nothing");
  });

  it("moves through the grid with the keyboard and opens a unit with Enter", async () => {
    mount();
    openGallery();
    const first = cell("FIGHTER", "ORIGINAL");
    expect(first.tabIndex).toBe(0);
    expect(cell("FIGHTER", "UNDEAD").tabIndex).toBe(-1);
    first.focus();
    key(first, "ArrowRight");
    expect(document.activeElement).toBe(cell("FIGHTER", "UNDEAD"));
    key(document.activeElement as Element, "ArrowDown");
    expect(document.activeElement).toBe(cell("RAIDER", "UNDEAD"));
    expect(cell("RAIDER", "UNDEAD").tabIndex).toBe(0);
    expect(first.tabIndex).toBe(-1);
    key(document.activeElement as Element, "End");
    expect(document.activeElement).toBe(cell("RAIDER", "DWARF"));
    // Down from the Transport skips the empty Egg cells to the edge.
    cell("TRANSPORT", "DWARF").focus();
    key(document.activeElement as Element, "ArrowDown");
    expect(document.activeElement).toBe(cell("TRANSPORT", "DWARF"));
    cell("TRANSPORT", "DINOSAUR").focus();
    key(document.activeElement as Element, "ArrowDown");
    expect(document.activeElement).toBe(cell("EGG", "DINOSAUR"));
    // A native button: Enter activates it (jsdom needs the click).
    (document.activeElement as HTMLButtonElement).click();
    const dialog = required(".v7-gallery-detail");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(
      required('[data-action="gallery-detail-close"]'),
    );
    expect(required("#v7-gallery-detail-title").textContent).toBe("Egg");
    key(document.activeElement as Element, "Escape");
    expect(document.querySelector(".v7-gallery-detail")).toBeNull();
    expect(document.activeElement).toBe(cell("EGG", "DINOSAUR"));
  });

  it("shows a unit's stats, abilities, technology and steps along its row and column", () => {
    mount();
    openGallery();
    cell("CATAPULT", "UNDEAD").click();
    let dialog = required(".v7-gallery-detail");
    expect(dialog.dataset.faction).toBe("UNDEAD");
    expect(required("#v7-gallery-detail-title").textContent).toBe("Lich");
    expect(required(".v7-gallery-detail-faction").textContent).toBe("Undead");
    expect(required(".v7-gallery-detail-kicker").textContent).toBe(
      "Catapult · Siege",
    );
    const stats = [...dialog.querySelectorAll<HTMLElement>(".v7-stat")].map(
      (row) => `${row.title} ${row.querySelector("dd")?.textContent}`,
    );
    expect(stats).toEqual([
      "HP 10",
      "Attack 3",
      "Defense 1",
      "Move 1",
      "Range 2–3",
      "Sight 1",
      "Slots 1",
    ]);
    expect(required(".v7-gallery-cost").textContent).toContain("8");
    expect(required(".v7-gallery-tech").textContent).toContain("Sawmilling");
    expect(
      [...dialog.querySelectorAll<HTMLElement>(".v7-gallery-ability")].map(
        (item) => item.dataset.ability,
      ),
    ).toEqual(["ATTACK", "PLAGUE"]);
    expect(dialog.textContent).not.toMatch(/\d+\s*,\s*\d+/);
    // Along the row: the next faction's Catapult role.
    expect(
      required('[data-action="gallery-next-faction"]').getAttribute(
        "aria-label",
      ),
    ).toBe("Next faction: Goblin");
    required<HTMLButtonElement>('[data-action="gallery-next-faction"]').click();
    expect(required("#v7-gallery-detail-title").textContent).toBe(
      "Rocket Cart",
    );
    dialog = required(".v7-gallery-detail");
    expect(required(".v7-gallery-notes").textContent).toContain("Kaboom");
    // Down the column: the Goblin Knight; arrow keys step too.
    key(dialog, "ArrowDown");
    expect(required("#v7-gallery-detail-title").textContent).toBe(
      "Scrap Buggy",
    );
    key(required(".v7-gallery-detail"), "ArrowLeft");
    expect(required("#v7-gallery-detail-title").textContent).toBe("Vampire");
    // Dwarf Steam Mole: Tunnel and Eruption.
    required<HTMLButtonElement>('[data-action="gallery-detail-close"]').click();
    cell("GUARD", "DWARF").click();
    expect(required("#v7-gallery-detail-title").textContent).toBe("Steam Mole");
    expect(
      required('[data-action="gallery-next-faction"]').hasAttribute("disabled"),
    ).toBe(true);
    expect(
      [...document.querySelectorAll<HTMLElement>(".v7-gallery-ability")].map(
        (item) => item.dataset.ability,
      ),
    ).toEqual(expect.arrayContaining(["TUNNEL", "ERUPTION"]));
  });

  it("plays the preview's cues and stops it when the detail closes", async () => {
    mount();
    openGallery();
    cell("FIGHTER", "GOBLIN").click();
    const demo = required(".v7-gallery-demo");
    const cues = [...demo.querySelectorAll<HTMLElement>("[data-cue]")];
    expect(cues.map((node) => [node.dataset.cue, node.textContent])).toEqual([
      ["ATTACK", "Attack"],
      ["KABOOM", "Kaboom!"],
    ]);
    const host = hosts.at(-1);
    if (host === undefined) throw new Error("no preview host");
    expect(host.mounted).toBe(true);
    // The preview shows the ready unit on the demo board at once.
    expect(host.updates[0]?.interactive).toBe(false);
    expect(host.updates[0]?.showCursor).toBe(false);
    expect(host.updates[0]?.artSet).toBe("CHIBI");
    // Full motion plays the first cue after a short idle.
    expect(demo.dataset.demoState).toBe("playing");
    await waitUntil(() => host.presented.length === 1);
    host.complete();
    await waitUntil(() => demo.dataset.demoState === "done");
    expect(demo.dataset.demoCue).toBe("attack");
    // The board keeps the result.
    expect(host.updates.at(-1)?.view).toBe(host.presented[0]?.after);
    // Kaboom! plays its own scene.
    required<HTMLButtonElement>('[data-action="gallery-cue-kaboom"]').click();
    expect(demo.dataset.demoCue).toBe("kaboom");
    expect(
      required('[data-action="gallery-cue-kaboom"]').getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
    await waitUntil(() => host.presented.length === 2);
    expect(host.presented[1]?.after.units.length).toBeLessThan(
      host.presented[1]?.before.units.length ?? 0,
    );
    // Closing stops the running cue and destroys the preview's board.
    required<HTMLButtonElement>('[data-action="gallery-detail-close"]').click();
    expect(host.finished).toBeGreaterThan(0);
    expect(host.destroyed).toBe(true);
    expect(demo.dataset.demoState).toBe("stopped");
  });

  it("waits for a cue under reduced motion and replays on request", async () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        format: "pulp-wars-settings",
        version: 1,
        settings: {
          uiScale: 1,
          motion: "REDUCED",
          animationSpeed: "NORMAL",
          highContrast: false,
        },
      }),
    );
    mount();
    openGallery();
    cell("MARKSMAN", "ORIGINAL").click();
    const demo = required(".v7-gallery-demo");
    const host = hosts.at(-1);
    if (host === undefined) throw new Error("no preview host");
    expect(host.updates[0]?.motion).toBe("REDUCED");
    expect(demo.dataset.demoState).toBe("idle");
    expect(host.presented).toHaveLength(0);
    required<HTMLButtonElement>('[data-action="gallery-replay"]').click();
    await waitUntil(() => host.presented.length === 1);
    host.complete();
    await waitUntil(() => demo.dataset.demoState === "done");
  });

  it("shows no preview for the transport, and a stepping neighbour skips empty cells", () => {
    mount();
    openGallery();
    cell("TRANSPORT", "MARTIAN").click();
    expect(document.querySelector(".v7-gallery-demo")).toBeNull();
    expect(required(".v7-gallery-detail").dataset.preview).toBe("false");
    expect(required(".v7-gallery-notes").textContent).toContain("At sea");
    // Down from the Martian transport: no Martian Egg, so no next unit.
    expect(
      required('[data-action="gallery-next-row"]').hasAttribute("disabled"),
    ).toBe(true);
  });

  it("lists the buildings with per-faction cities and shared improvements", () => {
    mount();
    openGallery();
    required<HTMLButtonElement>(
      '[data-action="gallery-tab-buildings"]',
    ).click();
    expect(
      required('[data-action="gallery-tab-buildings"]').getAttribute(
        "aria-selected",
      ),
    ).toBe("true");
    const rows = [
      ...document.querySelectorAll<HTMLElement>(".v7-gallery-table tbody tr"),
    ];
    expect(rows.map((row) => row.dataset.row)).toEqual([
      "CITY_1",
      "CITY_2",
      "CITY_3",
      "VILLAGE",
      "FARM",
      "LUMBER_CAMP",
      "MINE",
      "WINDMILL",
      "SAWMILL",
      "FORGE",
      "WORKSHOP",
      "MARKET",
      "MONUMENT",
      "PORT",
      "SHIPYARD",
    ]);
    expect(rows[0]?.querySelectorAll(".v7-gallery-cell").length).toBe(7);
    expect(
      cell("CITY_2", "MARTIAN").querySelector("canvas")?.dataset.subject,
    ).toBe("CITY:MARTIAN:2");
    // A shared improvement is one cell across every faction.
    const forge = rows[9]?.querySelectorAll<HTMLElement>(".v7-gallery-cell");
    expect(forge).toHaveLength(1);
    expect(forge?.[0]?.getAttribute("aria-label")).toBe("Forge, every faction");
    expect(forge?.[0]?.closest("td")?.getAttribute("colspan")).toBe("7");
    // Faction building looks (bead pulp_wars-xdh.2): the Farm, Windmill and
    // Sawmill rows have one cell per faction, named as that faction has it.
    const cellNames = (row: number) =>
      [
        ...(rows[row]?.querySelectorAll<HTMLElement>(".v7-gallery-cell-name") ??
          []),
      ].map((node) => node.textContent);
    expect(cellNames(4)).toEqual([
      "Farm",
      "Graveyard",
      "Farm",
      "Farm",
      "Hydroponic Farm",
      "Frost Garden",
      "Mushroom Farm",
    ]);
    expect(cellNames(7)).toEqual([
      "Windmill",
      "Bone Mill",
      "Windmill",
      "Grinding Stone",
      "Solar Array",
      "Windmill",
      "Steam Pump",
    ]);
    expect(cellNames(8)[3]).toBe("Chopping Block");
    for (const row of [5, 6, 9, 10, 11, 12, 13, 14])
      expect(rows[row]?.querySelectorAll(".v7-gallery-cell")).toHaveLength(1);
    const graveyard = cell("FARM", "UNDEAD");
    expect(graveyard.getAttribute("aria-label")).toBe("Graveyard, Undead");
    expect(graveyard.querySelector("canvas")?.dataset.subject).toBe(
      "IMPROVEMENT:UNDEAD:FARM",
    );
    expect(
      cell("FARM", "GOBLIN").querySelector("canvas")?.dataset.subject,
    ).toBe("IMPROVEMENT:FARM");
    graveyard.click();
    expect(required("#v7-gallery-detail-title").textContent).toBe("Graveyard");
    expect(required(".v7-gallery-detail-faction").textContent).toBe("Undead");
    expect(required(".v7-gallery-description").textContent).toBe(
      "Quiet plots, tended for later. Counts as a Farm. Built on Fertile Ground.",
    );
    expect(required(".v7-gallery-detail").textContent).toContain(
      "+2 population",
    );
    expect(required(".v7-gallery-tech").textContent).toContain("Farming");
    required<HTMLButtonElement>('[data-action="gallery-detail-close"]').click();
    cell("FARM", "ORIGINAL").click();
    expect(required("#v7-gallery-detail-title").textContent).toBe("Farm");
    expect(required(".v7-gallery-description").textContent).toBe(
      "Built on Fertile Ground.",
    );
    required<HTMLButtonElement>('[data-action="gallery-detail-close"]').click();
    cell("CITY_1", "UNDEAD").click();
    expect(required(".v7-gallery-detail-faction").textContent).toBe("Undead");
    // The tab is remembered too.
    expect(
      JSON.parse(
        window.localStorage.getItem(GALLERY_FILTERS_STORAGE_KEY_V7) ?? "{}",
      ).tab,
    ).toBe("BUILDINGS");
  });
});

describe("Ruleset 7 Gallery: Curiosities (pulp_wars-737.6)", () => {
  it("lists the Giant Spider and the four curiosities on their own tab, without filters", () => {
    mount();
    openGallery();
    const tabs = [...document.querySelectorAll<HTMLElement>('[role="tab"]')];
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Units",
      "Buildings",
      "Curiosities",
    ]);
    required<HTMLButtonElement>(
      '[data-action="gallery-tab-curiosities"]',
    ).click();
    expect(document.querySelector(".v7-gallery-filters")).toBeNull();
    const cells = (): HTMLElement[] => [
      ...document.querySelectorAll<HTMLElement>(
        ".v7-gallery-curiosities .v7-gallery-cell",
      ),
    ];
    expect(
      cells().map((node) => [
        node.dataset.row,
        node.querySelector("canvas")?.dataset.subject,
        node.getAttribute("aria-label"),
      ]),
    ).toEqual([
      ["SPIDER", "UNIT:MONSTER_GIANT_SPIDER", "Giant Spider, neutral"],
      ["WEB", "CURIOSITY:WEB", "Spider's lair, neutral"],
      ["FOUNTAIN", "CURIOSITY:FOUNTAIN", "Fountain of Youth, neutral"],
      ["SHRINE", "CURIOSITY:SHRINE", "Shrine, neutral"],
      ["WRECK", "CURIOSITY:WRECK", "Sunken Wreck, neutral"],
    ]);
    // The keyboard grid: Right and End walk the row.
    cells()[0]?.focus();
    key(required('.v7-gallery-cell[data-row="SPIDER"]'), "ArrowRight");
    expect(document.activeElement).toBe(cells()[1]);
    key(required('.v7-gallery-cell[data-row="WEB"]'), "End");
    expect(document.activeElement).toBe(cells()[4]);
    // The Spider's detail: Neutral, its stats, its sentence and its bounty.
    cells()[0]?.click();
    const detail = required(".v7-gallery-detail");
    expect(required("#v7-gallery-detail-title").textContent).toBe(
      "Giant Spider",
    );
    expect(required(".v7-gallery-detail-kicker").textContent).toBe("Neutral");
    expect(detail.querySelector(".v7-gallery-detail-faction")).toBeNull();
    expect(detail.querySelector('[data-stat="hp"]')?.textContent).toContain(
      "24",
    );
    expect(detail.textContent).toContain("pays 10 Coins");
    expect(detail.dataset.preview).toBe("false");
    expect(hosts).toHaveLength(0);
    // Down steps to the lair, then the Fountain; no faction steps.
    expect(
      required<HTMLButtonElement>('[data-action="gallery-next-faction"]')
        .disabled,
    ).toBe(true);
    required<HTMLButtonElement>('[data-action="gallery-next-row"]').click();
    required<HTMLButtonElement>('[data-action="gallery-next-row"]').click();
    expect(required("#v7-gallery-detail-title").textContent).toBe(
      "Fountain of Youth",
    );
    expect(required(".v7-gallery-description").textContent).toContain(
      "heals 12 HP",
    );
    expect(
      JSON.parse(
        window.localStorage.getItem(GALLERY_FILTERS_STORAGE_KEY_V7) ?? "{}",
      ).tab,
    ).toBe("CURIOSITIES");
  });
});
