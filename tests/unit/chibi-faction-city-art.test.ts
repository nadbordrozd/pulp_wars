import { describe, expect, it } from "vitest";
import { viewForV7, type FactionIdV7 } from "../../src/engine/index";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  buildChibiArtRegistryV7,
  chibiFallbackSubjectV7,
  chibiOverflowV7,
  cityArtSubjectV7,
  type ArtSubjectV7,
  type ChibiArtAssetV7,
} from "../../src/assets/chibi-art-v7";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import {
  createChibiArtResolverV7,
  resolveChibiWithFallbackV7,
  type ChibiRasterEnvironmentV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";
import { RULESET7_PLAYER_COLORS } from "../../src/render/canvas/owner-recolour-v7";
import { exploredAllV7, initialV7 } from "../fixtures/v7-builders";

/** Rasters settle at once; a URL containing "broken" fails to load. */
const syncEnvironment: ChibiRasterEnvironmentV7 = {
  loadImage(url, settle) {
    settle(!url.includes("broken"));
    return { url } as unknown as CanvasImageSource;
  },
  readPixels: (_image, width, height) =>
    new Uint8ClampedArray(width * height * 4),
  createSurface: () => ({ surface: true }) as unknown as CanvasImageSource,
};

function city(
  id: string,
  subject: ArtSubjectV7,
  url = `/${id}.png`,
): ChibiArtAssetV7 {
  return {
    id,
    subject,
    assetClass: "SETTLEMENT",
    width: 88,
    height: 96,
    url,
    ownerMaskUrl: `/${id}.mask.png`,
  };
}

function resolver(assets: readonly ChibiArtAssetV7[]) {
  const built = buildChibiArtRegistryV7(assets);
  expect(built.problems).toEqual([]);
  return createChibiArtResolverV7({
    environment: syncEnvironment,
    redraw: () => undefined,
    registry: built.registry,
  });
}

const request = (subject: ArtSubjectV7) => ({
  subject,
  at: { x: 2, y: 3 },
  ownerColor: RULESET7_PLAYER_COLORS.TEAL,
  deviceScale: 1,
});

describe("Faction city art (pulp_wars-6gd.6)", () => {
  it("names a city's subject by its owner's faction and art level", () => {
    expect(cityArtSubjectV7({ artLevel: 1, faction: "UNDEAD" })).toBe(
      "CITY:UNDEAD:1",
    );
    expect(cityArtSubjectV7({ artLevel: 3, faction: "GOBLIN" })).toBe(
      "CITY:GOBLIN:3",
    );
    expect(cityArtSubjectV7({ artLevel: 2, faction: "ORIGINAL" })).toBe(
      "CITY:2",
    );
    // An owner the view does not know keeps the shared set.
    expect(cityArtSubjectV7({ artLevel: 2, faction: undefined })).toBe(
      "CITY:2",
    );
  });

  it("falls back from a faction city to the Human city of the same level", () => {
    expect(chibiFallbackSubjectV7("CITY:UNDEAD:2")).toBe("CITY:2");
    expect(chibiFallbackSubjectV7("CITY:GOBLIN:3")).toBe("CITY:3");
    expect(chibiFallbackSubjectV7("CITY:1")).toBeNull();
    expect(chibiFallbackSubjectV7("SITE:VILLAGE")).toBeNull();
    const art = resolver([
      city("human-1", "CITY:1"),
      city("human-2", "CITY:2"),
      city("undead-1", "CITY:UNDEAD:1"),
      city("goblin-2", "CITY:GOBLIN:2", "/broken-goblin-2.png"),
    ]);
    const own = resolveChibiWithFallbackV7(art, request("CITY:UNDEAD:1"));
    expect(own.resolution.kind === "READY" && own.resolution.asset.id).toBe(
      "undead-1",
    );
    // Not registered: the Human City 2 stands in.
    const missing = resolveChibiWithFallbackV7(art, request("CITY:UNDEAD:2"));
    expect(
      missing.resolution.kind === "READY" && missing.resolution.asset.id,
    ).toBe("human-2");
    // Registered but failing to load: the Human City 2 stands in too.
    const broken = resolveChibiWithFallbackV7(art, request("CITY:GOBLIN:2"));
    expect(
      broken.resolution.kind === "READY" && broken.resolution.asset.id,
    ).toBe("human-2");
    // Neither exists: the legacy city asset is drawn (MISSING).
    expect(
      resolveChibiWithFallbackV7(art, request("CITY:GOBLIN:3")).resolution,
    ).toEqual({ kind: "MISSING" });
  });

  it("registers City 1-3 for both factions on the Human canvases, anchors and overflow, with masks", () => {
    const bySubject = new Map(
      CHIBI_ART_ASSETS_V7.map((asset) => [asset.subject, asset]),
    );
    for (const level of [1, 2, 3] as const) {
      const human = bySubject.get(`CITY:${level}`);
      if (human === undefined) throw new Error(`CITY:${level}`);
      for (const faction of ["UNDEAD", "GOBLIN"] as const) {
        const asset = bySubject.get(`CITY:${faction}:${level}`);
        if (asset === undefined) throw new Error(`CITY:${faction}:${level}`);
        expect(asset.assetClass).toBe("SETTLEMENT");
        expect([asset.width, asset.height]).toEqual([
          human.width,
          human.height,
        ]);
        expect(asset.anchor).toEqual(human.anchor);
        expect(chibiOverflowV7(asset)).toEqual(chibiOverflowV7(human));
        expect(asset.ownerMaskUrl).toBe(
          asset.url.replace(/\.png$/, ".mask.png"),
        );
      }
    }
    // Neutral villages stay shared.
    expect(
      CHIBI_ART_ASSETS_V7.filter((asset) => asset.subject.startsWith("SITE:"))
        .map((asset) => asset.subject)
        .sort(),
    ).toEqual(["SITE:VILLAGE"]);
  });

  it("asks for the owner faction's city on the board and keeps the legacy asset", () => {
    const state = exploredAllV7(initialV7(1516));
    const live = viewForV7(state, state.humanPlayerId);
    const withFaction = (faction: FactionIdV7) => ({
      ...live,
      players: live.players.map((player) => ({ ...player, faction })),
    });
    const subjects = (faction: FactionIdV7) =>
      buildBoardRenderPlanV7(withFaction(faction), [], {
        selection: null,
        selectedUnitId: null,
        selectedAchievement: null,
      }).entries.filter((entry) => entry.kind === "CITY");
    expect(live.cities.length).toBeGreaterThan(0);
    for (const entry of subjects("ORIGINAL"))
      expect(entry.artSubject).toMatch(/^CITY:[123]$/);
    for (const faction of ["UNDEAD", "GOBLIN"] as const)
      for (const entry of subjects(faction)) {
        expect(entry.artSubject).toMatch(new RegExp(`^CITY:${faction}:[123]$`));
        // LEGACY draws by assetId, which no faction changes.
        expect(entry.assetId).toMatch(/^building-city-[123]$/);
      }
  });
});
