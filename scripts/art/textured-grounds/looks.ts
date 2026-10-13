/**
 * EXPERIMENT (bead pulp_wars-2yc.48, second round; docs/art/TEXTURED_GROUNDS.md):
 * the textured grounds tried, each a quilt of PixelLab fields.
 *
 * `WORLD` is one periodic texture the board samples by a cell's place on
 * the map; `TILES` is a set of tiles that all carry one shared border band,
 * so any joins any other and the board may pick them at random.
 */
import type { TexturedFaction } from "./candidates";
import type { ScatterKind } from "./compose";
import type { QuiltRecipe } from "./quilt";

/** A field of the textured run a ground or its things are taken from. */
export interface TexturedField {
  readonly id: string;
  /**
   * Palette indices exchanged for this field, in pairs: Pixflux does not
   * give every field the same colour for its ground, and a quilt of two
   * grounds is a patchwork.
   */
  readonly swap?: readonly (readonly [number, number])[];
}

export interface TexturedLook {
  readonly id: string;
  readonly faction: TexturedFaction;
  readonly letter: string;
  readonly label: string;
  readonly mode: "WORLD" | "TILES";
  /** Of a faction's looks, the one the board switch draws. */
  readonly best?: true;
  /** The fields' forced palette. */
  readonly from: readonly string[];
  /** The board colour of each palette colour: the value range, compressed. */
  readonly to: readonly string[];
  /**
   * The ground itself: the fields it is quilted from, with the parts of
   * each a window may be taken from (`[left, top, width, height]`).
   */
  readonly fields: readonly (TexturedField & {
    readonly regions: readonly (readonly [number, number, number, number])[];
  })[];
  readonly quilt: QuiltRecipe;
  /** `TILES` only: how many tiles, and the width of the shared band. */
  readonly tiles?: { readonly count: number; readonly band: number };
  /** What lies on the ground (compose.ts). */
  readonly things?: {
    /**
     * The fields the things are cut from. `ground` names further palette
     * indices that are ground in that field and not part of a thing.
     */
    readonly fields: readonly (TexturedField & {
      readonly ground?: readonly number[];
      readonly base?: number;
    })[];
    readonly kinds: readonly ScatterKind[];
    readonly gap?: number;
    readonly seed: number;
  };
}

/** A palette with the pairs of a field's `swap` exchanged. */
export function swapped(
  palette: readonly string[],
  swap: TexturedField["swap"],
): string[] {
  const result = [...palette];
  for (const [a, b] of swap ?? []) {
    const held = result[a] ?? "";
    result[a] = result[b] ?? "";
    result[b] = held;
  }
  return result;
}

/**
 * The value range of a palette compressed round its ground colour (the
 * colour at `ground`): each colour keeps `keep` of its distance from it, so
 * a ground stays in a narrow band of lightness under the units; `base`
 * moves all of it to another ground colour.
 */
export function compressed(
  palette: readonly string[],
  keep: number,
  ground = 0,
  base = palette[ground] ?? "#808080",
): string[] {
  const channels = (colour: string): number[] =>
    [1, 3, 5].map((at) => Number.parseInt(colour.slice(at, at + 2), 16));
  const pivot = channels(palette[ground] ?? "#808080");
  const target = channels(base);
  return palette.map(
    (colour) =>
      `#${channels(colour)
        .map((value, index) =>
          Math.max(
            0,
            Math.min(
              255,
              Math.round(
                (target[index] ?? 0) + (value - (pivot[index] ?? 0)) * keep,
              ),
            ),
          )
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")}`,
  );
}

const MARS = [
  "#a9623f",
  "#b56c46",
  "#9c5839",
  "#8e4f35",
  "#c17c55",
  "#7d4a3c",
  "#c79a80",
  "#6a3d33",
];

/** The speckled dust of two fields, with the pebbles that lie in it. */
const MARS_DUST: TexturedLook["fields"] = [
  {
    id: "martian-regolith-e",
    regions: [
      [28, 0, 82, 128],
      [0, 62, 160, 66],
      [48, 62, 112, 98],
    ],
  },
  {
    id: "martian-regolith-f",
    regions: [
      [52, 0, 54, 160],
      [0, 48, 100, 84],
    ],
  },
];

