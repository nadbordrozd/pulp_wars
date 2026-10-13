/**
 * The looks of bead pulp_wars-2yc.48: how board tiles are composed from the
 * motifs of reviewed PixelLab fields (scripts/art/faction-grounds/derive.ts).
 * A look names its fields (recipes of the exploration run), the board
 * colour of each palette colour, and its kinds of motif with how many a
 * tile gets. Several looks may share a field: a lighter and a deeper ground
 * are the same shapes in other colours.
 *
 * `status` says what a look is: `CHOSEN` is wired into the game by
 * scripts/art/faction-grass.ts, `RUNNER_UP` and `SAMPLE` are shown on the
 * review sheets only.
 */
import type { GroundFaction } from "./candidates";
import type { GroundFieldSource, GroundTileRecipe } from "./derive";

export interface GroundLook {
  readonly id: string;
  readonly faction: GroundFaction;
  /** The letter on the review sheet. */
  readonly letter: string;
  readonly label: string;
  readonly status: "CHOSEN" | "RUNNER_UP" | "SAMPLE";
  /** Of a faction's samples, the one recommended to the user. */
  readonly lead?: true;
  /** The recipes of the exploration run whose fields the motifs are from. */
  readonly fields: readonly string[];
  /** `from` of a field defaults to that recipe's forced palette. */
  readonly recipe: Omit<GroundTileRecipe, "fields"> & {
    readonly fields: readonly (Omit<GroundFieldSource, "from"> & {
      readonly from?: readonly string[];
    })[];
  };
}

