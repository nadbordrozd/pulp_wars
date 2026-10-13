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
  /**
   * A field of the flat grounds' run instead
   * (art/explorations/faction-grounds-2026-10/, another palette): its own
   * forced palette and the board colour of each of its colours. For the
   * things only: the reeds, twigs, sprinkles and tufts cut for the tiles
   * are strewn over a texture too.
   */
  readonly flat?: {
    readonly from: readonly string[];
    readonly to: readonly string[];
  };
}

export interface TexturedLook {
  readonly id: string;
  readonly faction: TexturedFaction;
  readonly letter: string;
  readonly label: string;
  readonly mode: "WORLD" | "TILES";
  /** Of a ground's looks, the one the game draws (scripts/art/faction-grass.ts). */
  readonly chosen?: true;
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

const GRASS = [
  "#8ab85c",
  "#92be64",
  "#82b055",
  "#78a650",
  "#9bc56a",
  "#679347",
];
const ASH = [
  "#716a64",
  "#7b746d",
  "#665f5a",
  "#57504e",
  "#46403f",
  "#a59e95",
  "#d07a3a",
];
const STRAW = [
  "#d3c176",
  "#dbca83",
  "#c9b66b",
  "#bca859",
  "#9a873f",
  "#a98c5e",
];
const JUNGLE = [
  "#5f9f58",
  "#6aab61",
  "#55924f",
  "#4a8549",
  "#3c703f",
  "#86c474",
  "#7a8a4a",
];

/** Six cells a side, blocks of 48 px overlapping by 16. */
const STANDARD_QUILT = (seed: number): QuiltRecipe => ({
  width: 480,
  height: 480,
  block: 48,
  overlap: 16,
  seed,
  sample: 40,
});

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

/**
 * Eight cells a side, where the denser grounds have six: on bare regolith
 * a boulder that comes back every six cells is seen as a lattice.
 */
const MARS_QUILT = {
  width: 640,
  height: 640,
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
 * at about 53% luma, nine points under the default Grass), so it is neither the default Grass, nor the Dinosaur
 * jungle, nor the olive bog; the stones a warm light grey.
 */
const MOSS_BOARD = [
  "#a2a498",
  "#b0b2a6",
  "#96998e",
  "#7b8172",
  "#7d8f66",
  "#8b9c72",
  "#71835c",
];

/**
 * The cobble bed on the board: stones a mid grey and moss a grey-green, so
 * the whole sits near 52% luma, ten points under the default Grass.
 */
const COBBLE_BOARD = [
  "#8f9388",
  "#9da195",
  "#7f8379",
  "#6a7062",
  "#74865a",
  "#84966a",
  "#667852",
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
        perCell: 0.36 * density,
        flip: true,
      },
      {
        id: `stone-${field}`,
        field,
        area: [50, 219],
        perCell: 2.9 * density,
        flip: true,
      },
      {
        id: `cobble-${field}`,
        field,
        area: [14, 49],
        perCell: 2.2 * density,
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
    chosen: true,
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
    chosen: true,
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
  {
    id: "dwarf-cobbles-world",
    faction: "DWARF",
    letter: "D",
    label: "A bed of mossy cobbles, quilted from one field",
    mode: "WORLD",
    from: MOSS,
    to: COBBLE_BOARD,
    fields: [{ id: "dwarf-cobbles-a", regions: [[44, 4, 86, 124]] }],
    quilt: {
      width: 480,
      height: 480,
      block: 48,
      overlap: 16,
      seed: 4885,
    },
  },
  // ------------------------------------------------------------------ Cult
  {
    id: "cult-marsh-world",
    faction: "CULT",
    letter: "A",
    label: "Marsh: sedge and peat with winding water, one 480 px texture",
    mode: "WORLD",
    chosen: true,
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
  // --------------------------------------------------------------- Neutral
  {
    id: "neutral-meadow-world",
    faction: "NEUTRAL",
    letter: "A",
    label: "Meadow: today's green with two-tone tufts",
    mode: "WORLD",
    from: GRASS,
    // Its ground is the palette's fourth colour: today's #8ab85c exactly.
    to: ["#8fbc60", "#93bf65", "#84b257", "#8ab85c", "#9bc56a", "#7aa852"],
    fields: [{ id: "neutral-grass-a", regions: [[0, 68, 160, 92]] }],
    quilt: STANDARD_QUILT(4901),
  },
  {
    id: "neutral-mottled-world",
    faction: "NEUTRAL",
    letter: "B",
    label: "Meadow: mottled, fine pale blades",
    mode: "WORLD",
    from: GRASS,
    to: ["#8ab85c", "#93bf65", "#8ab85c", "#8ebb60", "#99c46a", "#85b358"],
    fields: [{ id: "neutral-grass-b", regions: [[58, 48, 62, 76]] }],
    quilt: STANDARD_QUILT(4902),
  },
  {
    id: "neutral-painted-world",
    faction: "NEUTRAL",
    letter: "C",
    label: "Meadow: the mottle of B with the tufts of A strewn over it",
    mode: "WORLD",
    chosen: true,
    from: GRASS,
    to: ["#8ab85c", "#93bf65", "#8ab85c", "#8ebb60", "#99c46a", "#85b358"],
    fields: [{ id: "neutral-grass-b", regions: [[58, 48, 62, 76]] }],
    // The most-seen ground: eight cells a side.
    quilt: { ...STANDARD_QUILT(4902), width: 640, height: 640 },
    things: {
      // The tufts of neutral-grass-a, whose ground is the fourth colour,
      // in today's tuft green.
      fields: [{ id: "neutral-grass-a", base: 3 }],
      seed: 4903,
      gap: 3,
      kinds: [
        {
          id: "tuft",
          area: [14, 160],
          box: [30, 20],
          region: [0, 60, 160, 100],
          perCell: 2.6,
          to: {
            5: "#78a650",
            2: "#84b257",
            0: "#8fbc60",
            1: "#93bf65",
            4: "#9bc56a",
          },
        },
      ],
    },
  },
  // ----------------------------------------------------------- Cult, peat
  {
    id: "cult-peat-world",
    faction: "CULT",
    letter: "C",
    label: "Peat: star sedge and low mounds, whole puddles and reeds strewn",
    mode: "WORLD",
    from: MARSH,
    to: [
      "#7c865e",
      "#869066",
      "#76805a",
      "#6c7652",
      "#587878",
      "#5e766a",
      "#93a06c",
      "#628088",
    ],
    fields: [{ id: "cult-peat-a", regions: [[44, 36, 84, 112]] }],
    quilt: STANDARD_QUILT(4893),
    things: {
      fields: [
        {
          id: "cult-swamp-d",
          flat: {
            from: ["#777a56", "#466a6c", "#8fa79a", "#5f6a48"],
            to: ["#76805a", "#48696c", "#93a58a", "#5c6748"],
          },
        },
        {
          id: "cult-swamp-b",
          flat: {
            from: [
              "#55786a",
              "#3d5c5e",
              "#7fa39a",
              "#3f5a45",
              "#8aa66e",
              "#d9e8a8",
            ],
            to: [
              "#5f6a48",
              "#76805a",
              "#8fa79a",
              "#56603f",
              "#98a56c",
              "#c6d398",
            ],
          },
        },
      ],
      seed: 4894,
      gap: 4,
      kinds: [
        {
          id: "puddle",
          field: 0,
          area: [40, 130],
          has: [1],
          lacks: [2],
          perCell: 0.8,
        },
        { id: "reed", field: 1, area: [50, 110], has: [5], perCell: 0.5 },
        {
          id: "glow",
          field: 1,
          area: [4, 9],
          box: [3, 3],
          has: [5],
          perCell: 0.5,
          to: { 4: "#d6e6a4", 5: "#eef6c4" },
        },
      ],
    },
  },
  // ---------------------------------------------------------------- Undead
  {
    id: "undead-burnt-world",
    faction: "UNDEAD",
    letter: "A",
    label: "Burnt ground: mottled ash and soot, twigs, lumps and embers strewn",
    mode: "WORLD",
    chosen: true,
    from: ASH,
    // Its ground is the palette's fifth colour (the darkest): today's ash.
    to: [
      "#89827a",
      "#8f887f",
      "#7f7870",
      "#7b746d",
      "#716a64",
      "#a59e95",
      "#d07a3a",
    ],
    fields: [{ id: "undead-burnt-a", regions: [[50, 60, 58, 100]] }],
    // Discrete lumps and embers: eight cells a side, as the regolith.
    quilt: { ...STANDARD_QUILT(4911), width: 640, height: 640 },
    things: {
      fields: [
        {
          id: "undead-ash-b",
          flat: {
            from: ["#8a8580", "#5e5856", "#3b3637", "#b4aea6", "#d07a3a"],
            to: ["#716a64", "#57504e", "#46403f", "#a59e95", "#d07a3a"],
          },
        },
        {
          id: "undead-ash-c",
          flat: {
            from: ["#8a8580", "#5e5856", "#3b3637", "#d07a3a"],
            to: ["#a59e95", "#57504e", "#46403f", "#d07a3a"],
          },
        },
      ],
      seed: 4912,
      gap: 4,
      kinds: [
        {
          id: "lump",
          field: 1,
          area: [20, 75],
          has: [2],
          perCell: 0.7,
          hollow: "#57504e",
        },
        {
          id: "scrub",
          field: 0,
          area: [30, 140],
          has: [1],
          lacks: [4],
          perCell: 0.4,
        },
        { id: "twig", field: 0, area: [5, 29], lacks: [4], perCell: 2 },
        { id: "ember", field: 0, area: [4, 40], has: [4], perCell: 0.35 },
      ],
    },
  },
  // ---------------------------------------------------------------- Goblin
  {
    id: "goblin-savannah-world",
    faction: "GOBLIN",
    letter: "A",
    label: "Savannah: speckled dry ground, grass tufts and clumps strewn",
    mode: "WORLD",
    from: STRAW,
    // Its ground is the palette's second colour: today's straw.
    to: ["#cbb86c", "#d3c176", "#c3b064", "#bca859", "#a8964a", "#a98c5e"],
    fields: [{ id: "goblin-savannah-t", regions: [[34, 16, 92, 128]] }],
    quilt: STANDARD_QUILT(4921),
    things: {
      fields: [0, 1].map((index) => ({
        id: index === 0 ? "goblin-savannah-a" : "goblin-savannah-b",
        flat: {
          from: ["#cdbb68", "#a8964a", "#e2d48e", "#a98c5e", "#8e9a4c"],
          to: ["#bca859", "#9a873f", "#d3c176", "#a98c5e", "#8e9a4c"],
        },
      })),
      seed: 4922,
      gap: 4,
      kinds: [
        { id: "tuft", field: 0, area: [40, 400], box: [34, 34], perCell: 0.3 },
        { id: "clump", field: 1, area: [14, 80], perCell: 1.3 },
        { id: "blade", field: 1, area: [3, 13], perCell: 2 },
      ],
    },
  },
  // -------------------------------------------------------------- Dinosaur
  {
    id: "dinosaur-jungle-world",
    faction: "DINOSAUR",
    letter: "A",
    label: "Jungle floor: moss, leaf litter and low plants",
    mode: "WORLD",
    chosen: true,
    from: JUNGLE,
    to: [
      "#6aab61",
      "#70b066",
      "#63a35b",
      "#63a35b",
      "#5a9954",
      "#80bd70",
      "#7a9a55",
    ],
    fields: [{ id: "dinosaur-jungle-a", regions: [[40, 60, 70, 100]] }],
    quilt: STANDARD_QUILT(4931),
  },
];
