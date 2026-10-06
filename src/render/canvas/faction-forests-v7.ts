import type { ChibiForestArtSetV7 } from "../../assets/chibi-forest-pieces-manifest";
import type { FactionIdV7 } from "../../engine/index";
import {
  chibiForestCellsV7,
  createChibiForestArtV7,
  type ChibiForestArtV7,
  type ChibiForestCellV7,
  type ChibiForestClumpV7,
  type ChibiForestRasterEnvironmentV7,
} from "./chibi-forest-v7";
import {
  applyChibiFringeMaskV7,
  chibiFringeMaskV7,
  chibiFringeVariantV7,
} from "./chibi-terrain-fringe-v7";

/**
 * Faction forests (bead pulp_wars-2yc.2, docs/art/FACTION_FORESTS.md). The
 * user, 2026-10-05: "make per-faction forests the way there is per faction
 * grass." Inside a faction's territory a Forest cell is drawn with that
 * faction's own trees, and turns with the territory when a city changes
 * hands. Humans keep the default Forest. Ice Folk territory is Snow by
 * rule, and the snow caps already make its pines snow-laden, so it has no
 * set of its own.
 *
 * Everything here is presentation, in the live look of the CHIBI art set
 * only. To turn it off: set FACTION_FORESTS_ENABLED_V7 to false, or open
 * the game with `?faction-forests=0`.
 *
 * A faction's forest is a whole piece set of the composed forests
 * (COMPOSED_FORESTS.md): the same twenty piece shapes and seam clumps,
 * stamped from that faction's clumps, packed and drawn by the same code.
 * This module only decides which set a cell takes:
 *
 * - **Packing stops at a border.** The Forest cells of each faction (and
 *   the default Forest) are packed as a forest of their own, so no piece
 *   and no seam clump spans two territories, and the shade under the trees
 *   is cut back along the border as it is at the edge of a wood.
 * - **One art object.** The board draws through one ChibiForestArtV7. A
 *   piece's variant and a seam clump's index carry the set they belong to
 *   (`set x FACTION_FOREST_STRIDE_V7 + index`), and the art object hands
 *   each to its set. Set 0 is the default Forest.
 * - **The shade is the faction's.** The veil under the trees takes a dark
 *   tone of the faction's ground, not the default dark green.
 */

/** The master switch. False draws every Forest as before the bead. */
export const FACTION_FORESTS_ENABLED_V7 = true;

/** `?faction-forests=0` (or `off`, `false`) turns it off, `=1` on. */
export const FACTION_FORESTS_PARAMETER_V7 = "faction-forests";

export function factionForestsEnabledV7(search?: string): boolean {
  const query =
    search ??
    (globalThis as { location?: { search?: string } }).location?.search ??
    "";
  let value: string | null;
  try {
    value = new URLSearchParams(query).get(FACTION_FORESTS_PARAMETER_V7);
  } catch {
    value = null;
  }
  if (value === null) return FACTION_FORESTS_ENABLED_V7;
  const text = value.trim().toLowerCase();
  if (text === "0" || text === "off" || text === "false") return false;
  if (text === "1" || text === "on" || text === "true") return true;
  return FACTION_FORESTS_ENABLED_V7;
}

/** The factions with a forest of their own, in set order (set 1 onward). */
export const FACTION_FOREST_IDS_V7 = [
  "UNDEAD",
  "GOBLIN",
  "DINOSAUR",
  "MARTIAN",
  "DWARF",
  "CANDY",
] as const;

export type FactionForestIdV7 = (typeof FACTION_FOREST_IDS_V7)[number];

/** A variant or clump index of set `n` is `n x STRIDE + index`. */
export const FACTION_FOREST_STRIDE_V7 = 100;

/**
 * The shade under each faction's trees (RGBA, as the default `[22, 58, 38,
 * 32]`): a dark tone of the faction's ground, about an eighth opaque. The
 * Undead keep the default: their gloam Grass is a green.
 */
export const FACTION_FOREST_FLOOR_V7: Readonly<
  Record<FactionForestIdV7, readonly [number, number, number, number]>
> = {
  UNDEAD: [22, 58, 38, 32],
  GOBLIN: [58, 56, 20, 34],
  DINOSAUR: [12, 48, 34, 36],
  MARTIAN: [78, 40, 26, 34],
  DWARF: [44, 50, 38, 34],
  CANDY: [36, 96, 84, 30],
};

export function factionForestIdV7(
  faction: FactionIdV7 | null | undefined,
): FactionForestIdV7 | null {
  return faction !== null &&
    faction !== undefined &&
    (FACTION_FOREST_IDS_V7 as readonly string[]).includes(faction)
    ? (faction as FactionForestIdV7)
    : null;
}