export const GROUND_LOOKS: readonly GroundLook[] = [
  // ------------------------------------------------------------------ Cult
  {
    id: "cult-bog",
    faction: "CULT",
    letter: "A",
    label: "Olive peat bog: teal puddles, reeds, glow specks",
    status: "CHOSEN",
    fields: ["cult-swamp-b", "cult-swamp-d"],
    recipe: {
      fields: [
        // cult-swamp-b: peat, water (the field's base), glint, dim blade,
        // mid blade, bright blade.
        {
          to: [
            "#5f6a48",
            "#76805a",
            "#8fa79a",
            "#56603f",
            "#98a56c",
            "#c6d398",
          ],
        },
        // cult-swamp-d: moss (the field's base), water, pale sprig, shade.
        { to: ["#76805a", "#48696c", "#93a58a", "#5c6748"] },
      ],
      ground: "#76805a",
      variants: 6,
      seed: 4811,
      kinds: [
        {
          id: "puddle",
          field: 1,
          area: [40, 130],
          has: [1],
          lacks: [2],
          count: [1, 2],
        },
        { id: "reed", area: [50, 110], has: [5], count: [0, 2] },
        { id: "blade", area: [5, 30], has: [5], lacks: [2], count: [2, 4] },
        {
          id: "sprig",
          field: 1,
          area: [6, 30],
          has: [2],
          lacks: [1],
          count: [0, 2],
        },
        {
          id: "glow",
          area: [4, 9],
          box: [3, 3],
          has: [5],
          count: [0, 2],
          to: { 4: "#d6e6a4", 5: "#eef6c4" },
        },
        { id: "speck", area: [1, 3], count: [3, 6] },
      ],
    },
  },
  {
    id: "cult-dark-swamp",
    faction: "CULT",
    letter: "B",
    label: "Dark teal swamp: the same puddles and reeds, darker and bluer",
    status: "RUNNER_UP",
    fields: ["cult-swamp-b", "cult-swamp-d"],
    recipe: {
      fields: [
        {
          to: [
            "#46605a",
            "#55706a",
            "#8fa79a",
            "#40564c",
            "#8aa06c",
            "#c6d398",
          ],
        },
        { to: ["#55706a", "#35555c", "#86a096", "#46605a"] },
      ],
      ground: "#55706a",
      variants: 6,
      seed: 4811,
      kinds: [
        {
          id: "puddle",
          field: 1,
          area: [40, 130],
          has: [1],
          lacks: [2],
          count: [1, 2],
        },
        { id: "reed", area: [50, 110], has: [5], count: [0, 2] },
        { id: "blade", area: [5, 30], has: [5], lacks: [2], count: [2, 4] },
        {
          id: "sprig",
          field: 1,
          area: [6, 30],
          has: [2],
          lacks: [1],
          count: [0, 2],
        },
        {
          id: "glow",
          area: [4, 9],
          box: [3, 3],
          has: [5],
          count: [0, 2],
          to: { 4: "#d6e6a4", 5: "#eef6c4" },
        },
        { id: "speck", area: [1, 3], count: [3, 6] },
      ],
    },
  },
  // ---------------------------------------------------------------- Undead
  {
    id: "undead-wildfire",
    faction: "UNDEAD",
    letter: "A",
    label: "Wildfire aftermath: ash, soot, burnt twigs, charred lumps, embers",
    status: "CHOSEN",
    fields: ["undead-ash-b", "undead-ash-c"],
    recipe: {
      fields: [
        // undead-ash-b: ash, soot, charcoal, pale ash, ember.
        { to: ["#716a64", "#57504e", "#46403f", "#a59e95", "#d07a3a"] },
        // undead-ash-c: pale ash, soot (the field's base), charcoal, ember.
        { to: ["#a59e95", "#57504e", "#46403f", "#d07a3a"] },
      ],
      variants: 6,
      seed: 4821,
      kinds: [
        {
          id: "soot",
          area: [0, 0],
          count: [0, 2],
          blob: { radius: [6, 13], fill: "#635d59" },
        },
        {
          id: "lump",
          field: 1,
          area: [20, 75],
          has: [2],
          count: [0, 2],
          hollow: "#57504e",
        },
        {
          id: "scrub",
          area: [30, 140],
          has: [1],
          lacks: [4],
          count: [0, 1],
        },
        { id: "twig", area: [5, 29], lacks: [4], count: [2, 4] },
        { id: "ember", area: [4, 40], has: [4], count: [0, 1] },
        { id: "fleck", area: [1, 3], count: [5, 8] },
      ],
    },
  },
  {
    id: "undead-pale-ash",
    faction: "UNDEAD",
    letter: "B",
    label: "Pale ash field: burnt twigs and embers on light ash, no soot",
    status: "RUNNER_UP",
    fields: ["undead-ash-b"],
    recipe: {
      fields: [{ to: ["#928d87", "#625b58", "#46403f", "#b4aea6", "#d07a3a"] }],
      variants: 6,
      seed: 4822,
      kinds: [
        {
          id: "scrub",
          area: [30, 140],
          has: [1],
          lacks: [4],
          count: [0, 1],
        },
        { id: "twig", area: [5, 29], lacks: [4], count: [3, 5] },
        { id: "ember", area: [4, 40], has: [4], count: [0, 1] },
        { id: "fleck", area: [1, 3], count: [5, 8] },
      ],
    },
  },
  // ----------------------------------------------------------------- Dwarf
  {
    id: "dwarf-gravel",
    faction: "DWARF",
    letter: "A",
    label: "Mine gravel: verdigris stones, copper chips",
    status: "CHOSEN",
    fields: ["dwarf-gravel-a"],
    recipe: {
      // Palette of dwarf-gravel-a: grit, gravel (the field's base), stone,
      // verdigris, copper.
      fields: [{ to: ["#9a9483", "#b5ae9c", "#7b7667", "#5f9e8c", "#b87748"] }],
      variants: 6,
      seed: 4831,
      kinds: [
        { id: "stone", area: [12, 70], has: [2], lacks: [4], count: [3, 5] },
        { id: "copper", area: [1, 8], has: [4], count: [1, 3] },
        { id: "grit", area: [1, 4], lacks: [4, 3], count: [26, 36] },
      ],
    },
  },
  {
    id: "dwarf-slate",
    faction: "DWARF",
    letter: "B",
    label: "Slate highland: moss cushions, cracks",
    status: "RUNNER_UP",
    fields: ["dwarf-slate-a"],
    recipe: {
      // Palette of dwarf-slate-a: slate, moss, pale scree, crack.
      fields: [{ to: ["#8a949b", "#7c9a62", "#aab3ba", "#67737d"] }],
      variants: 6,
      seed: 4832,
      kinds: [
        { id: "moss", area: [20, 95], has: [1], count: [1, 3] },
        { id: "crack", area: [5, 14], has: [3], lacks: [1], count: [4, 7] },
        { id: "chip", area: [1, 4], count: [6, 10] },
      ],
    },
  },
  // ----------------------------------------------------------------- Candy
  {
    id: "candy-frosting",
    faction: "CANDY",
    letter: "A",
    label: "Mint frosting with sprinkles and sugar crystals",
    status: "CHOSEN",
    fields: ["candy-frosting-a"],
    recipe: {
      // Palette of candy-frosting-a: mint, pale mint (the field's base),
      // pink, yellow, white, lilac, mint shade.
      fields: [
        {
          to: [
            "#8fcbab",
            "#a4dabd",
            "#f08fb8",
            "#f4dc6c",
            "#ffffff",
            "#c39ae6",
            "#7ec0a0",
          ],
        },
      ],
      variants: 6,
      seed: 4841,
      kinds: [
        { id: "sprinkle", area: [5, 16], count: [4, 6] },
        { id: "crystal", area: [1, 4], count: [5, 8] },
      ],
    },
  },
  {
    id: "candy-cookie",
    faction: "CANDY",
    letter: "B",
    label: "Cookie dough with chocolate chips and sprinkles",
    status: "SAMPLE",
    fields: ["candy-cookie-b"],
    recipe: {
      // Palette of candy-cookie-b: dough, baked shade, chocolate, pink,
      // mint, sugar.
      fields: [
        {
          to: [
            "#dcc08c",
            "#c4a26c",
            "#7a5238",
            "#f08fb8",
            "#8fd0b0",
            "#fff6e0",
          ],
        },
      ],
      variants: 6,
      seed: 4842,
      kinds: [
        { id: "chip", area: [20, 60], has: [2], count: [1, 2] },
        { id: "crumb", area: [3, 12], has: [2], count: [1, 3] },
        { id: "sprinkle", area: [2, 12], lacks: [2, 1], count: [4, 7] },
      ],
    },
  },
  {
    id: "candy-icing",
    faction: "CANDY",
    letter: "C",
    label: "Vanilla icing with sugar pearls and piped squiggles",
    status: "SAMPLE",
    fields: ["candy-icing-a"],
    recipe: {
      // Palette of candy-icing-a: vanilla, pink, mint, lilac, white (the
      // field's base), biscuit.
      fields: [
        {
          to: [
            "#e2d0a8",
            "#f0a8c4",
            "#8fd0b0",
            "#c39ae6",
            "#efe3c8",
            "#d8c294",
          ],
        },
      ],
      variants: 6,
      seed: 4843,
      kinds: [
        { id: "squiggle", area: [22, 70], lacks: [0], count: [0, 1] },
        { id: "pearl", area: [7, 21], count: [1, 3] },
        { id: "sprinkle", area: [1, 6], count: [6, 9] },
      ],
    },
  },
  // --------------------------------------------------------------- Martian
  {
    id: "martian-regolith",
    faction: "MARTIAN",
    letter: "A",
    label: "Butterscotch dust with dark rocks",
    status: "SAMPLE",
    fields: ["martian-regolith-a", "martian-regolith-b"],
    recipe: {
      fields: [
        // martian-regolith-a: dust shade, rim, basalt, pale dust (the
        // field's base).
        { to: ["#b98a5e", "#a9794f", "#7d5440", "#cfa475"] },
        // martian-regolith-b: dust (the field's base), rim, basalt, pale.
        { to: ["#cfa475", "#a9794f", "#7d5440", "#e6c9a4"] },
      ],
      variants: 6,
      seed: 4851,
      kinds: [
        { id: "rock", field: 1, area: [12, 180], flip: true, count: [0, 2] },
        { id: "pebble", area: [1, 6], count: [8, 12] },
      ],
    },
  },
  {
    id: "martian-rust",
    faction: "MARTIAN",
    letter: "B",
    label: "Deep rust plain with stones",
    status: "SAMPLE",
    lead: true,
    fields: ["martian-rust-a"],
    recipe: {
      // Palette of martian-rust-a: rust, maroon, salmon, dark maroon.
      fields: [{ to: ["#a9623f", "#84452f", "#c98a62", "#6f3a2a"] }],
      variants: 6,
      seed: 4852,
      kinds: [
        { id: "rock", area: [12, 160], count: [1, 2] },
        { id: "pebble", area: [1, 6], count: [12, 18] },
      ],
    },
  },
  {
    id: "martian-craters",
    faction: "MARTIAN",
    letter: "C",
    label: "Salmon dust with small crater rings",
    status: "SAMPLE",
    fields: ["martian-ripples-a", "martian-rust-a"],
    recipe: {
      fields: [
        // martian-ripples-a: mid, dark, salmon (the field's base), rim.
        { to: ["#b0744f", "#a86b49", "#c58a64", "#8f5a44"] },
        // martian-rust-a, for its pebbles, in this ground's tones.
        { to: ["#c58a64", "#9a6248", "#dba888", "#8f5a44"] },
      ],
      variants: 6,
      seed: 4853,
      kinds: [
        { id: "crater", area: [8, 70], count: [1, 2] },
        { id: "pebble", field: 1, area: [1, 6], count: [8, 12] },
      ],
    },
  },
  // ---------------------------------------------------------------- Goblin
  {
    id: "goblin-savannah",
    faction: "GOBLIN",
    letter: "A",
    label: "Dry golden savannah",
    status: "CHOSEN",
    fields: ["goblin-savannah-a", "goblin-savannah-b"],
    recipe: {
      // Both fields: straw shade, dry grass, pale straw (the fields'
      // base), earth, olive.
      fields: [
        { to: ["#bca859", "#9a873f", "#d3c176", "#a98c5e", "#8e9a4c"] },
        { to: ["#bca859", "#9a873f", "#d3c176", "#a98c5e", "#8e9a4c"] },
      ],
      variants: 6,
      seed: 4861,
      kinds: [
        { id: "tuft", area: [40, 400], box: [34, 34], count: [0, 1] },
        { id: "clump", field: 1, area: [14, 80], count: [1, 2] },
        { id: "blade", field: 1, area: [3, 13], count: [3, 6] },
        { id: "speck", area: [1, 2], count: [3, 6] },
      ],
    },
  },
  {
    id: "goblin-badlands",
    faction: "GOBLIN",
    letter: "B",
    label: "Scrubby badlands: olive scrub and pale stones",
    status: "SAMPLE",
    fields: ["goblin-badlands-a"],
    recipe: {
      // Palette of goblin-badlands-a: khaki, crack, olive scrub, pale dust
      // (the field's base).
      fields: [{ to: ["#a99b6e", "#8d7d58", "#7f8748", "#c6b98d"] }],
      variants: 6,
      seed: 4862,
      kinds: [
        { id: "scrub", area: [14, 120], has: [2], count: [1, 2] },
        { id: "stone", area: [8, 60], lacks: [2], count: [1, 2] },
        { id: "speck", area: [1, 5], count: [8, 12] },
      ],
    },
  },
  {
    id: "goblin-mud",
    faction: "GOBLIN",
    letter: "C",
    label: "Trampled camp mud: puddles, straw, tufts",
    status: "SAMPLE",
    fields: ["goblin-mud-b"],
    recipe: {
      // Palette of goblin-mud-b: mud, wet mud, straw, grass, dark mud.
      fields: [{ to: ["#a39262", "#85764e", "#d6c88a", "#8a9a4c", "#6a5e3e"] }],
      variants: 6,
      seed: 4863,
      kinds: [
        {
          id: "puddle",
          area: [0, 0],
          count: [0, 1],
          blob: { radius: [7, 12], fill: "#8a7b52", rimTop: "#77693f" },
        },
        { id: "tuft", area: [14, 60], count: [2, 4] },
        { id: "straw", area: [2, 8], has: [2], count: [3, 5] },
        { id: "speck", area: [1, 4], lacks: [2], count: [4, 7] },
      ],
    },
  },
];