/** The rocks of all four fields; their dust is ground. */
const MARS_ROCKS: NonNullable<TexturedLook["things"]> = {
  fields: [
    // Its dust is the palette's fifth colour, the other fields' the second.
    { id: "martian-regolith-c", swap: [[1, 4]] },
    { id: "martian-regolith-d", swap: [[1, 4]] },
    { id: "martian-regolith-e" },
    { id: "martian-regolith-f" },
    // Two fields asked for the shapes: shards, slabs, ridged stones.
    { id: "martian-rocks-a", swap: [[1, 4]] },
    { id: "martian-rocks-b", swap: [[1, 4]] },
  ],
  seed: 4873,
  gap: 6,
  kinds: [0, 1, 2, 3, 4, 5].flatMap((field): ScatterKind[] => [
    {
      id: `boulder-${field}`,
      field,
      area: [260, 1100],
      box: [44, 44],
      perCell: 0.035,
      flip: true,
    },
    {
      id: `rock-${field}`,
      field,
      area: [45, 259],
      perCell: 0.17,
      flip: true,
    },
    {
      id: `stone-${field}`,
      field,
      area: [14, 44],
      perCell: 0.25,
      flip: true,
    },
  ]),
};

const MARS_QUILT = {
  width: 480,
  height: 480,
  block: 48,
  overlap: 16,
  seed: 4871,
  sample: 40,
} as const;

const MOSS = [
  "#8d9288",
  "#a1a59a",
  "#7a7f76",
  "#646b5e",
  "#6f8a4e",
  "#87a05d",
  "#5a7141",
];

/**
 * The moss on the board: paler and greyer than the fields' (a grey-green
 * at about 55% luma), so it is neither the default Grass, nor the Dinosaur
 * jungle, nor the olive bog; the stones a warm light grey.
 */
const MOSS_BOARD = [
  "#a9ab9f",
  "#babcb0",
  "#96998e",
  "#7b8172",
  "#8c9c74",
  "#9aa980",
  "#80906a",
];

/**
 * The mottled moss inside the wall of one field, with the small stones
 * that lie in it. (The moss of `dwarf-stones-a` is one flat green.)
 */
const MOSS_GROUND: TexturedLook["fields"] = [
  { id: "dwarf-moss-c", regions: [[36, 44, 108, 116]] },
];

const MOSS_QUILT = {
  width: 480,
  height: 480,
  block: 48,
  overlap: 16,
  seed: 4881,
  sample: 40,
} as const;

/** The stones of three fields; every green of the palette is ground. */
function mossStones(density: number): NonNullable<TexturedLook["things"]> {
  return {
    fields: [
      { id: "dwarf-stones-a", ground: [4, 5, 6] },
      { id: "dwarf-stones-b", ground: [4, 5, 6] },
      { id: "dwarf-moss-c", ground: [4, 5, 6] },
    ],
    seed: 4883,
    gap: 2,
    kinds: [0, 1, 2].flatMap((field): ScatterKind[] => [
      {
        id: `boulder-${field}`,
        field,
        area: [220, 900],
        box: [40, 40],
        perCell: 0.3 * density,
        flip: true,
      },
      {
        id: `stone-${field}`,
        field,
        area: [50, 219],
        perCell: 2.2 * density,
        flip: true,
      },
      {
        id: `cobble-${field}`,
        field,
        area: [14, 49],
        perCell: 1.6 * density,
        flip: true,
      },
    ]),
  };
}

const MARSH = [
  "#76805a",
  "#828b62",
  "#6a7452",
  "#5c6748",
  "#48696c",
  "#3d5a5e",
  "#98a56c",
  "#5a8088",
];

/** The marsh on the board: the bog's olive for its peat, the water lifted. */
const MARSH_BOARD = [
  "#7b855e",
  "#848d64",
  "#76805a",
  "#69734f",
  "#5a7672",
  "#547069",
  "#93a06c",
  "#62868c",
];