/**
 * The plan member of a terrain entry: `factionForest` on a Forest cell
 * inside the territory of a faction with a forest of its own, nothing
 * otherwise (and nothing at all with the switch off).
 */
export function factionForestPlanMemberV7(
  terrain: string,
  faction: FactionIdV7 | null | undefined,
): { readonly factionForest?: FactionForestIdV7 } {
  if (!FACTION_FORESTS_ENABLED_V7 || terrain !== "FOREST") return {};
  const id = factionForestIdV7(faction);
  return id === null ? {} : { factionForest: id };
}

// ------------------------------------------------------------------- cells

/** What the cells computation reads of a board plan entry. */
export interface FactionForestEntryV7 {
  readonly kind: string;
  readonly at: { readonly x: number; readonly y: number };
  readonly artSubject?: string;
  readonly factionForest?: FactionForestIdV7;
}

/** The variant counts and clump count of a set, or null while it loads. */
export type FactionForestCountsV7 = (
  set: number,
) => (Pick<ChibiForestArtV7, "variants"> & { readonly clumps: number }) | null;

/**
 * The forest role of every Forest cell, each faction's cells packed as a
 * forest of their own (set 1 onward) beside the default Forest (set 0). A
 * set that is not ready yet is drawn as the default Forest. Returns the
 * cells and, by "x,y", the set of every cell that is not set 0.
 */
export function factionForestCellsV7(
  entries: readonly FactionForestEntryV7[],
  counts: FactionForestCountsV7,
): {
  readonly cells: ReadonlyMap<string, ChibiForestCellV7>;
  readonly sets: ReadonlyMap<string, number>;
} {
  const setOf = (entry: FactionForestEntryV7): number => {
    if (entry.factionForest === undefined) return 0;
    const set = FACTION_FOREST_IDS_V7.indexOf(entry.factionForest) + 1;
    return counts(set) === null ? 0 : set;
  };
  const used = new Set<number>([0]);
  const forestSet = new Map<FactionForestEntryV7, number>();
  for (const entry of entries)
    if (entry.kind === "TERRAIN" && entry.artSubject === "TERRAIN:FOREST") {
      const set = setOf(entry);
      forestSet.set(entry, set);
      used.add(set);
    }
  const cells = new Map<string, ChibiForestCellV7>();
  const sets = new Map<string, number>();
  for (const set of [...used].sort((a, b) => a - b)) {
    const own = counts(set);
    if (own === null) continue;
    // The other sets' Forest is not Forest to this one: no piece, no seam
    // clump and no shade crosses the border.
    const visible =
      used.size === 1
        ? entries
        : entries.filter((entry) => {
            const other = forestSet.get(entry);
            return other === undefined || other === set;
          });
    const packed = chibiForestCellsV7(visible, own.variants, own.clumps);
    const shift = set * FACTION_FOREST_STRIDE_V7;
    for (const [at, cell] of packed) {
      if (set === 0) {
        cells.set(at, cell);
        continue;
      }
      sets.set(at, set);
      const moved = new Map<object, ChibiForestCellV7["bodies"][number]>();
      const move = (
        piece: ChibiForestCellV7["bodies"][number],
      ): ChibiForestCellV7["bodies"][number] => {
        let other = moved.get(piece);
        if (other === undefined) {
          other = { ...piece, variant: piece.variant + shift };
          moved.set(piece, other);
        }
        return other;
      };
      cells.set(at, {
        ...cell,
        eastSeam: cell.eastSeam === null ? null : cell.eastSeam + shift,
        northSeam: cell.northSeam === null ? null : cell.northSeam + shift,
        bodies: cell.bodies.map(move),
        bands: cell.bands.map((band) => ({ ...band, piece: move(band.piece) })),
      });
    }
  }
  return { cells, sets };
}

// --------------------------------------------------------------------- art

const CELL = 80;
const COMPOSITE = Symbol("faction forests");

interface CompositeForestArt extends ChibiForestArtV7 {
  readonly [COMPOSITE]: {
    cells(
      entries: readonly FactionForestEntryV7[],
      live: boolean,
    ): ReadonlyMap<string, ChibiForestCellV7>;
  };
}

/**
 * The forest art of the board with the faction sets behind it. `resolve`
 * is null until the default set is ready, exactly as the default art is.
 * A faction's set is loaded when a plan first shows that faction's Forest,
 * and its cells are drawn as the default Forest until it is ready (and for
 * good if it fails to load).
 */
