import { describe, expect, it } from "vitest";
import {
  ECONOMIC_IMPROVEMENT_IDS,
  RESOURCE_IDS,
  UNIT_ROLE_IDS,
  createPlayableGameV6,
  effectiveRoleRuleV6,
  viewForV6,
  type FactionIdV6,
  type MatchSetupV6,
  type PlayerViewV6,
} from "../../src/engine/index";
import {
  SELECTION_IDENTITY_ARTWORK_VIEWPORT_V6,
  selectionIdentityArtworkFrameV6,
  selectionIdentityArtworkLayoutV6,
  selectionIdentityPresentationV6,
} from "../../src/render/dom/selection-identity-v6";

const UNIT_ASSET_IDS = {
  ORIGINAL: {
    FIGHTER: "unit-original-fighter",
    SCOUT: "unit-original-scout",
    MARKSMAN: "unit-original-marksman",
    GUARD: "unit-original-guard",
    RAIDER: "unit-original-raider",
    MEDIC: "unit-original-medic",
    HEAVY: "unit-original-heavy",
    BREACHER: "unit-original-breacher",
    JUGGERNAUT: "unit-original-juggernaut",
  },
  CANDY: {
    FIGHTER: "unit-candy-fighter",
    SCOUT: "unit-candy-scout",
    MARKSMAN: "unit-candy-marksman",
    GUARD: "unit-candy-guard",
    RAIDER: "unit-candy-raider",
    MEDIC: "unit-candy-medic",
    HEAVY: "unit-candy-heavy",
    BREACHER: "unit-candy-breacher",
    JUGGERNAUT: "unit-candy-juggernaut",
  },
} as const;

const IMPROVEMENT_ASSET_IDS = {
  FARM: "building-square-farm",
  LUMBER_CAMP: "building-square-lumber-camp",
  MINE: "building-square-mine",
  QUARRY: "building-square-quarry",
  WINDMILL: "building-square-windmill",
  SAWMILL: "building-square-sawmill",
  FORGE: "building-square-forge",
  STONEWORKS: "building-square-stoneworks",
  WORKSHOP: "building-square-workshop",
  GRAND_WORKS: "building-square-grand-works",
  MARKET: "building-square-market",
} as const;

