// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as EngineTypes from "../../src/engine/v7/types";

/**
 * The Gallery when no faction is hidden (bead pulp_wars-2yc.44): the list
 * of hidden factions (`HIDDEN_FACTION_IDS_V7`, today the Cult) is emptied
 * here, as the bead that offers the Cult will empty it, and nothing else
 * changes. The Gallery then has a Cult column, and the Buildings tab shows
 * the Cult's obelisk and its seven Monuments with their own sprites.
 */
vi.mock("../../src/engine/v7/types", async (importOriginal) => {
  const actual = await importOriginal<typeof EngineTypes>();
  return {
    ...actual,
    HIDDEN_FACTION_IDS_V7: Object.freeze([]),
    OFFERED_FACTION_IDS_V7: actual.FACTION_IDS_V7,
  };
});

import { bootstrapRuleset7App } from "../../src/app/index";
import {
  ACHIEVEMENT_IDS_V7,
  FACTION_IDS_V7,
  HIDDEN_FACTION_IDS_V7,
  OFFERED_FACTION_IDS_V7,
} from "../../src/engine/index";
import { chibiDirectionArtRegistryV7 } from "../../src/assets/chibi-direction-art-manifest";
import {
  GALLERY_BUILDING_ROWS_V7,
  GALLERY_FACTIONS_V7,
  galleryBuildingDetailsV7,
  galleryBuildingPerFactionV7,
  galleryBuildingSubjectV7,
} from "../../src/render/gallery-presentation-v7";

let app: ReturnType<typeof bootstrapRuleset7App> | null = null;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
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

const MONUMENT_ROWS = GALLERY_BUILDING_ROWS_V7.filter((row) =>
  row.startsWith("MONUMENT"),
);

describe("the Gallery with no hidden faction", () => {
  it("offers every registered faction, the Cult last", () => {
    expect(HIDDEN_FACTION_IDS_V7).toEqual([]);
    expect(OFFERED_FACTION_IDS_V7).toEqual(FACTION_IDS_V7);
    expect(GALLERY_FACTIONS_V7).toEqual(FACTION_IDS_V7);
    expect(GALLERY_FACTIONS_V7.at(-1)).toBe("CULT");
  });

  it("has the Cult's obelisk and seven Monuments, each a sprite of its own", () => {
    const live = chibiDirectionArtRegistryV7();
    expect(MONUMENT_ROWS).toHaveLength(1 + ACHIEVEMENT_IDS_V7.length);
    const subjects = MONUMENT_ROWS.map((row) => {
      expect(galleryBuildingPerFactionV7(row), row).toBe(true);
      const subject = galleryBuildingSubjectV7(row, "CULT");
      expect(live.variants(subject), subject).toHaveLength(1);
      return subject;
    });
    expect(subjects).toEqual([
      "IMPROVEMENT:MONUMENT:CULT",
      ...ACHIEVEMENT_IDS_V7.map(
        (achievement) => `IMPROVEMENT:MONUMENT:CULT:${achievement}`,
      ),
    ]);
    expect(galleryBuildingDetailsV7("MONUMENT_SLAYER", "CULT").name).toBe(
      "Slayer Monument",
    );
  });

  it("draws a Cult cell in every Monument row of the Buildings tab", () => {
    app = bootstrapRuleset7App(document, {
      storage: null,
      settingsStorage: window.localStorage,
    });
    required<HTMLButtonElement>('[data-action="gallery"]').click();
    required<HTMLButtonElement>(
      '[data-action="gallery-tab-buildings"]',
    ).click();
    expect(
      [...document.querySelectorAll<HTMLElement>(".v7-gallery-faction")].map(
        (header) => header.dataset.faction,
      ),
    ).toEqual([...FACTION_IDS_V7]);
    required('[data-filter="factions"] .v7-gallery-chip[data-value="CULT"]');
    for (const row of MONUMENT_ROWS) {
      const cells = [
        ...document.querySelectorAll<HTMLElement>(
          `.v7-gallery-table tr[data-row="${row}"] .v7-gallery-cell`,
        ),
      ];
      expect(cells.map((node) => node.dataset.faction)).toEqual([
        ...FACTION_IDS_V7,
      ]);
      expect(cells.at(-1)?.querySelector("canvas")?.dataset.subject).toBe(
        galleryBuildingSubjectV7(row, "CULT"),
      );
    }
    required<HTMLButtonElement>(
      '.v7-gallery-cell[data-row="MONUMENT_CONQUEROR"][data-faction="CULT"]',
    ).click();
    expect(required("#v7-gallery-detail-title").textContent).toBe(
      "Conqueror Monument",
    );
    expect(
      required(".v7-gallery-detail canvas.v7-gallery-tile").dataset.subject,
    ).toBe("IMPROVEMENT:MONUMENT:CULT:CONQUEROR");
  });
});
