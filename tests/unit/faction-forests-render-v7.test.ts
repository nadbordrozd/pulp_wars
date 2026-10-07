import { describe, expect, it, vi } from "vitest";
import { viewForV7, type FactionIdV7 } from "../../src/engine/index";
import { CHIBI_FOREST_ART_SET_V7 } from "../../src/assets/chibi-forest-pieces-manifest";
import { FACTION_FOREST_ART_SETS_V7 } from "../../src/assets/faction-forest-pieces-manifest";
import record from "../../src/assets/faction-forest-pieces.json";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import { FOREST_SHAPE_IDS_V7 } from "../../src/render/canvas/chibi-forest-packing-v7";
import {
  createChibiForestArtV7,
  type ChibiForestArtV7,
  type ChibiForestRasterEnvironmentV7,
} from "../../src/render/canvas/chibi-forest-v7";
import {
  FACTION_FORESTS_ENABLED_V7,
  FACTION_FOREST_FLOOR_V7,
  FACTION_FOREST_IDS_V7,
  FACTION_FOREST_SNOW_LADEN_V7,
  FACTION_FOREST_STRIDE_V7,
  createFactionForestArtV7,
  factionForestCellsOfV7,
  factionForestCellsV7,
  factionForestIdV7,
  factionForestPlanMemberV7,
  factionForestsEnabledV7,
  type FactionForestCountsV7,
  type FactionForestEntryV7,
  type FactionForestIdV7,
} from "../../src/render/canvas/faction-forests-v7";
import { exploredAllV7, initialV7 } from "../fixtures/v7-builders";

/**
 * pulp_wars-2yc.2 (docs/art/FACTION_FORESTS.md): inside a faction's
 * territory a Forest cell is drawn with that faction's own piece set.
 */

const forest = (
  x: number,
  y: number,
  faction?: FactionForestIdV7,
): FactionForestEntryV7 => ({
  kind: "TERRAIN",
  at: { x, y },
  artSubject: "TERRAIN:FOREST",
  ...(faction === undefined ? {} : { factionForest: faction }),
});

const VARIANTS = Object.fromEntries(
  FOREST_SHAPE_IDS_V7.map((shape) => [shape, 3]),
) as Record<(typeof FOREST_SHAPE_IDS_V7)[number], number>;
const allReady: FactionForestCountsV7 = () => ({
  variants: VARIANTS,
  clumps: 4,
});

