import { describe, expect, it } from "vitest";
import { readRaster } from "../../scripts/art/chibi/pipeline";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  buildChibiArtRegistryV7,
  type ArtSubjectV7,
} from "../../src/assets/chibi-art-v7";
import {
  viewForV7,
  type FactionIdV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
  type BoardRenderPlanEntryV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  createChibiArtResolverV7,
  type ChibiBoardArtV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";
import {
  FACTION_GRASS_IDS_V7,
  NEUTRAL_GROUND_ID_V7,
  factionGrassCellsV7,
  type FactionGrassArtV7,
} from "../../src/render/canvas/faction-grass-v7";
import {
  SNOW_EDGE_EAST_V7,
  SNOW_EDGE_WEST_V7,
} from "../../src/render/canvas/ice-folk-board-plan-v7";
import {
  riftCrackPixelsV7,
  riftGrassPixelV7,
} from "../../src/render/canvas/rift-presentation-v7";
import { victoryTerrainSkinV7 } from "../../src/render/canvas/victory-wave-v7";
import { LIVE_DIRECTION_V7 } from "../../src/render/canvas/visual-direction-v7";
import { dockTerrainSwatchV7 } from "../../src/render/dock-terrain-presentation-v7";
import {
  galleryTerrainLookV7,
  galleryTerrainPiecesV7,
} from "../../src/render/gallery-terrain-presentation-v7";
import { buildGalleryTerrainSampleV7 } from "../../src/render/gallery-terrain-sample-v7";
import { RIFT_UI_V7, riftUiFixtureV7 } from "../fixtures/v7-rift-ui";

// Bead pulp_wars-2yc.102. The user, 2026-10-18: "rift appears always on
// grass. it should appear on whatever the native terrain is." The Rift's
// crack lies on the ground of the territory it is in, like any land cell.

const GRASS = [137, 183, 91, 255] as const;
const key = (at: { readonly x: number; readonly y: number }): string =>
  `${at.x},${at.y}`;

/** A square of Grass with a dark crack across its middle rows. */
function crackedSquare(size: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      const crack = y >= 3 && y <= 5 && x >= 1 && x <= size - 2;
      pixels.set(crack ? [20, 16, 18, 255] : GRASS, (y * size + x) * 4);
    }
  return pixels;
}

describe("the crack of a Rift piece", () => {
  it("drops the Grass and keeps the crack, a green speck inside it too", () => {
    const size = 9;
    const pixels = crackedSquare(size);
    // A green speck enclosed by the chasm.
    pixels.set(GRASS, (4 * size + 4) * 4);
    const crack = riftCrackPixelsV7(pixels, size, size);
    const alpha = (x: number, y: number): number =>
      crack[(y * size + x) * 4 + 3] ?? -1;
    expect(alpha(0, 0)).toBe(0);
    expect(alpha(4, 1)).toBe(0);
    expect(alpha(4, 7)).toBe(0);
    expect(alpha(2, 3)).toBe(255);
    expect(alpha(2, 5)).toBe(255);
    expect(alpha(4, 4)).toBe(255);
    // The colours are untouched and the input is not changed.
    expect([
      ...crack.slice((3 * size + 2) * 4, (3 * size + 2) * 4 + 3),
    ]).toEqual([20, 16, 18]);
    expect(pixels[3]).toBe(255);
  });

  it("finds every Grass pixel of the accepted pieces and keeps their crack", async () => {
    const grass = await readRaster(
      "public/assets/chibi/terrain/chibi-grass-1.png",
    );
    for (let index = 0; index < 80 * 80; index += 1)
      expect(
        riftGrassPixelV7(
          grass.data[index * 4] ?? 0,
          grass.data[index * 4 + 1] ?? 0,
          grass.data[index * 4 + 2] ?? 0,
        ),
      ).toBe(true);
    for (const name of [
      "h-west",
      "h-middle",
      "h-east",
      "v-north",
      "v-middle",
      "v-south",
    ]) {
      const piece = await readRaster(
        `public/assets/chibi/terrain/chibi-rift-${name}.png`,
      );
      const crack = riftCrackPixelsV7(
        new Uint8ClampedArray(piece.data),
        80,
        80,
      );
      let kept = 0;
      for (let index = 0; index < 80 * 80; index += 1) {
        const same =
          piece.data[index * 4] === grass.data[index * 4] &&
          piece.data[index * 4 + 1] === grass.data[index * 4 + 1] &&
          piece.data[index * 4 + 2] === grass.data[index * 4 + 2];
        // No pixel of the Grass tile stays.
        if (same) expect(crack[index * 4 + 3], `${name} ${index}`).toBe(0);
        if ((crack[index * 4 + 3] ?? 0) > 0) kept += 1;
      }
      // The crack itself: the brown rim, the walls and the chasm.
      expect(kept, name).toBeGreaterThan(900);
      expect(kept, name).toBeLessThan(2600);
    }
  });

  it("is what the art resolver gives for a Rift subject, and nothing else changes", () => {
    const size = 80;
    const surfaces: Uint8ClampedArray[] = [];
    const resolver = createChibiArtResolverV7({
      redraw: () => undefined,
      environment: {
        loadImage(url, settle) {
          settle(true);
          return { url } as unknown as CanvasImageSource;
        },
        readPixels: () => crackedSquare(size),
        createSurface(pixels) {
          surfaces.push(pixels);
          return { surface: surfaces.length } as unknown as CanvasImageSource;
        },
      },
    });
    const resolve = (subject: ArtSubjectV7) =>
      resolver.resolve({ subject, at: { x: 0, y: 0 }, deviceScale: 1 });
    const rift = resolve("TERRAIN:RIFT_H_MIDDLE");
    if (rift.kind !== "READY") throw new Error("no Rift");
    expect(rift.image).toEqual({ surface: 1 });
    expect(surfaces[0]?.[3]).toBe(0);
    expect(surfaces[0]?.[(4 * size + 4) * 4 + 3]).toBe(255);
    // Cached: the crack is cut once.
    const again = resolve("TERRAIN:RIFT_H_MIDDLE");
    expect(again.kind === "READY" && again.image).toBe(rift.image);
    expect(surfaces).toHaveLength(1);
    const grass = resolve("TERRAIN:GRASS");
    expect(grass.kind === "READY" && "url" in grass.image).toBe(true);
  });
});