export function createFactionForestArtV7(input: {
  readonly environment: ChibiForestRasterEnvironmentV7;
  readonly redraw: () => void;
  readonly base: { resolve(): ChibiForestArtV7 | null };
  readonly sets: Readonly<Record<FactionForestIdV7, ChibiForestArtSetV7>>;
}): { resolve(): ChibiForestArtV7 | null } {
  const { environment } = input;
  const loaders = FACTION_FOREST_IDS_V7.map((id) =>
    createChibiForestArtV7({
      environment,
      redraw: input.redraw,
      set: input.sets[id],
    }),
  );
  let built: { base: ChibiForestArtV7; art: CompositeForestArt } | null = null;

  const build = (base: ChibiForestArtV7): CompositeForestArt => {
    /** Set number to its art: 0 the default, null while a set loads. */
    const artOf = (set: number): ChibiForestArtV7 | null =>
      set === 0 ? base : (loaders[set - 1]?.resolve() ?? null);
    const split = (index: number): readonly [number, number] => [
      Math.floor(index / FACTION_FOREST_STRIDE_V7),
      index % FACTION_FOREST_STRIDE_V7,
    ];
    // Seam clumps by composite index: a sparse list, filled as sets load.
    const clumps: ChibiForestClumpV7[] = [...base.clumps];
    const filled = new Set<number>([0]);
    const fill = (set: number): void => {
      if (filled.has(set)) return;
      const art = artOf(set);
      if (art === null) return;
      filled.add(set);
      for (const [index, clump] of art.clumps.entries())
        clumps[set * FACTION_FOREST_STRIDE_V7 + index] = clump;
    };
    const floors = new Map<string, CanvasImageSource | null>();
    let sets: ReadonlyMap<string, number> = new Map();
    const cellsByEntries = new WeakMap<
      object,
      {
        readonly ready: number;
        readonly live: boolean;
        readonly cells: ReadonlyMap<string, ChibiForestCellV7>;
        readonly sets: ReadonlyMap<string, number>;
      }
    >();
    return {
      variants: base.variants,
      clumps,
      body(shape, variant) {
        const [set, own] = split(variant);
        return artOf(set)?.body(shape, own) ?? [];
      },
      band(shape, variant, column, row) {
        const [set, own] = split(variant);
        return artOf(set)?.band(shape, own, column, row) ?? null;
      },
      glade: (ground) => base.glade(ground),
      floor(at, edges) {
        const set = sets.get(`${at.x},${at.y}`) ?? 0;
        const id = FACTION_FOREST_IDS_V7[set - 1];
        if (id === undefined) return base.floor(at, edges);
        const variant = edges === 0 ? 0 : chibiFringeVariantV7(at);
        const key = `${set}:${variant}:${edges}`;
        const cached = floors.get(key);
        if (cached !== undefined) return cached;
        const plain = new Uint8ClampedArray(CELL * CELL * 4);
        for (let i = 0; i < plain.length; i += 4)
          plain.set(FACTION_FOREST_FLOOR_V7[id], i);
        const surface = environment.createSurface(
          edges === 0
            ? plain
            : applyChibiFringeMaskV7(
                plain,
                chibiFringeMaskV7(variant, edges, CELL),
              ),
          CELL,
          CELL,
        );
        floors.set(key, surface);
        return surface;
      },
      [COMPOSITE]: {
        cells(entries, live) {
          // How many sets are ready: a plan is packed again when one lands.
          let ready = 0;
          const counts: FactionForestCountsV7 = (set) => {
            if (set !== 0 && !live) return null;
            const art = artOf(set);
            if (art === null) return null;
            fill(set);
            return { variants: art.variants, clumps: art.clumps.length };
          };
          if (live)
            for (const entry of entries)
              if (entry.factionForest !== undefined) {
                const set =
                  FACTION_FOREST_IDS_V7.indexOf(entry.factionForest) + 1;
                if (artOf(set) !== null) ready |= 1 << set;
              }
          const cached = cellsByEntries.get(entries);
          if (cached?.ready === ready && cached.live === live) {
            sets = cached.sets;
            return cached.cells;
          }
          const packed = factionForestCellsV7(entries, counts);
          cellsByEntries.set(entries, { ready, live, ...packed });
          sets = packed.sets;
          return packed.cells;
        },
      },
    };
  };

  return {
    resolve() {
      const base = input.base.resolve();
      if (base === null) return null;
      if (built?.base !== base) built = { base, art: build(base) };
      return built.art;
    },
  };
}

/**
 * The forest cells of a plan when `art` is the faction forests' art object,
 * or null when it is any other (the board then packs as it always did).
 * `live` is false in the classic look: every Forest is the default one.
 */
export function factionForestCellsOfV7(
  entries: readonly FactionForestEntryV7[],
  art: ChibiForestArtV7,
  live: boolean,
): ReadonlyMap<string, ChibiForestCellV7> | null {
  const composite = (art as Partial<CompositeForestArt>)[COMPOSITE];
  return composite === undefined ? null : composite.cells(entries, live);
}