describe("the faction forests switch and sets", () => {
  it("is on by default and the query string overrides it", () => {
    expect(FACTION_FORESTS_ENABLED_V7).toBe(true);
    expect(factionForestsEnabledV7("")).toBe(true);
    for (const off of ["0", "off", "false"])
      expect(factionForestsEnabledV7(`?art=chibi&faction-forests=${off}`)).toBe(
        false,
      );
    expect(factionForestsEnabledV7("?faction-forests=1")).toBe(true);
    expect(factionForestsEnabledV7()).toBe(true);
  });

  it("gives seven factions a forest; Humans keep the default", () => {
    const own: FactionIdV7[] = [
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "DWARF",
      "CANDY",
      // The tundra forest (pulp_wars-2yc.38), last: the set numbers of
      // the six before it are what they were.
      "ICE_FOLK",
    ];
    expect(FACTION_FOREST_IDS_V7.at(-1)).toBe("ICE_FOLK");
    expect([...FACTION_FOREST_IDS_V7].sort()).toEqual([...own].sort());
    for (const faction of own) expect(factionForestIdV7(faction)).toBe(faction);
    expect(factionForestIdV7("ORIGINAL")).toBeNull();
    expect(factionForestIdV7(null)).toBeNull();
    expect(factionForestPlanMemberV7("FOREST", "GOBLIN")).toEqual({
      factionForest: "GOBLIN",
    });
    for (const terrain of ["GRASS", "MOUNTAIN", "SHALLOW_WATER"])
      expect(factionForestPlanMemberV7(terrain, "GOBLIN")).toEqual({});
    expect(factionForestPlanMemberV7("FOREST", "ORIGINAL")).toEqual({});
    expect(factionForestPlanMemberV7("FOREST", "ICE_FOLK")).toEqual({
      factionForest: "ICE_FOLK",
    });
  });

  it("has a whole piece set per faction: the default set's shapes and counts, its own files", () => {
    const shapes = (set: typeof CHIBI_FOREST_ART_SET_V7): string[] =>
      set.pieces.map((piece) => `${piece.shape}#${piece.variant}`).sort();
    const urls = new Set<string>();
    for (const id of FACTION_FOREST_IDS_V7) {
      const set = FACTION_FOREST_ART_SETS_V7[id];
      expect(shapes(set)).toEqual(shapes(CHIBI_FOREST_ART_SET_V7));
      expect(set.clumps.length).toBeGreaterThanOrEqual(3);
      expect(set.clumps.length).toBeLessThan(FACTION_FOREST_STRIDE_V7);
      for (const piece of [...set.pieces, ...set.clumps]) {
        expect(piece.url).toContain(
          `/forest/${id.toLowerCase().replaceAll("_", "-")}/`,
        );
        expect(urls.has(piece.url)).toBe(false);
        urls.add(piece.url);
      }
      // Stamped unmirrored (the light is from the bottom left).
      expect(record.sets[id].bead).toBe("pulp_wars-2yc.2");
    }
    for (const colour of Object.values(FACTION_FOREST_FLOOR_V7)) {
      expect(colour).toHaveLength(4);
      // A veil, about an eighth opaque.
      expect(colour[3]).toBeGreaterThan(24);
      expect(colour[3]).toBeLessThan(44);
    }
  });

  it("follows the territory's owner in the board plan", () => {
    const state = exploredAllV7(initialV7(1516));
    const live = viewForV7(state, state.humanPlayerId);
    const withOpponent = (faction: FactionIdV7) => ({
      ...live,
      board: {
        ...live.board,
        // Every explored land tile of the opponent's territory is Forest.
        tiles: live.board.tiles.map((tile) =>
          tile.explored &&
          tile.terrain === "GRASS" &&
          tile.territoryOwnerId !== null &&
          tile.territoryOwnerId !== live.viewer.id &&
          tile.site === null
            ? { ...tile, terrain: "FOREST" as const, improvement: null }
            : tile,
        ),
      },
      players: live.players.map((player) => ({
        ...player,
        faction: player.id === live.viewer.id ? ("ORIGINAL" as const) : faction,
      })),
    });
    const interaction = {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    } as const;
    const marked = (faction: FactionIdV7) =>
      buildBoardRenderPlanV7(
        withOpponent(faction),
        [],
        interaction,
      ).entries.filter((entry) => entry.factionForest !== undefined);
    const goblin = marked("GOBLIN");
    expect(goblin.length).toBeGreaterThan(0);
    for (const entry of goblin) {
      expect(entry.kind).toBe("TERRAIN");
      expect(entry.factionForest).toBe("GOBLIN");
    }
    // A capture: the same cells under another owner's faction.
    const martian = marked("MARTIAN");
    expect(martian.map((entry) => entry.key)).toEqual(
      goblin.map((entry) => entry.key),
    );
    expect(martian.every((entry) => entry.factionForest === "MARTIAN")).toBe(
      true,
    );
    // The Ice Folk tundra forest follows the owner like every other.
    const iceFolk = marked("ICE_FOLK");
    expect(iceFolk.map((entry) => entry.key)).toEqual(
      goblin.map((entry) => entry.key),
    );
    expect(iceFolk.every((entry) => entry.factionForest === "ICE_FOLK")).toBe(
      true,
    );
    expect(marked("ORIGINAL")).toEqual([]);
  });
});