// ------------------------------------------------------------- the board

/**
 * The Rift fixture's view with the horizontal Rift inside the opponent's
 * territory, the opponent playing `faction`; the vertical Rift stays
 * outside every territory.
 */
function riftView(faction: FactionIdV7): PlayerViewV7 {
  const state = riftUiFixtureV7();
  const view = viewForV7(state, state.humanPlayerId);
  const owner = view.players.find((player) => player.id !== view.viewer.id);
  if (owner === undefined) throw new Error("no opponent");
  const inside = new Set(RIFT_UI_V7.horizontal.map(key));
  return {
    ...view,
    players: view.players.map((player) =>
      player.id === owner.id
        ? { ...player, faction }
        : { ...player, faction: "ORIGINAL" as const },
    ),
    board: {
      ...view.board,
      tiles: view.board.tiles.map((tile) =>
        !tile.explored
          ? tile
          : inside.has(key(tile.at))
            ? { ...tile, territoryOwnerId: owner.id }
            : tile.terrain === "RIFT"
              ? { ...tile, territoryOwnerId: null }
              : tile,
      ),
    },
  };
}

const INTERACTION = {
  selection: null,
  selectedUnitId: null,
  selectedAchievement: null,
} as const;

function riftEntries(view: PlayerViewV7): {
  readonly entries: readonly BoardRenderPlanEntryV7[];
  readonly inside: readonly BoardRenderPlanEntryV7[];
  readonly outside: readonly BoardRenderPlanEntryV7[];
} {
  const entries = buildBoardRenderPlanV7(view, [], INTERACTION).entries;
  const rift = entries.filter(
    (entry) => entry.kind === "TERRAIN" && entry.riftPiece !== undefined,
  );
  const inside = new Set(RIFT_UI_V7.horizontal.map(key));
  return {
    entries,
    inside: rift.filter((entry) => inside.has(key(entry.at))),
    outside: rift.filter((entry) => !inside.has(key(entry.at))),
  };
}

