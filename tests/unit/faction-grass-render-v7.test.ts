import { describe, expect, it, vi } from "vitest";
import { viewForV7, type FactionIdV7 } from "../../src/engine/index";
import { FACTION_GRASS_TILES_V7 } from "../../src/assets/faction-grass-manifest";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import type { ChibiForestRasterEnvironmentV7 } from "../../src/render/canvas/chibi-forest-v7";
import {
  FACTION_GRASS_ENABLED_V7,
  FACTION_GRASS_IDS_V7,
  FACTION_GRASS_PHASES_V7,
  FACTION_GRASS_SPILL_V7,
  GRASS_E,
  GRASS_N,
  GRASS_NW,
  GRASS_S,
  GRASS_W,
  createFactionGrassArtV7,
  drawFactionGrassV7,
  factionGrassCellsV7,
  factionGrassEnabledV7,
  factionGrassGladeLayersV7,
  factionGrassIdV7,
  factionGrassPlanMemberV7,
  factionGrassSpillMaskV7,
  factionGrassSpillPixelsV7,
  type FactionGrassEntryV7,
  type FactionGrassIdV7,
} from "../../src/render/canvas/faction-grass-v7";
import { exploredAllV7, initialV7 } from "../fixtures/v7-builders";

/**
 * EXPERIMENT pulp_wars-2o7.4 (docs/art/FACTION_GRASS.md): the Grass inside a
 * faction's territory is that faction's own, with a soft border. Delete
 * this file with the experiment.
 */

const CELL = 80;

function entry(
  x: number,
  y: number,
  grass?: FactionGrassIdV7,
  subject = "TERRAIN:GRASS",
): FactionGrassEntryV7 {
  return {
    kind: "TERRAIN",
    at: { x, y },
    artSubject: subject,
    ...(grass === undefined ? {} : { factionGrass: grass }),
  };
}

describe("the faction grass switch", () => {
  it("is on by default and the query string overrides it", () => {
    expect(FACTION_GRASS_ENABLED_V7).toBe(true);
    expect(factionGrassEnabledV7("")).toBe(true);
    expect(factionGrassEnabledV7("?art=chibi")).toBe(true);
    for (const off of ["0", "off", "false", "OFF"])
      expect(factionGrassEnabledV7(`?faction-grass=${off}`)).toBe(false);
    expect(factionGrassEnabledV7("?art=chibi&faction-grass=0")).toBe(false);
    expect(factionGrassEnabledV7("?faction-grass=1")).toBe(true);
    expect(factionGrassEnabledV7("?faction-grass=maybe")).toBe(true);
    // Outside a browser there is no query string.
    expect(factionGrassEnabledV7()).toBe(true);
  });

  it("gives every faction but the Humans and the Ice Folk a ground", () => {
    const expected: Record<FactionIdV7, FactionGrassIdV7 | null> = {
      ORIGINAL: null,
      UNDEAD: "UNDEAD",
      GOBLIN: "GOBLIN",
      DINOSAUR: "DINOSAUR",
      MARTIAN: "MARTIAN",
      // Ice Folk territory is Snow, by rule.
      ICE_FOLK: null,
      DWARF: "DWARF",
      CANDY: "CANDY",
    };
    for (const [faction, id] of Object.entries(expected))
      expect(factionGrassIdV7(faction as FactionIdV7)).toBe(id);
    expect(factionGrassIdV7(null)).toBeNull();
    expect(new Set(FACTION_GRASS_IDS_V7).size).toBe(6);
  });

  it("has three tiles per ground, the Undead ones toned like Grass", () => {
    for (const id of FACTION_GRASS_IDS_V7) {
      const tiles = FACTION_GRASS_TILES_V7.filter((tile) => tile.id === id);
      expect(tiles.map((tile) => tile.variant)).toEqual([0, 1, 2]);
      for (const tile of tiles)
        expect(tile.toned === true).toBe(id === "UNDEAD");
    }
  });
});

