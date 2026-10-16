// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { CoordV7, GameStateV7 } from "../../src/engine/index";
import { GROUND_MODIFIER_SOURCES_V7 } from "../../src/render/unit-glossary-v7";
import { required, requiredElement, rig } from "../fixtures/v7-dom-rig";
import {
  ICE_FOLK_GLIDE_V7,
  ICE_FOLK_UI_V7,
  iceFolkGlideFixtureV7,
  iceFolkUiFixtureV7,
} from "../fixtures/v7-ice-folk-ui";
import {
  UNDEAD_SHOWCASE_V7,
  undeadShowcaseFixtureV7,
} from "../fixtures/v7-undead-ui";

/**
 * Bead pulp_wars-2yc.63: a unit's card shows facts about the unit only.
 * What belongs to the tile it stands on (a Grave, Snow, a Blizzard, ice,
 * Rockfall, terrain cover, Field Defense, Walls, high ground) is shown when
 * the tile is selected (a second tap on the unit), never on the card; the
 * attack preview still counts it.
 */

const COORDINATE = /\b\d{1,2}, ?\d{1,2}\b/;
/** The tile's facts that were chips of a unit card before this bead. */
const TILE_STATUSES = [
  "grave",
  "snow",
  "blizzard",
  "on-ice",
  "ice-cover",
  "rockfall",
] as const;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

const dock = (): HTMLElement =>
  requiredElement<HTMLElement>(".v7-selection-dock");

/** The unit card holds no tile chip and no ground term. */
function expectUnitOnly(): void {
  const card = dock();
  expect(card.dataset.selectionKind).toBe("unit");
  for (const status of TILE_STATUSES)
    expect(
      card.querySelector(`[data-unit-status="${status}"]`),
      status,
    ).toBeNull();
  for (const term of card.querySelectorAll<HTMLElement>(
    "[data-modifier-source]",
  ))
    expect(
      GROUND_MODIFIER_SOURCES_V7.map((source) => source.toLowerCase()),
    ).not.toContain(term.dataset.modifierSource);
  expect(card.querySelector("[data-ground-bonus]")).toBeNull();
  expect(card.textContent).not.toMatch(/On a Grave|Snow cover|Ice cover/);
  expect(card.textContent).not.toMatch(COORDINATE);
}

/** Selects the unit at `at`, then (a second tap) its tile. */
function unitThenTile(
  setup: ReturnType<typeof rig>,
  at: CoordV7,
): { readonly card: string; readonly tile: HTMLElement } {
  setup.host.callbacks?.onSelection({
    kind: "UNIT",
    unitId: setup.unitAt(at).id,
  });
  expectUnitOnly();
  const card = dock().textContent ?? "";
  setup.host.callbacks?.onSelection({ kind: "TILE", at });
  const tile = dock();
  expect(tile.dataset.selectionKind).toBe("tile");
  expect(tile.textContent).not.toMatch(COORDINATE);
  for (const chip of tile.querySelectorAll<HTMLElement>("[data-ground-bonus]"))
    expect(`${chip.title} ${chip.getAttribute("aria-label")}`).not.toMatch(
      COORDINATE,
    );
  return { card, tile };
}

const groundChip = (tile: HTMLElement, id: string): HTMLElement =>
  required(tile.querySelector<HTMLElement>(`[data-ground-bonus="${id}"]`));

describe("the unit card shows the unit, the tile dock the tile (pulp_wars-2yc.63)", () => {
  it("names a Grave under a Ghoul on the tile, not on the Ghoul", () => {
    const setup = rig(undeadShowcaseFixtureV7());
    const { tile } = unitThenTile(setup, UNDEAD_SHOWCASE_V7.ghoul);
    const grave = required(tile.querySelector<HTMLElement>("[data-grave]"));
    expect(grave.textContent).toBe("Grave");
    expect(grave.title).toContain("Necromancer");
    setup.app.destroy();
  });

  it("moves a Yeti's Mountain cover, high ground and Rockfall to the Mountain", () => {
    const setup = rig(iceFolkUiFixtureV7());
    const at = ICE_FOLK_UI_V7.rockfallYeti;
    const stats = required(
      setup.view.unitStats.find(
        (entry) => entry.unitId === setup.unitAt(at).id,
      ),
    );
    // The fixture really has the facts: Mountain cover, high ground, and
    // the Rockfall reach.
    const sources = stats.stats.flatMap((stat) =>
      stat.modifiers.map((modifier) => modifier.source),
    );
    expect(sources).toContain("MOUNTAIN");
    expect(stats.iceFolk?.rockfall).toBe(true);
    const { card, tile } = unitThenTile(setup, at);
    // The card's Defense is the Yeti's own.
    expect(card).not.toContain("Rockfall");
    expect(groundChip(tile, "mountain").textContent).toMatch(
      /^Cover \+[\d.]+ Defense$/,
    );
    expect(groundChip(tile, "mountain").title).toContain("Mountain");
    if (sources.includes("HIGH_GROUND"))
      expect(groundChip(tile, "high_ground").textContent).toBe(
        "High ground +1 Sight",
      );
    expect(groundChip(tile, "rockfall").textContent).toBe("Rockfall");
    expect(groundChip(tile, "rockfall").title).toContain("two tiles away");
    setup.app.destroy();
  });

  it("moves an Ice Witch's Blizzard and Snow cover to her tile", () => {
    const setup = rig(iceFolkUiFixtureV7());
    const { tile } = unitThenTile(setup, ICE_FOLK_UI_V7.witch);
    expect(
      required(tile.querySelector('[data-winter="blizzard"]')).textContent,
    ).toBe("Blizzard");
    expect(
      required(tile.querySelector('[data-winter="snow"]')).textContent,
    ).toBe("Snow");
    expect(groundChip(tile, "snow").textContent).toBe(
      "Snow cover +25% Defense",
    );
    setup.app.destroy();
  });

  it("shows Snow cover on the tile of a unit inside the Snow, and none outside", () => {
    const setup = rig(iceFolkGlideFixtureV7());
    expect(
      groundChip(unitThenTile(setup, ICE_FOLK_GLIDE_V7.inside).tile, "snow")
        .textContent,
    ).toBe("Snow cover +25% Defense");
    const outside = unitThenTile(setup, ICE_FOLK_GLIDE_V7.outside).tile;
    expect(outside.querySelector("[data-ground-bonus]")).toBeNull();
    setup.app.destroy();
  });

  it("keeps every unit card of these fixtures free of the tile's facts", () => {
    const fixtures: readonly (() => GameStateV7)[] = [
      undeadShowcaseFixtureV7,
      iceFolkUiFixtureV7,
      iceFolkGlideFixtureV7,
    ];
    for (const fixture of fixtures) {
      document.body.innerHTML = '<div id="app"></div>';
      const setup = rig(fixture());
      for (const unit of setup.view.units) {
        setup.host.callbacks?.onSelection({ kind: "UNIT", unitId: unit.id });
        expectUnitOnly();
      }
      setup.app.destroy();
    }
  });
});