describe("a Rift on the board", () => {
  it("lies on the ground of each faction whose territory it is in", () => {
    for (const faction of FACTION_GRASS_IDS_V7) {
      const { entries, inside, outside } = riftEntries(riftView(faction));
      expect(inside).toHaveLength(3);
      expect(outside).toHaveLength(3);
      const cells = factionGrassCellsV7(entries);
      for (const entry of inside) {
        expect(entry.factionGrass, faction).toBe(faction);
        expect(entry.territoryGround).toBe(
          faction === "UNDEAD" ? "UNDEAD" : undefined,
        );
        expect(cells.get(key(entry.at)), faction).toMatchObject({
          own: faction,
          mountain: false,
        });
      }
      for (const entry of outside) {
        expect(entry.factionGrass).toBeUndefined();
        expect(entry.territoryGround).toBeUndefined();
      }
    }
  });

  it("lies on the default ground outside territory and in Human land", () => {
    const { inside, outside } = riftEntries(riftView("ORIGINAL"));
    for (const entry of [...inside, ...outside]) {
      expect(entry.factionGrass).toBeUndefined();
      expect(entry.territoryGround).toBeUndefined();
      expect(entry.snow).toBeUndefined();
    }
  });

  it("lies on Snow in Ice Folk land, and only there", () => {
    const { inside, outside } = riftEntries(riftView("ICE_FOLK"));
    for (const entry of inside) {
      expect(entry.factionGrass).toBeUndefined();
      expect(entry.snow).toBeDefined();
    }
    // The horizontal crack is one strip of Snow: no edge between its cells.
    const middle = inside.find((entry) => entry.riftPiece === "H_MIDDLE");
    expect(middle?.snow).toBeDefined();
    expect(
      (middle?.snow?.edges ?? -1) & (SNOW_EDGE_EAST_V7 | SNOW_EDGE_WEST_V7),
    ).toBe(0);
    for (const entry of outside) expect(entry.snow).toBeUndefined();
  });

  it("draws the Grass, then the territory's ground, then the crack", () => {
    const registry = buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7).registry;
    type Token = {
      readonly subject?: string;
      readonly ground?: string;
      readonly at: string;
    };
    const chibiArt: ChibiBoardArtV7 = {
      resolve(request) {
        const asset = registry.variants(request.subject)[0];
        if (asset === undefined) return { kind: "MISSING" };
        const image: Token = {
          subject: request.subject,
          at: key(request.at),
        };
        return {
          kind: "READY",
          asset,
          image: image as unknown as CanvasImageSource,
          density: 1,
          smoothing: false,
          cacheKey: request.subject,
        };
      },
    };
    const grassArt: FactionGrassArtV7 = {
      tile: (id, _variant, at) =>
        ({ ground: id, at: key(at ?? { x: -1, y: -1 }) }) as Token &
          CanvasImageSource,
      spill: () => null,
    };
    const drawnAt = (faction: FactionIdV7, at: string): string[] => {
      const view = riftView(faction);
      const drawn: string[] = [];
      const context = new Proxy(
        {},
        {
          get: (target, name) =>
            name === "canvas"
              ? undefined
              : name === "measureText"
                ? (text: string) => ({ width: text.length * 6 })
                : name === "createLinearGradient" ||
                    name === "createRadialGradient"
                  ? () => ({ addColorStop: () => undefined })
                  : name === "drawImage"
                    ? (image: Token) => {
                        if (image?.at === at)
                          drawn.push(image.subject ?? `ground:${image.ground}`);
                      }
                    : name in target
                      ? Reflect.get(target, name)
                      : () => undefined,
          set: (target, name, value) => Reflect.set(target, name, value),
        },
      ) as CanvasRenderingContext2D;
      drawBoardV7({
        context,
        viewport: { width: 1600, height: 1600 },
        devicePixelRatio: 1,
        camera: { offsetX: 100, offsetY: 100, zoom: 1 },
        plan: buildBoardRenderPlanV7(view, [], INTERACTION),
        chibiArt,
        direction: { spec: LIVE_DIRECTION_V7, art: chibiArt },
        factionGrassArt: { resolve: () => grassArt },
      });
      return drawn;
    };
    const west = key(RIFT_UI_V7.horizontal[0]);
    expect(drawnAt("GOBLIN", west)).toEqual([
      "TERRAIN:GRASS",
      "ground:GOBLIN",
      "TERRAIN:RIFT_H_WEST",
    ]);
    expect(drawnAt("MARTIAN", west)).toEqual([
      "TERRAIN:GRASS",
      "ground:MARTIAN",
      "TERRAIN:RIFT_H_WEST",
    ]);
    // Outside every territory: the default ground.
    expect(drawnAt("GOBLIN", key(RIFT_UI_V7.vertical[0]))).toEqual([
      "TERRAIN:GRASS",
      `ground:${NEUTRAL_GROUND_ID_V7}`,
      "TERRAIN:RIFT_V_NORTH",
    ]);
  });

  it("takes the winner's ground in the victory wave, Snow for the Ice Folk", () => {
    expect(victoryTerrainSkinV7("RIFT", "GOBLIN")).toEqual({
      factionGrass: "GOBLIN",
      snow: false,
    });
    expect(victoryTerrainSkinV7("RIFT", "UNDEAD")).toEqual({
      territoryGround: "UNDEAD",
      factionGrass: "UNDEAD",
      snow: false,
    });
    expect(victoryTerrainSkinV7("RIFT", "ICE_FOLK")).toEqual({ snow: true });
    expect(victoryTerrainSkinV7("RIFT", "ORIGINAL")).toEqual({ snow: false });
  });
});