describe("the faction forest cells", () => {
  it("is the default packing when no cell has a faction", () => {
    const entries = [forest(0, 0), forest(1, 0), forest(0, 1), forest(1, 1)];
    const { cells, sets } = factionForestCellsV7(entries, allReady);
    expect(sets.size).toBe(0);
    expect(cells.size).toBe(4);
    for (const cell of cells.values())
      for (const piece of cell.bodies)
        expect(piece.variant).toBeLessThan(FACTION_FOREST_STRIDE_V7);
  });

  it("packs each faction's Forest on its own: no piece crosses the border", () => {
    // One 2 x 2 block, its west column default and its east column Goblin.
    const entries = [
      forest(0, 0),
      forest(1, 0, "GOBLIN"),
      forest(0, 1),
      forest(1, 1, "GOBLIN"),
    ];
    const { cells, sets } = factionForestCellsV7(entries, allReady);
    const goblin = FACTION_FOREST_IDS_V7.indexOf("GOBLIN") + 1;
    expect([...sets.entries()].sort()).toEqual([
      ["1,0", goblin],
      ["1,1", goblin],
    ]);
    const pieces = [...cells.entries()].flatMap(([at, cell]) =>
      cell.bodies.map((piece) => ({ at, piece })),
    );
    for (const { at, piece } of pieces) {
      const set = Math.floor(piece.variant / FACTION_FOREST_STRIDE_V7);
      // A piece anchored on a Goblin cell is a Goblin piece one cell wide.
      expect(set).toBe(sets.get(at) ?? 0);
      expect(["1x1", "1x2"]).toContain(piece.shape);
      expect(piece.variant % FACTION_FOREST_STRIDE_V7).toBeLessThan(3);
    }
    // Both columns are covered: two cells each.
    expect(pieces.length).toBeGreaterThanOrEqual(2);
    // The shade is cut back along the border on both sides, and no seam
    // clump is drawn across it.
    for (const at of ["0,0", "0,1"]) {
      expect(cells.get(at)?.eastSeam).toBeNull();
      expect((cells.get(at)?.edges ?? 0) !== 0).toBe(true);
    }
    // Bands carry the same shifted piece as the bodies.
    for (const cell of cells.values())
      for (const band of cell.bands)
        expect(Math.floor(band.piece.variant / FACTION_FOREST_STRIDE_V7)).toBe(
          sets.get(`${band.piece.x},${band.piece.y}`) ?? 0,
        );
  });

  it("shifts a faction's seam clumps too", () => {
    // A long Goblin wood: several pieces, so seams between them.
    const entries: FactionForestEntryV7[] = [];
    for (let x = 0; x < 6; x += 1)
      for (let y = 0; y < 2; y += 1) entries.push(forest(x, y, "GOBLIN"));
    const { cells } = factionForestCellsV7(entries, allReady);
    const shift =
      (FACTION_FOREST_IDS_V7.indexOf("GOBLIN") + 1) * FACTION_FOREST_STRIDE_V7;
    const seams = [...cells.values()].flatMap((cell) =>
      [cell.eastSeam, cell.northSeam].filter(
        (seam): seam is number => seam !== null,
      ),
    );
    expect(seams.length).toBeGreaterThan(0);
    for (const seam of seams) {
      expect(seam).toBeGreaterThanOrEqual(shift);
      expect(seam).toBeLessThan(shift + 4);
    }
  });

  it("draws a faction's Forest as the default one until its set is ready", () => {
    const entries = [forest(0, 0, "MARTIAN"), forest(1, 0)];
    const onlyDefault: FactionForestCountsV7 = (set) =>
      set === 0 ? { variants: VARIANTS, clumps: 4 } : null;
    const { cells, sets } = factionForestCellsV7(entries, onlyDefault);
    expect(sets.size).toBe(0);
    expect(cells.size).toBe(2);
  });
});