export const TEXTURED_LOOKS: readonly TexturedLook[] = [
  {
    id: "martian-regolith-world",
    faction: "MARTIAN",
    letter: "A",
    label: "Regolith: one 480 px texture sampled by map place",
    mode: "WORLD",
    best: true,
    from: MARS,
    to: compressed(MARS, 0.75, 1),
    fields: MARS_DUST,
    quilt: MARS_QUILT,
    things: MARS_ROCKS,
  },
  {
    id: "martian-regolith-full",
    faction: "MARTIAN",
    letter: "B",
    label: "The same texture at the fields' own contrast",
    mode: "WORLD",
    from: MARS,
    to: MARS,
    fields: MARS_DUST,
    quilt: MARS_QUILT,
    things: MARS_ROCKS,
  },
  {
    id: "martian-regolith-tiles",
    faction: "MARTIAN",
    letter: "C",
    label: "Six tiles sharing one border band, picked at random",
    mode: "TILES",
    from: MARS,
    to: compressed(MARS, 0.75, 1),
    fields: MARS_DUST,
    quilt: {
      width: 80,
      height: 80,
      block: 56,
      overlap: 16,
      seed: 4872,
      sample: 40,
    },
    tiles: { count: 6, band: 6 },
    things: MARS_ROCKS,
  },
  // ----------------------------------------------------------------- Dwarf
  {
    id: "dwarf-moss-world",
    faction: "DWARF",
    letter: "A",
    label: "Moss-covered stones: one 480 px texture, stones thick",
    mode: "WORLD",
    best: true,
    from: MOSS,
    to: MOSS_BOARD,
    fields: MOSS_GROUND,
    quilt: MOSS_QUILT,
    things: mossStones(1),
  },
  {
    id: "dwarf-moss-sparse",
    faction: "DWARF",
    letter: "B",
    label: "The same moss with half the stones",
    mode: "WORLD",
    from: MOSS,
    to: MOSS_BOARD,
    fields: MOSS_GROUND,
    quilt: MOSS_QUILT,
    things: mossStones(0.5),
  },
  {
    id: "dwarf-moss-tiles",
    faction: "DWARF",
    letter: "C",
    label: "Six tiles sharing one border band, picked at random",
    mode: "TILES",
    from: MOSS,
    to: MOSS_BOARD,
    fields: MOSS_GROUND,
    quilt: {
      width: 80,
      height: 80,
      block: 56,
      overlap: 16,
      seed: 4882,
      sample: 40,
    },
    tiles: { count: 6, band: 6 },
    things: mossStones(1),
  },
  // ------------------------------------------------------------------ Cult
  {
    id: "cult-marsh-world",
    faction: "CULT",
    letter: "A",
    label: "Marsh: sedge and peat with winding water, one 480 px texture",
    mode: "WORLD",
    best: true,
    from: MARSH,
    to: MARSH_BOARD,
    fields: [{ id: "cult-marsh-b", regions: [[0, 0, 160, 160]] }],
    quilt: {
      width: 480,
      height: 480,
      block: 64,
      overlap: 24,
      seed: 4891,
      sample: 60,
    },
  },
  {
    id: "cult-marsh-dry",
    faction: "CULT",
    letter: "B",
    label: "Marsh: sedge and peat only, no open water",
    mode: "WORLD",
    from: MARSH,
    to: MARSH_BOARD,
    fields: [
      {
        id: "cult-marsh-b",
        regions: [
          [104, 0, 56, 160],
          [0, 64, 26, 96],
        ],
      },
    ],
    quilt: {
      width: 480,
      height: 480,
      block: 48,
      overlap: 16,
      seed: 4892,
      sample: 40,
    },
  },
];

/** The file of a look's texture (`WORLD`) in the game's assets. */
export function texturedWorldPath(look: TexturedLook): string {
  return `public/assets/chibi/terrain/faction-grass/world/chibi-${look.id}.png`;
}