// ------------------------------------------------ the dock and the Gallery

describe("a Rift in the tile dock and the Gallery", () => {
  const dock = (faction: FactionIdV7 | null, live = true) =>
    dockTerrainSwatchV7({
      terrain: "RIFT",
      mined: false,
      faction,
      snow: false,
      live,
      riftPiece: "H_MIDDLE",
    });

  it("shows the dock's Rift on its territory's ground", () => {
    const goblin = dock("GOBLIN");
    expect(goblin?.box).toEqual({ kind: "CELL", rise: 0 });
    expect(goblin?.layers.at(-1)).toEqual({
      kind: "SUBJECT",
      subject: "TERRAIN:RIFT_H_MIDDLE",
      at: { x: 0, y: 0 },
    });
    const ground = (faction: FactionIdV7 | null, live = true) =>
      dock(faction, live)?.layers.slice(0, -1);
    expect(ground("GOBLIN")).toEqual([
      expect.objectContaining({ kind: "RASTER" }),
    ]);
    expect(JSON.stringify(ground("GOBLIN"))).toMatch(/goblin/i);
    expect(JSON.stringify(ground(null))).toMatch(/neutral/i);
    expect(ground("ICE_FOLK")?.at(-1)).toEqual({ kind: "SNOW", variant: 0 });
    // The classic look: the Grass tile.
    expect(ground("GOBLIN", false)).toEqual([
      { kind: "SUBJECT", subject: "TERRAIN:GRASS", at: { x: 0, y: 0 } },
    ]);
    // A dock request without a piece keeps the master.
    expect(
      dockTerrainSwatchV7({
        terrain: "RIFT",
        mined: false,
        faction: "GOBLIN",
        snow: false,
        live: true,
      }),
    ).toBeNull();
  });

  it("gives the Gallery's Rift a column per faction, each on its ground", () => {
    for (const faction of FACTION_GRASS_IDS_V7) {
      expect(galleryTerrainLookV7("RIFT", faction)).toBe("OWN");
      const pieces = galleryTerrainPiecesV7("RIFT", faction);
      const grass = galleryTerrainPiecesV7("GRASS", faction)[0];
      expect(pieces).toHaveLength(6);
      for (const piece of pieces)
        expect(piece.layers.slice(0, -1)).toEqual(grass?.layers);
    }
    expect(galleryTerrainLookV7("RIFT", "ICE_FOLK")).toBe("OWN");
    expect(
      galleryTerrainPiecesV7("RIFT", "ICE_FOLK")[0]?.layers.at(-2),
    ).toEqual({ kind: "SNOW", variant: 0 });
    expect(
      galleryTerrainPiecesV7("RIFT", null)[0]?.layers.slice(0, -1),
    ).toEqual(galleryTerrainPiecesV7("GRASS", null)[0]?.layers);
  });

  it("puts one crack of the Gallery's sample inside the borders, one beyond", () => {
    const view = buildGalleryTerrainSampleV7("RIFT", "MARTIAN");
    if (view === null) throw new Error("no sample");
    const rift = view.board.tiles.flatMap((tile) =>
      tile.explored && tile.terrain === "RIFT" ? [tile] : [],
    );
    expect(rift).toHaveLength(6);
    const owned = rift.filter(
      (tile) => tile.territoryOwnerId === view.viewer.id,
    );
    expect(owned.map((tile) => key(tile.at)).sort()).toEqual([
      "3,5",
      "4,5",
      "5,5",
    ]);
    expect(
      rift
        .filter((tile) => tile.territoryOwnerId === null)
        .map((tile) => key(tile.at))
        .sort(),
    ).toEqual(["6,2", "6,3", "6,4"]);
  });
});