describe("the faction forest art", () => {
  function harness() {
    const loaded: string[] = [];
    const surfaces: { pixels: Uint8ClampedArray }[] = [];
    const environment: ChibiForestRasterEnvironmentV7 = {
      loadImage(url, settle) {
        loaded.push(url);
        settle(true);
        return { url } as unknown as CanvasImageSource;
      },
      readPixels: (_image, width, height) =>
        new Uint8ClampedArray(width * height * 4).fill(200),
      createSurface(pixels) {
        const surface = { pixels };
        surfaces.push(surface);
        return surface as unknown as CanvasImageSource;
      },
    };
    const base = createChibiForestArtV7({
      environment,
      redraw: vi.fn(),
      set: CHIBI_FOREST_ART_SET_V7,
    });
    const art = createFactionForestArtV7({
      environment,
      redraw: vi.fn(),
      base,
      sets: FACTION_FOREST_ART_SETS_V7,
    });
    return { art, base, loaded };
  }
  const resolved = (art: {
    resolve(): ChibiForestArtV7 | null;
  }): ChibiForestArtV7 => {
    const value = art.resolve();
    if (value === null) throw new Error("no art");
    return value;
  };

  it("loads a faction's set only when a plan shows its Forest", () => {
    const { art, loaded } = harness();
    const composite = resolved(art);
    const defaults =
      CHIBI_FOREST_ART_SET_V7.pieces.length +
      CHIBI_FOREST_ART_SET_V7.clumps.length;
    expect(loaded.length).toBe(defaults);
    expect(
      factionForestCellsOfV7([forest(0, 0), forest(1, 0)], composite, true),
    ).not.toBeNull();
    expect(loaded.length).toBe(defaults);
    factionForestCellsOfV7([forest(0, 0, "CANDY")], composite, true);
    const candy = FACTION_FOREST_ART_SETS_V7.CANDY;
    expect(loaded.length).toBe(
      defaults + candy.pieces.length + candy.clumps.length,
    );
    expect(loaded.at(-1)).toContain("/forest/candy/");
  });

  it("hands each piece, band, seam clump and shade to its faction's set", () => {
    const { art, base } = harness();
    const composite = resolved(art);
    const plain = resolved(base);
    const entries = [forest(0, 0), forest(4, 0, "MARTIAN")];
    const cells = factionForestCellsOfV7(entries, composite, true);
    if (cells === null) throw new Error("not the faction art");
    const martian = cells.get("4,0")?.bodies[0];
    const own = cells.get("0,0")?.bodies[0];
    if (martian === undefined || own === undefined) throw new Error("no piece");
    const set = FACTION_FOREST_IDS_V7.indexOf("MARTIAN") + 1;
    expect(Math.floor(martian.variant / FACTION_FOREST_STRIDE_V7)).toBe(set);
    // The default cell is exactly the default art's.
    expect(composite.body(own.shape, own.variant)).toEqual(
      plain.body(own.shape, own.variant),
    );
    expect(composite.variants).toEqual(plain.variants);
    // The Martian piece is a raster of its own.
    const part = composite.body(martian.shape, martian.variant);
    expect(part.length).toBeGreaterThan(0);
    expect(part[0]?.image).not.toBe(
      plain.body(martian.shape, martian.variant % FACTION_FOREST_STRIDE_V7)[0]
        ?.image,
    );
    expect(composite.band(martian.shape, martian.variant, 0, 0)).not.toBeNull();
    // Its seam clumps sit at the set's stride in the clump list.
    expect(composite.clumps[set * FACTION_FOREST_STRIDE_V7]).toBeDefined();
    expect(composite.clumps[0]).toBe(plain.clumps[0]);
    // The shade: the default veil on the default cell, the dust tone on Mars.
    const pixelOf = (image: CanvasImageSource | null): number[] => [
      ...(image as unknown as { pixels: Uint8ClampedArray }).pixels.subarray(
        0,
        4,
      ),
    ];
    expect(composite.floor({ x: 0, y: 0 }, 0)).toBe(
      plain.floor({ x: 0, y: 0 }, 0),
    );
    expect(pixelOf(composite.floor({ x: 4, y: 0 }, 0))).toEqual([
      ...FACTION_FOREST_FLOOR_V7.MARTIAN,
    ]);
    expect(composite.floor({ x: 4, y: 0 }, 0)).toBe(
      composite.floor({ x: 4, y: 0 }, 0),
    );
  });

  it("marks the tundra forest's rasters as snow-laden, and no other set's", () => {
    // Bead pulp_wars-2yc.38: the tundra trees are drawn with their snow,
    // so the board puts no snow caps on them; every other tree on Snow
    // (a Human wood under a Blizzard) is capped as before.
    expect(FACTION_FOREST_SNOW_LADEN_V7).toEqual(["ICE_FOLK"]);
    const { art, base } = harness();
    const composite = resolved(art);
    expect(resolved(base).snowLaden).toBeUndefined();
    const cells = factionForestCellsOfV7(
      [forest(0, 0), forest(4, 0, "ICE_FOLK"), forest(8, 0, "DWARF")],
      composite,
      true,
    );
    const imagesAt = (key: string): CanvasImageSource[] => {
      const cell = cells?.get(key);
      if (cell === undefined) throw new Error(`no cell ${key}`);
      return [
        ...cell.bodies.flatMap((piece) =>
          composite.body(piece.shape, piece.variant).map((part) => part.image),
        ),
        ...cell.bands.flatMap((band) => {
          const image = composite.band(
            band.piece.shape,
            band.piece.variant,
            band.column,
            band.row,
          );
          return image === null ? [] : [image];
        }),
      ];
    };
    const tundra = imagesAt("4,0");
    expect(tundra.length).toBeGreaterThan(1);
    for (const image of tundra) expect(composite.snowLaden?.(image)).toBe(true);
    for (const key of ["0,0", "8,0"])
      for (const image of imagesAt(key))
        expect(composite.snowLaden?.(image)).toBe(false);
    const set = FACTION_FOREST_IDS_V7.indexOf("ICE_FOLK") + 1;
    const clump = composite.clumps[set * FACTION_FOREST_STRIDE_V7];
    if (clump === undefined) throw new Error("no tundra seam clump");
    expect(composite.snowLaden?.(clump.image)).toBe(true);
    const plain = composite.clumps[0];
    if (plain === undefined) throw new Error("no default seam clump");
    expect(composite.snowLaden?.(plain.image)).toBe(false);
  });

  it("draws every Forest as the default one in the classic look", () => {
    const { art, loaded } = harness();
    const composite = resolved(art);
    const before = loaded.length;
    const cells = factionForestCellsOfV7(
      [forest(0, 0, "GOBLIN"), forest(1, 0, "GOBLIN")],
      composite,
      false,
    );
    expect(loaded.length).toBe(before);
    for (const cell of cells?.values() ?? [])
      for (const piece of cell.bodies)
        expect(piece.variant).toBeLessThan(FACTION_FOREST_STRIDE_V7);
  });

  it("is not claimed for any other forest art: the board packs as before", () => {
    const { base } = harness();
    expect(factionForestCellsOfV7([forest(0, 0)], resolved(base), true)).toBe(
      null,
    );
  });
});