describe("the faction grass plan member", () => {
  it("marks Grass, Forest and Mountain cells of a faction with a ground only", () => {
    expect(factionGrassPlanMemberV7("GRASS", "GOBLIN")).toEqual({
      factionGrass: "GOBLIN",
    });
    expect(factionGrassPlanMemberV7("FOREST", "CANDY")).toEqual({
      factionGrass: "CANDY",
    });
    expect(factionGrassPlanMemberV7("MOUNTAIN", "UNDEAD")).toEqual({
      factionGrass: "UNDEAD",
    });
    for (const terrain of ["SHALLOW_WATER", "DEEP_WATER", "RIFT"])
      expect(factionGrassPlanMemberV7(terrain, "GOBLIN")).toEqual({});
    expect(factionGrassPlanMemberV7("GRASS", "ORIGINAL")).toEqual({});
    expect(factionGrassPlanMemberV7("GRASS", "ICE_FOLK")).toEqual({});
    expect(factionGrassPlanMemberV7("GRASS", null)).toEqual({});
  });

  it("follows the territory's owner in the board plan", () => {
    const state = exploredAllV7(initialV7(1516));
    const live = viewForV7(state, state.humanPlayerId);
    const withOpponent = (faction: FactionIdV7) => ({
      ...live,
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
    const view = withOpponent("GOBLIN");
    const tileAt = new Map(
      view.board.tiles.map((tile) => [`${tile.at.x},${tile.at.y}`, tile]),
    );
    let inside = 0;
    for (const item of buildBoardRenderPlanV7(view, [], interaction).entries) {
      if (item.kind !== "TERRAIN") {
        expect(item.factionGrass).toBeUndefined();
        continue;
      }
      const tile = tileAt.get(`${item.at.x},${item.at.y}`);
      if (tile === undefined || !tile.explored) throw new Error("no tile");
      const expected =
        tile.territoryOwnerId !== null &&
        tile.territoryOwnerId !== view.viewer.id &&
        (tile.terrain === "GRASS" ||
          tile.terrain === "FOREST" ||
          tile.terrain === "MOUNTAIN");
      expect(item.factionGrass).toBe(expected ? "GOBLIN" : undefined);
      if (expected) inside += 1;
    }
    expect(inside).toBeGreaterThan(0);
    // A capture: the same cells under another owner's faction.
    const captured = buildBoardRenderPlanV7(
      withOpponent("MARTIAN"),
      [],
      interaction,
    ).entries.filter((item) => item.factionGrass !== undefined);
    expect(captured.length).toBe(inside);
    expect(captured.every((item) => item.factionGrass === "MARTIAN")).toBe(
      true,
    );
    // Humans against Ice Folk: no entry carries the member at all.
    for (const item of buildBoardRenderPlanV7(
      withOpponent("ICE_FOLK"),
      [],
      interaction,
    ).entries)
      expect(Object.keys(item)).not.toContain("factionGrass");
  });
});

describe("the faction grass cells", () => {
  it("draws nothing on a board without a faction ground", () => {
    expect(factionGrassCellsV7([entry(0, 0), entry(1, 0)]).size).toBe(0);
  });

  it("gives a faction cell its tile and its neighbours a spill", () => {
    const cells = factionGrassCellsV7([
      entry(0, 0),
      entry(1, 0, "GOBLIN"),
      entry(2, 0, "GOBLIN"),
      entry(0, 1),
      entry(1, 1),
      entry(3, 3),
    ]);
    expect(cells.get("1,0")).toMatchObject({ own: "GOBLIN", spills: [] });
    expect(cells.get("0,0")).toMatchObject({
      own: null,
      mountain: false,
      spills: [{ id: "GOBLIN", neighbours: GRASS_E }],
    });
    // South of one Goblin cell and diagonal to the other.
    expect(cells.get("1,1")?.spills).toEqual([
      { id: "GOBLIN", neighbours: GRASS_N | 16 },
    ]);
    expect(cells.get("0,1")?.spills).toEqual([
      { id: "GOBLIN", neighbours: 16 },
    ]);
    // Far away: nothing to draw.
    expect(cells.has("3,3")).toBe(false);
    for (const cell of cells.values()) {
      expect(cell.variant).toBeGreaterThanOrEqual(0);
      expect(cell.variant).toBeLessThan(3);
      expect(cell.phase).toBeLessThan(FACTION_GRASS_PHASES_V7 ** 2);
    }
  });

  it("lets the higher rank spill over the lower, never both ways", () => {
    const cells = factionGrassCellsV7([
      entry(0, 0, "CANDY"),
      entry(1, 0, "DINOSAUR"),
    ]);
    expect(cells.get("0,0")).toMatchObject({
      own: "CANDY",
      spills: [{ id: "DINOSAUR", neighbours: GRASS_E }],
    });
    expect(cells.get("1,0")).toMatchObject({ own: "DINOSAUR", spills: [] });
  });

  it("leaves an Undead cell to its gloam tile and softens its border", () => {
    const cells = factionGrassCellsV7([
      entry(0, 0),
      entry(1, 0, "UNDEAD"),
      entry(2, 0, "UNDEAD"),
    ]);
    // The cell itself is the terrain tile; an inner cell draws nothing.
    expect(cells.has("1,0")).toBe(false);
    expect(cells.has("2,0")).toBe(false);
    expect(cells.get("0,0")?.spills).toEqual([
      { id: "UNDEAD", neighbours: GRASS_E },
    ]);
  });

  it("reads terrain entries with Grass only: no fog, water or Rift", () => {
    const cells = factionGrassCellsV7([
      { kind: "FOG", at: { x: 0, y: 0 } },
      entry(1, 0, "GOBLIN"),
      entry(2, 0, undefined, "TERRAIN:SHALLOW_WATER"),
      entry(1, 1, undefined, "TERRAIN:RIFT_H_MIDDLE"),
      entry(0, 1, undefined, "TERRAIN:MOUNTAIN"),
      { kind: "UNIT", at: { x: 1, y: 0 }, artSubject: "UNIT:FIGHTER" },
    ]);
    expect([...cells.keys()].sort()).toEqual(["0,1", "1,0"]);
    expect(cells.get("0,1")?.mountain).toBe(true);
  });
});

describe("the faction grass spill mask", () => {
  const covered = (mask: Uint8Array, x: number, y: number): boolean =>
    (mask[y * CELL + x] ?? 0) > 0;

  it("is empty without a neighbour and hugs the edges it is given", () => {
    expect(factionGrassSpillMaskV7(0, 0).some((value) => value > 0)).toBe(
      false,
    );
    const { width, waves, speckReach } = FACTION_GRASS_SPILL_V7;
    const most = width + waves[0] + waves[1] + waves[2] + speckReach + 2;
    const least = width - waves[0] - waves[1] - waves[2];
    expect(least).toBeGreaterThan(0);
    for (let phase = 0; phase < FACTION_GRASS_PHASES_V7 ** 2; phase += 1) {
      const north = factionGrassSpillMaskV7(GRASS_N, phase);
      const west = factionGrassSpillMaskV7(GRASS_W, phase);
      for (let at = 0; at < CELL; at += 1) {
        expect(covered(north, at, 0)).toBe(true);
        expect(covered(west, 0, at)).toBe(true);
        for (let far = Math.ceil(most); far < CELL; far += 1) {
          expect(covered(north, at, far)).toBe(false);
          expect(covered(west, far, at)).toBe(false);
        }
      }
      // A corner neighbour: a blob at that corner only.
      const corner = factionGrassSpillMaskV7(GRASS_NW, phase);
      expect(covered(corner, 0, 0)).toBe(true);
      expect(covered(corner, CELL - 1, 0)).toBe(false);
      expect(covered(corner, 0, CELL - 1)).toBe(false);
    }
  });

  it("is not a straight line, and differs from phase to phase", () => {
    const depth = (mask: Uint8Array, x: number): number => {
      let y = 0;
      while (y < CELL && covered(mask, x, y)) y += 1;
      return y;
    };
    const first = factionGrassSpillMaskV7(GRASS_N, 0);
    const depths = new Set<number>();
    for (let x = 0; x < CELL; x += 1) depths.add(depth(first, x));
    expect(depths.size).toBeGreaterThan(3);
    expect(factionGrassSpillMaskV7(GRASS_N, 1)).not.toEqual(first);
    // Deterministic.
    expect(factionGrassSpillMaskV7(GRASS_N, 0)).toEqual(first);
  });

  it("meets the next cell's strip without a step", () => {
    // The strip along a north edge, at the seam between two cells of a row.
    const block = FACTION_GRASS_SPILL_V7.block;
    const depthAt = (mask: Uint8Array, x: number): number => {
      let y = 0;
      while (y < CELL && covered(mask, x, y)) y += 1;
      return y;
    };
    for (let phase = 0; phase < FACTION_GRASS_PHASES_V7; phase += 1) {
      const left = factionGrassSpillMaskV7(GRASS_N, phase);
      const right = factionGrassSpillMaskV7(
        GRASS_N,
        (phase + 1) % FACTION_GRASS_PHASES_V7,
      );
      expect(
        Math.abs(depthAt(left, CELL - 1) - depthAt(right, 0)),
      ).toBeLessThanOrEqual(2 * block);
    }
  });

  it("cuts a tile to the mask", () => {
    const tile = new Uint8ClampedArray(CELL * CELL * 4).fill(255);
    const mask = factionGrassSpillMaskV7(GRASS_S | GRASS_E, 4);
    const cut = factionGrassSpillPixelsV7(tile, mask);
    for (let index = 0; index < mask.length; index += 1)
      expect(cut[index * 4 + 3]).toBe(mask[index]);
    expect(tile[3]).toBe(255);
  });
});

describe("the faction grass art and drawing", () => {
  function harness(fail = false) {
    const surfaces: { pixels: Uint8ClampedArray; id: number }[] = [];
    const loaded: string[] = [];
    const environment: ChibiForestRasterEnvironmentV7 = {
      loadImage(url, settle) {
        loaded.push(url);
        settle(!fail);
        return { url } as unknown as CanvasImageSource;
      },
      readPixels(image, width, height) {
        // Each tile a flat colour that says which file it is.
        const url = (image as unknown as { url: string }).url;
        const pixels = new Uint8ClampedArray(width * height * 4);
        for (let offset = 0; offset < pixels.length; offset += 4) {
          pixels[offset] = url.length;
          pixels[offset + 1] = url.includes("undead") ? 155 : 60;
          pixels[offset + 2] = 118;
          pixels[offset + 3] = 255;
        }
        return pixels;
      },
      createSurface(pixels) {
        const surface = { pixels, id: surfaces.length };
        surfaces.push(surface);
        return surface as unknown as CanvasImageSource;
      },
    };
    const redraw = vi.fn();
    const art = createFactionGrassArtV7({
      environment,
      redraw,
      tiles: FACTION_GRASS_TILES_V7,
    });
    return { art, loaded, surfaces, redraw };
  }

  const pixelsOf = (image: CanvasImageSource | null): Uint8ClampedArray =>
    (image as unknown as { pixels: Uint8ClampedArray }).pixels;

  it("loads nothing until asked, then every tile once", () => {
    const { art, loaded } = harness();
    expect(loaded).toEqual([]);
    expect(art.resolve()).not.toBeNull();
    expect(loaded.length).toBe(FACTION_GRASS_TILES_V7.length);
    art.resolve();
    expect(loaded.length).toBe(FACTION_GRASS_TILES_V7.length);
  });

  it("is null for good when a tile fails to load", () => {
    const { art } = harness(true);
    expect(art.resolve()).toBeNull();
    expect(art.resolve()).toBeNull();
  });

  it("serves tiles as baked, the Undead ones toned, and caches spills", () => {
    const resolved = harness().art.resolve();
    if (resolved === null) throw new Error("no art");
    const goblin = pixelsOf(resolved.tile("GOBLIN", 0));
    expect([goblin[1], goblin[2], goblin[3]]).toEqual([60, 118, 255]);
    // Toned toward the Grass pivot (green 183): 155 moves up.
    const undead = pixelsOf(resolved.tile("UNDEAD", 0));
    expect(undead[1]).toBeGreaterThan(155);
    expect(undead[1]).toBeLessThan(183);
    expect(resolved.tile("GOBLIN", 7)).toBeNull();
    const spill = resolved.spill("UNDEAD", 1, GRASS_E, 2);
    expect(spill).not.toBeNull();
    expect(resolved.spill("UNDEAD", 1, GRASS_E, 2)).toBe(spill);
    expect(resolved.spill("UNDEAD", 1, GRASS_E, 3)).not.toBe(spill);
    const cut = pixelsOf(spill);
    // Opaque at the east edge, clear at the west one, in the tile's colour.
    expect(cut[(40 * CELL + CELL - 1) * 4 + 3]).toBe(255);
    expect(cut[40 * CELL * 4 + 3]).toBe(0);
    expect(cut[(40 * CELL + CELL - 1) * 4 + 1]).toBe(undead[1]);
  });

  function context() {
    const drawn: CanvasImageSource[] = [];
    return {
      drawn,
      context: {
        save() {},
        restore() {},
        drawImage(image: CanvasImageSource) {
          drawn.push(image);
        },
        globalAlpha: 1,
        imageSmoothingEnabled: false,
      } as unknown as CanvasRenderingContext2D,
    };
  }
  const frame = {
    camera: { zoom: 1, offsetX: 0, offsetY: 0 },
    devicePixelRatio: 1,
    sceneAlpha: 1,
  } as const;

  it("draws the tile, then the spills, and a Mountain's only under its rock", () => {
    const resolved = harness().art.resolve();
    if (resolved === null) throw new Error("no art");
    const entries = [
      entry(0, 0, "CANDY"),
      entry(1, 0, "DINOSAUR"),
      entry(0, 1, undefined, "TERRAIN:MOUNTAIN"),
      entry(5, 5),
    ];
    const cells = factionGrassCellsV7(entries);
    const candy = context();
    const [candyEntry, dinosaurEntry, mountainEntry, farEntry] = entries;
    if (
      candyEntry === undefined ||
      dinosaurEntry === undefined ||
      mountainEntry === undefined ||
      farEntry === undefined
    )
      throw new Error("no entries");
    drawFactionGrassV7(
      candy.context,
      frame,
      resolved,
      candyEntry,
      cells,
      false,
    );
    const variant = cells.get("0,0")?.variant ?? -1;
    const phase = cells.get("0,0")?.phase ?? -1;
    expect(candy.drawn).toEqual([
      resolved.tile("CANDY", variant),
      resolved.spill("DINOSAUR", variant, GRASS_E, phase),
    ]);
    // The same layers serve the cell's Forest glade.
    expect(factionGrassGladeLayersV7(resolved, candyEntry, cells)).toEqual(
      candy.drawn,
    );
    const dinosaur = context();
    drawFactionGrassV7(
      dinosaur.context,
      frame,
      resolved,
      dinosaurEntry,
      cells,
      false,
    );
    expect(dinosaur.drawn.length).toBe(1);
    // The Mountain: nothing over its rocky ground, a spill under its fringe.
    const rock = context();
    drawFactionGrassV7(
      rock.context,
      frame,
      resolved,
      mountainEntry,
      cells,
      false,
    );
    expect(rock.drawn).toEqual([]);
    expect(factionGrassGladeLayersV7(resolved, mountainEntry, cells)).toEqual(
      [],
    );
    drawFactionGrassV7(
      rock.context,
      frame,
      resolved,
      mountainEntry,
      cells,
      true,
    );
    // Candy north of it and the Dinosaurs north-east: two spills.
    expect(rock.drawn.length).toBe(2);
    // No art (the switch off, or still loading) and far cells: nothing.
    const none = context();
    drawFactionGrassV7(none.context, frame, null, candyEntry, cells, false);
    drawFactionGrassV7(none.context, frame, resolved, candyEntry, null, false);
    drawFactionGrassV7(none.context, frame, resolved, farEntry, cells, false);
    expect(none.drawn).toEqual([]);
    expect(factionGrassGladeLayersV7(null, candyEntry, cells)).toEqual([]);
    // Used: GRASS_S is part of the mask vocabulary.
    expect(GRASS_S).toBe(4);
  });
});