describe("ruleset-6 selection identity presentation", () => {
  it("resolves every Original and Candy role to its exact world sprite and compact HP", () => {
    for (const faction of ["ORIGINAL", "CANDY"] as const) {
      const initial = publicView(faction);
      const unit = initial.units.find(
        (candidate) => candidate.ownerId === initial.viewer.id,
      );
      if (unit === undefined) throw new Error("Missing owned unit");
      for (const role of UNIT_ROLE_IDS) {
        const view: PlayerViewV6 = {
          ...initial,
          units: initial.units.map((candidate) =>
            candidate.id === unit.id
              ? { ...candidate, role, hp: 7, maxHp: 13 }
              : candidate,
          ),
        };
        const identity = selectionIdentityPresentationV6(view, {
          kind: "UNIT",
          unitId: unit.id,
        });
        expect(identity.kind).toBe("UNIT");
        expect(identity.detail).toBeNull();
        expect(identity.accessibleLabel).toBe(
          `${effectiveRoleRuleV6(faction, role).label}, selected. Statistics follow.`,
        );
        expect(identity.artwork).toMatchObject({
          status: "ACCEPTED",
          assetId: UNIT_ASSET_IDS[faction][role],
        });
        expect(acceptedAssetId(identity)).not.toContain("portrait");
      }
    }
  });

  it("uses exact faction city art with clamped visual tiers and live population context", () => {
    for (const faction of ["ORIGINAL", "CANDY"] as const) {
      const initial = publicView(faction);
      const city = initial.cities.find(
        (candidate) => candidate.ownerId === initial.viewer.id,
      );
      if (city === undefined) throw new Error("Missing owned city");
      for (const [level, artLevel] of [
        [1, 1],
        [2, 2],
        [3, 3],
        [8, 3],
      ] as const) {
        const view: PlayerViewV6 = {
          ...initial,
          cities: initial.cities.map((candidate) =>
            candidate.id === city.id
              ? { ...candidate, level, population: level - 2 }
              : candidate,
          ),
        };
        const identity = selectionIdentityPresentationV6(view, {
          kind: "CITY",
          cityId: city.id,
        });
        expect(identity.title).toBe(
          `${faction === "ORIGINAL" ? "Original" : "Candy"} ${city.isCapital ? "Capital" : "City"}`,
        );
        expect(identity.detail).toBe(
          `Level ${level} · ${level - 2}/${level + 1} population`,
        );
        expect(identity.artwork).toMatchObject({
          status: "ACCEPTED",
          assetId: `building-${faction === "CANDY" ? "candy-" : ""}city-${artLevel}`,
        });
      }
    }
  });

  it("prefers public improvement, then public resource, then exact terrain art without coordinates", () => {
    for (const faction of ["ORIGINAL", "CANDY"] as const) {
      const initial = publicView(faction);
      const tile = initial.board.tiles.find(
        (candidate) =>
          candidate.explored &&
          candidate.territoryOwnerId === initial.viewer.id,
      );
      if (tile?.explored !== true)
        throw new Error("Missing explored owned tile");
      const select = { kind: "TILE", at: tile.at } as const;

      for (const improvement of ECONOMIC_IMPROVEMENT_IDS) {
        const identity = selectionIdentityPresentationV6(
          withTile(initial, tile.at, {
            terrain: "GRASS",
            resource: "FRUIT",
            improvement,
          }),
          select,
        );
        expect(identity.artwork).toMatchObject({
          status: "ACCEPTED",
          assetId: IMPROVEMENT_ASSET_IDS[improvement],
        });
        expect(identity.accessibleLabel).not.toMatch(/\d+,\d+/);
      }

      for (const resource of RESOURCE_IDS) {
        const identity = selectionIdentityPresentationV6(
          withTile(initial, tile.at, {
            terrain: resource === "GAME" ? "FOREST" : "GRASS",
            resource,
            improvement: null,
          }),
          select,
        );
        const expected =
          resource === "FRUIT"
            ? `terrain-square-${faction === "CANDY" ? "candy" : "original"}-fruit`
            : resource === "GAME"
              ? faction === "CANDY"
                ? "terrain-square-candy-animal"
                : "terrain-square-original-animal"
              : resource === "ORE"
                ? "terrain-square-ore"
                : resource === "STONE"
                  ? "terrain-square-stone"
                  : "terrain-square-fertile-ground";
        expect(identity.artwork).toMatchObject({
          status: "ACCEPTED",
          assetId: expected,
        });
        expect(identity.accessibleLabel).not.toMatch(/\d+,\d+/);
      }

      for (const terrain of ["GRASS", "FOREST", "MOUNTAIN"] as const) {
        const identity = selectionIdentityPresentationV6(
          withTile(initial, tile.at, {
            terrain,
            resource: null,
            improvement: null,
          }),
          select,
        );
        expect(identity.title).toBe(titleCase(terrain));
        expect(identity.artwork).toMatchObject({ status: "ACCEPTED" });
        expect(acceptedAssetId(identity)).toMatch(
          new RegExp(
            `^terrain-square-${faction === "CANDY" ? "candy" : "original"}-${terrain.toLowerCase()}-[1-4]$`,
          ),
        );
        expect(identity.accessibleLabel).toBe(
          `${titleCase(terrain)} selected.`,
        );
      }

      const hiddenResource = selectionIdentityPresentationV6(
        withTile(initial, tile.at, {
          terrain: "MOUNTAIN",
          resource: "UNKNOWN_RESOURCE",
          improvement: null,
        }),
        select,
      );
      expect(hiddenResource.title).toBe("Mountain");
      expect(acceptedAssetId(hiddenResource)).toMatch(/mountain/);
      expect(JSON.stringify(hiddenResource)).not.toContain("Unknown resource");
    }
  });

  it("centers complete Game and Fertile Ground alpha while preserving ordinary identity framing", () => {
    for (const faction of ["ORIGINAL", "CANDY"] as const) {
      const initial = publicView(faction);
      const tile = initial.board.tiles.find(
        (candidate) =>
          candidate.explored &&
          candidate.territoryOwnerId === initial.viewer.id,
      );
      if (tile?.explored !== true) throw new Error("Missing explored tile");
      const select = { kind: "TILE", at: tile.at } as const;

      for (const resource of ["GAME", "FERTILE_GROUND"] as const) {
        const identity = selectionIdentityPresentationV6(
          withTile(initial, tile.at, {
            terrain: resource === "GAME" ? "FOREST" : "GRASS",
            resource,
            improvement: null,
          }),
          select,
        );
        const frame = selectionIdentityArtworkFrameV6(identity.artwork);
        expect(frame?.mode).toBe("VISIBLE_ALPHA");
        if (frame === null) throw new Error("Missing selection frame");
        expect(frame.visibleBounds).toEqual(
          resource === "FERTILE_GROUND"
            ? { left: 59, top: 250, right: 196, bottom: 324 }
            : {
                left: 68,
                top: faction === "ORIGINAL" ? 220 : 213,
                right: 188,
                bottom: 324,
              },
        );
        const layout = selectionIdentityArtworkLayoutV6(frame);
        if (layout.visible === null)
          throw new Error("Missing visible-alpha layout");
        expect((layout.visible.left + layout.visible.right) / 2).toBeCloseTo(
          SELECTION_IDENTITY_ARTWORK_VIEWPORT_V6.width / 2,
          8,
        );
        expect((layout.visible.top + layout.visible.bottom) / 2).toBeCloseTo(
          SELECTION_IDENTITY_ARTWORK_VIEWPORT_V6.height / 2,
          8,
        );
        expect(layout.visible.left).toBeGreaterThanOrEqual(
          SELECTION_IDENTITY_ARTWORK_VIEWPORT_V6.visibleInset,
        );
        expect(layout.visible.top).toBeGreaterThanOrEqual(
          SELECTION_IDENTITY_ARTWORK_VIEWPORT_V6.visibleInset,
        );
        expect(layout.visible.right).toBeLessThanOrEqual(
          SELECTION_IDENTITY_ARTWORK_VIEWPORT_V6.width -
            SELECTION_IDENTITY_ARTWORK_VIEWPORT_V6.visibleInset,
        );
        expect(layout.visible.bottom).toBeLessThanOrEqual(
          SELECTION_IDENTITY_ARTWORK_VIEWPORT_V6.height -
            SELECTION_IDENTITY_ARTWORK_VIEWPORT_V6.visibleInset,
        );
      }

      const ownedUnit = initial.units.find(
        (candidate) => candidate.ownerId === initial.viewer.id,
      );
      const ownedCity = initial.cities.find(
        (candidate) => candidate.ownerId === initial.viewer.id,
      );
      if (ownedUnit === undefined || ownedCity === undefined)
        throw new Error("Missing representative identities");
      const ordinaryIdentities = [
        selectionIdentityPresentationV6(initial, {
          kind: "UNIT",
          unitId: ownedUnit.id,
        }),
        selectionIdentityPresentationV6(initial, {
          kind: "CITY",
          cityId: ownedCity.id,
        }),
        selectionIdentityPresentationV6(
          withTile(initial, tile.at, {
            terrain: "MOUNTAIN",
            resource: null,
            improvement: null,
          }),
          select,
        ),
        selectionIdentityPresentationV6(
          withTile(initial, tile.at, {
            terrain: "GRASS",
            resource: null,
            improvement: "WINDMILL",
          }),
          select,
        ),
      ];
      for (const identity of ordinaryIdentities) {
        const frame = selectionIdentityArtworkFrameV6(identity.artwork);
        expect(frame).toMatchObject({
          mode: "SOURCE_CANVAS",
          visibleBounds: null,
        });
      }
    }
  });

  it("provides semantic fallbacks for no, stale, and unexplored selections", () => {
    const view = publicView("ORIGINAL");
    expect(selectionIdentityPresentationV6(view, null)).toMatchObject({
      kind: "NONE",
      title: "Choose an action",
      artwork: null,
    });
    expect(
      selectionIdentityPresentationV6(view, {
        kind: "UNIT",
        unitId: Number.MAX_SAFE_INTEGER,
      }),
    ).toMatchObject({
      kind: "UNIT",
      title: "Unit unavailable",
      artwork: null,
    });
    const unexplored = view.board.tiles.find((tile) => !tile.explored);
    if (unexplored === undefined) throw new Error("Missing unexplored tile");
    expect(
      selectionIdentityPresentationV6(view, {
        kind: "TILE",
        at: unexplored.at,
      }),
    ).toMatchObject({
      kind: "TILE",
      title: "Unexplored Tile",
      accessibleLabel: "Unexplored tile selected.",
      artwork: null,
    });
  });
});

function publicView(faction: FactionIdV6): PlayerViewV6 {
  const setup: MatchSetupV6 = {
    rulesetId: "pulp-wars-poc-6",
    mapGenerationRevision: "SPATIAL_ECONOMY",
    seed: 42,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [faction, faction === "ORIGINAL" ? "CANDY" : "ORIGINAL"],
  };
  const created = createPlayableGameV6(setup);
  if (!created.ok) throw new Error(created.error.code);
  return viewForV6(created.state, created.state.humanPlayerId);
}

function acceptedAssetId(
  identity: ReturnType<typeof selectionIdentityPresentationV6>,
): string {
  if (identity.artwork?.status !== "ACCEPTED") {
    throw new Error("Expected accepted selection artwork");
  }
  return identity.artwork.assetId;
}

function withTile(
  view: PlayerViewV6,
  at: { readonly x: number; readonly y: number },
  replacement: Partial<
    Extract<PlayerViewV6["board"]["tiles"][number], { readonly explored: true }>
  >,
): PlayerViewV6 {
  return {
    ...view,
    board: {
      ...view.board,
      tiles: view.board.tiles.map((tile) =>
        tile.at.x === at.x && tile.at.y === at.y && tile.explored
          ? { ...tile, ...replacement }
          : tile,
      ),
    },
  };
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
