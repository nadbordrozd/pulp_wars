/**
 * The ground candidates of bead pulp_wars-2yc.48 (docs/art/FACTION_GRASS.md):
 * one PixelLab field per recipe, made by the chibi pipeline's `terrain`
 * class (Pixflux, flat shading, a forced palette) in the exploration run
 * `art/explorations/faction-grounds-2026-10/`.
 *
 * A candidate is one look of one faction's ground. Its palette is the
 * forced palette of its recipes, base colour first; its subject is the
 * prompt's subject layer. `scripts/art/faction-grounds.ts plan` writes the
 * palettes, the run's subjects and its batch manifest from this list, so
 * the three cannot drift apart.
 */
export type GroundFaction =
  "CULT" | "UNDEAD" | "DWARF" | "CANDY" | "MARTIAN" | "GOBLIN";

export interface GroundRecipe {
  /** The recipe id in the run: `<candidate>-<suffix>`. */
  readonly suffix: string;
  readonly seed: number;
  /** Replaces the candidate's subject for this recipe. */
  readonly subject?: string;
  readonly promptAddendum?: string;
  readonly negativeAddendum?: string;
  /** Replaces the candidate's palette for this recipe (base first). */
  readonly palette?: readonly string[];
  readonly notes: string;
}

export interface GroundCandidate {
  readonly id: string;
  readonly faction: GroundFaction;
  readonly label: string;
  readonly subject: string;
  /** The forced palette, base colour first. */
  readonly palette: readonly string[];
  readonly negative: string;
  readonly recipes: readonly GroundRecipe[];
}

const NO_OBJECTS =
  "trees, bushes, shrubs, animals, people, path, road, river, shore, cliff, big rocks, boulders, wall, fence";

const TEXTURE =
  "a flat seamless ground texture seen from directly above, with no shading and no shadows";

export const GROUND_CANDIDATES: readonly GroundCandidate[] = [
  // ------------------------------------------------------------------ Cult
  {
    id: "cult-swamp",
    faction: "CULT",
    label: "Bog with still pools and reeds",
    subject: `Subject: ${TEXTURE}: a murky peat bog, one flat even dull grey teal-green colour everywhere, with a few small round still pools of darker teal water, a few small clumps of short reeds and a very few tiny pale yellow-green glowing specks scattered evenly and sparsely, nothing else; wet peat only.`,
    palette: ["#55786a", "#3d5c5e", "#7fa39a", "#3f5a45", "#8aa66e", "#d9e8a8"],
    negative: `${NO_OBJECTS}, flowers, lily, frog, fish, purple, pink`,
    recipes: [
      {
        suffix: "a",
        seed: 48101,
        notes: "First field: peat base, pools, reeds, glow specks.",
      },
      {
        suffix: "b",
        seed: 48102,
        subject: `Subject: ${TEXTURE}: wet bog mud, one flat even dull grey teal-green colour everywhere, with many tiny dark teal puddles each no bigger than a coin, tiny tufts of three short reed blades and a very few tiny pale yellow-green glowing dots scattered evenly, nothing else.`,
        notes:
          "The texture wording of the run (style and class overrides), and small words: tiny puddles and reed tufts, no pools.",
      },
      {
        suffix: "c",
        seed: 48103,
        subject: `Subject: ${TEXTURE}: a mossy bog, one flat even dull olive green moss colour everywhere, with several small separate ponds of dark teal still water of different irregular rounded shapes, each pond with a thin paler shoreline and one tiny pale glint, scattered evenly with clear moss between them, nothing else.`,
        palette: ["#777a56", "#466a6c", "#3a5759", "#8fa79a", "#5f6a48"],
        negativeAddendum: `${NO_OBJECTS}, flowers, lily, frog, fish, purple, pink, reeds, grass, stones`,
        notes:
          "Pools only, for the pool motifs: cult-swamp-b gave reeds and glow specks but its water is a band through the field.",
      },
      {
        suffix: "d",
        seed: 48104,
        subject: `Subject: ${TEXTURE}: a mossy bog, one flat even dull olive green moss colour everywhere, with many tiny flat puddles of dark teal still water, each puddle a small irregular blot about one tenth of the image wide with one tiny pale glint, completely flat like a stain, scattered evenly with clear moss between them, nothing else.`,
        palette: ["#777a56", "#466a6c", "#8fa79a", "#5f6a48"],
        negativeAddendum: `${NO_OBJECTS}, flowers, lily, frog, fish, purple, pink, reeds, grass, stones, holes, pits, craters, walls, depth, big ponds`,
        notes:
          "cult-swamp-c drew four pits 60 px wide with walls. Tiny flat puddles, a tenth of the image, no depth.",
      },
    ],
  },
  {
    id: "cult-moss",
    faction: "CULT",
    label: "Moss bog with duckweed and puddles",
    subject: `Subject: ${TEXTURE}: a mossy marsh, one flat even dull dark sea-green colour everywhere, with a few flat low patches of slightly lighter moss, a few tiny round puddles of dark still water with one pale glint each, and tiny dots of duckweed scattered evenly and sparsely, nothing else; marsh only.`,
    palette: ["#527566", "#648a72", "#35555a", "#a9c7a0", "#3f5a45"],
    negative: `${NO_OBJECTS}, flowers, frog, fish, purple, pink, reeds, tall grass`,
    recipes: [
      {
        suffix: "a",
        seed: 48111,
        notes: "The alternative: moss patches and puddles, no reeds.",
      },
    ],
  },
  // ---------------------------------------------------------------- Undead
  {
    id: "undead-ash",
    faction: "UNDEAD",
    label: "Ash field after a wildfire",
    subject: `Subject: ${TEXTURE}: burnt ground after a wildfire, one flat even ash grey colour everywhere, with a few small patches of charred dark earth, a few tiny black burnt tree stubs and short black twigs, small pale ash flecks and a very few tiny glowing orange embers scattered evenly and sparsely, nothing else; ash and burnt earth only.`,
    palette: ["#8a8580", "#5e5856", "#3b3637", "#b4aea6", "#d07a3a"],
    negative: `${NO_OBJECTS}, flames, fire, smoke, grass, green, skulls, bones, graves`,
    recipes: [
      {
        suffix: "a",
        seed: 48201,
        notes: "First field: ash base, char patches, stubs, embers.",
      },
      {
        suffix: "b",
        seed: 48202,
        subject: `Subject: ${TEXTURE}: cold ash after a wildfire, one flat even ash grey colour everywhere, with many small flat blotches of darker charred soot, tiny black charcoal bits and short black twigs lying flat, tiny pale ash flecks and a very few tiny glowing orange ember dots scattered evenly, nothing else.`,
        negativeAddendum: `${NO_OBJECTS}, flames, fire, smoke, grass, green, skulls, bones, graves, stumps, logs, flowers`,
        notes:
          "The texture wording of the run, and nothing that stands: soot blotches, charcoal bits, twigs lying flat, ember dots.",
      },
      {
        suffix: "c",
        seed: 48203,
        subject: `Subject: ${TEXTURE}: cold ash after a wildfire, one flat even ash grey colour everywhere, with several separate flat patches of darker charred black soot of different irregular shapes and sizes, a few of them with tiny glowing orange ember dots inside, scattered evenly with clear ash between them, nothing else.`,
        palette: ["#8a8580", "#5e5856", "#3b3637", "#d07a3a"],
        negativeAddendum: `${NO_OBJECTS}, flames, fire, smoke, grass, green, skulls, bones, graves, stumps, logs, flowers, twigs`,
        notes:
          "Soot patches only, for the patch motifs: undead-ash-b gave twigs, embers and flecks but no patch of a second tone.",
      },
    ],
  },
  {
    id: "undead-char",
    faction: "UNDEAD",
    label: "Charred earth with ash drifts",
    subject: `Subject: ${TEXTURE}: scorched earth after a wildfire, one flat even dark warm grey colour everywhere, with a few small drifts of pale grey ash, a few short thin cracks, tiny black burnt stubs and a very few tiny glowing orange embers scattered evenly and sparsely, nothing else; scorched earth only.`,
    palette: ["#6f6966", "#9a948d", "#3b3637", "#57514f", "#d07a3a"],
    negative: `${NO_OBJECTS}, flames, fire, smoke, grass, green, skulls, bones, graves, lava`,
    recipes: [
      {
        suffix: "a",
        seed: 48211,
        notes: "The alternative: a darker scorched base with pale ash drifts.",
      },
    ],
  },
  // ----------------------------------------------------------------- Dwarf
  {
    id: "dwarf-flags",
    faction: "DWARF",
    label: "Worked stone flags with mossy joints",
    subject: `Subject: ${TEXTURE}: an old dwarf-built stone pavement, one flat even pale warm grey stone colour everywhere, big irregular flat flagstones separated by thin slightly darker joints, a little green moss in a few joints and a very few small stone chips, nothing else; worn flagstones only.`,
    palette: ["#a9a698", "#8a8778", "#7f9460", "#c4c1b3"],
    negative: `${NO_OBJECTS}, bricks, regular grid, tiles, cobblestones, runes, letters`,
    recipes: [
      {
        suffix: "a",
        seed: 48301,
        notes: "Candidate A: worked flags, moss in the joints.",
      },
      {
        suffix: "b",
        seed: 48302,
        subject: `Subject: ${TEXTURE}: a worn stone floor, one flat even pale warm grey stone colour everywhere, covered edge to edge by big irregular flat flagstones of that one colour fitted together, with thin slightly darker joints between them, a little dull green moss in a few joints and a very few tiny pale stone chips, nothing else.`,
        negativeAddendum: `${NO_OBJECTS}, bricks, regular grid, tiles, cobblestones, runes, letters, grass, lawn, green ground`,
        notes:
          "The texture wording of the run; the floor covers the image edge to edge (dwarf-flags-a drew a paved road across a lawn).",
      },
      {
        suffix: "c",
        seed: 48303,
        subject: `Subject: ${TEXTURE}: a worn stone floor, one flat even pale warm grey stone colour everywhere, made of exactly four big square flagstones across and four down, sixteen in all, every flagstone the same size, with thin slightly darker joints between them, a little dull green moss in a few joints and a very few tiny pale stone chips, nothing else.`,
        negativeAddendum: `${NO_OBJECTS}, bricks, small tiles, cobblestones, runes, letters, grass, lawn, green ground`,
        notes:
          "dwarf-flags-b is a floor, but its flagstones are 34 px: no 80 px window of it repeats. Four across and four down would be 40 px, two to a cell.",
      },
    ],
  },
  {
    id: "dwarf-slate",
    faction: "DWARF",
    label: "Slate highland with moss and scree",
    subject: `Subject: ${TEXTURE}: a bare slate highland, one flat even cool blue-grey slate colour everywhere, with a few small flat patches of dull green moss, small pale grey scree chips and a few short dark cracks scattered evenly and sparsely, nothing else; slate and moss only.`,
    palette: ["#7f8c96", "#74925f", "#a9b3ba", "#5c6873"],
    negative: `${NO_OBJECTS}, snow, grass tufts, flowers`,
    recipes: [
      {
        suffix: "a",
        seed: 48311,
        notes: "Candidate B: slate with moss patches and scree.",
      },
    ],
  },
  {
    id: "dwarf-gravel",
    faction: "DWARF",
    label: "Copper-stained gravel",
    subject: `Subject: ${TEXTURE}: mine spoil gravel, one flat even warm grey-tan gravel colour everywhere, with small pale and dark pebbles, a few small flat stains of blue-green verdigris and a very few tiny copper-orange ore chips scattered evenly and sparsely, nothing else; gravel only.`,
    palette: ["#a39a86", "#c2b9a6", "#7d7564", "#6fa392", "#b87748"],
    negative: `${NO_OBJECTS}, grass, moss, flowers, rails, cart`,
    recipes: [
      {
        suffix: "a",
        seed: 48321,
        notes: "Candidate C: gravel with verdigris stains and copper chips.",
      },
    ],
  },
  // ----------------------------------------------------------------- Candy
  {
    id: "candy-frosting",
    faction: "CANDY",
    label: "Mint frosting with sprinkles and sugar crystals",
    subject: `Subject: ${TEXTURE}: the top of a frosted cake, one flat even pastel mint green frosting colour everywhere, with small rod-shaped sugar sprinkles in pink, yellow, white and lilac lying in every direction, a few tiny white sugar crystals and one or two faint pale swirls of piped icing scattered evenly and sparsely, nothing else; frosting only.`,
    palette: [
      "#9cd4b6",
      "#b8e6ce",
      "#f39cc2",
      "#f7e27c",
      "#ffffff",
      "#c9a2ea",
      "#7ec0a0",
    ],
    negative: `${NO_OBJECTS}, cake slice, plate, candles, cherries, fruit, cupcake`,
    recipes: [
      {
        suffix: "a",
        seed: 48401,
        notes: "Candidate A: the mint meadow as frosting, larger sprinkles.",
      },
    ],
  },
  {
    id: "candy-cookie",
    faction: "CANDY",
    label: "Cookie crumb with chocolate chips and sprinkles",
    subject: `Subject: ${TEXTURE}: the top of a big biscuit, one flat even pale golden cookie dough colour everywhere, with a few small dark chocolate chips, tiny darker baked crumbs, a few rod-shaped sugar sprinkles in pink, mint and white and a few tiny white sugar grains scattered evenly and sparsely, nothing else; biscuit only.`,
    palette: ["#e3c690", "#c9a66e", "#7a5238", "#f39cc2", "#9cd4b6", "#fff6e0"],
    negative: `${NO_OBJECTS}, plate, bite, cracks, cookie edge, round cookie`,
    recipes: [
      {
        suffix: "a",
        seed: 48411,
        notes: "Candidate B: a biscuit ground, chips and sprinkles.",
      },
      {
        suffix: "b",
        seed: 48412,
        subject: `Subject: ${TEXTURE}: the smooth top of a big biscuit, one flat even pale golden cookie dough colour everywhere, with a few small dark chocolate chips, a few rod-shaped sugar sprinkles in pink, mint and white and a few tiny darker baked dots scattered evenly and sparsely, nothing else; smooth biscuit only.`,
        negativeAddendum: `${NO_OBJECTS}, plate, bite, cracks, cookie edge, round cookie, crumbs, flour, sugar dust, white patches`,
        notes:
          "candy-cookie-a is half white crumbs: noise, and no flat base. Smooth biscuit, fewer things.",
      },
    ],
  },
  {
    id: "candy-icing",
    faction: "CANDY",
    label: "Vanilla icing with pastel swirls",
    subject: `Subject: ${TEXTURE}: smooth royal icing, one flat even warm vanilla cream colour everywhere, with a few faint curled swirls of pale pink and pale mint piped icing, small round sugar pearls in pink, mint and lilac and tiny sugar sprinkles scattered evenly and sparsely, nothing else; icing only.`,
    palette: ["#f1e3c4", "#f4bfd0", "#a9dcc0", "#c9a2ea", "#fffaf0", "#dcc79c"],
    negative: `${NO_OBJECTS}, cake slice, plate, candles, cherries, fruit, cupcake`,
    recipes: [
      {
        suffix: "a",
        seed: 48421,
        notes: "Candidate C: cream icing, piped swirls and sugar pearls.",
      },
    ],
  },
  // --------------------------------------------------------------- Martian
  {
    id: "martian-regolith",
    faction: "MARTIAN",
    label: "Butterscotch dust with rocks and small craters",
    subject: `Subject: ${TEXTURE}: the dusty surface of the planet Mars, one flat even butterscotch orange dust colour everywhere, with a few small dark basalt rocks, small pale pebbles and two or three small shallow round craters with a thin darker rim scattered evenly and sparsely, nothing else; dust and rock only.`,
    palette: ["#c79a6b", "#a9794f", "#7d5440", "#e0c19b"],
    negative: `${NO_OBJECTS}, plants, grass, water, rover, footprints, big crater`,
    recipes: [
      {
        suffix: "a",
        seed: 48501,
        notes: "Candidate A: lighter butterscotch regolith, craters.",
      },
      {
        suffix: "b",
        seed: 48502,
        subject: `Subject: ${TEXTURE}: the dusty surface of the planet Mars, one flat even butterscotch orange dust colour everywhere, with many small dark basalt rocks of different shapes, small pale pebbles and several tiny shallow round craters, each crater a small flat ring with a thin darker rim, scattered evenly, nothing else; dust and rock only.`,
        notes:
          "More motifs for the look: martian-regolith-a has six rocks and no crater.",
      },
    ],
  },
  {
    id: "martian-rust",
    faction: "MARTIAN",
    label: "Deep rust plain with scattered stones",
    subject: `Subject: ${TEXTURE}: the rocky rust desert of the planet Mars, one flat even deep rust red-brown colour everywhere, with many small flat angular stones in a darker maroon brown and a few in a paler salmon, and tiny pebbles scattered evenly and sparsely, nothing else; rust dust and stones only.`,
    palette: ["#a9623f", "#84452f", "#c98a62", "#6a3527"],
    negative: `${NO_OBJECTS}, plants, grass, water, rover, footprints, crater, lava`,
    recipes: [
      {
        suffix: "a",
        seed: 48511,
        notes: "Candidate B: deeper rust with flat stones.",
      },
    ],
  },
  {
    id: "martian-ripples",
    faction: "MARTIAN",
    label: "Wind-rippled salmon dust",
    subject: `Subject: ${TEXTURE}: wind-blown dust on the planet Mars, one flat even dusty salmon orange colour everywhere, with a few short gently curved wind ripple marks in a slightly darker tone, a few small dark stones and tiny pale pebbles scattered evenly and sparsely, nothing else; dust only.`,
    palette: ["#c2835c", "#a86b49", "#d9a27c", "#74483a"],
    negative: `${NO_OBJECTS}, plants, grass, water, rover, footprints, crater, dunes, waves`,
    recipes: [
      {
        suffix: "a",
        seed: 48521,
        notes: "Candidate C: wind ripples, no craters.",
      },
      {
        suffix: "b",
        seed: 48522,
        subject: `Subject: ${TEXTURE}: wind-blown dust on the planet Mars, one flat even dusty salmon orange colour everywhere, with a few short separate curved wind ripple strokes in a slightly darker tone, like small sand ripples, a few small dark stones and tiny pale pebbles scattered evenly and sparsely, nothing else; dust only.`,
        negativeAddendum: `${NO_OBJECTS}, plants, grass, water, rover, footprints, crater, rings, circles, dunes, waves`,
        notes:
          "martian-ripples-a drew crater rings in outline, no ripples and no stones. Ripple strokes, no circles.",
      },
    ],
  },
  // ---------------------------------------------------------------- Goblin
  {
    id: "goblin-savannah",
    faction: "GOBLIN",
    label: "Dry golden savannah",
    subject: `Subject: ${TEXTURE}: a dry savannah, one flat even pale golden straw colour everywhere, with small tufts of dry golden-brown grass, a few small bare patches of cracked tan earth and a very few small olive-green tufts scattered evenly and sparsely, nothing else; dry grass only.`,
    palette: ["#cdbb68", "#a8964a", "#e2d48e", "#a98c5e", "#8e9a4c"],
    negative: `${NO_OBJECTS}, acacia, flowers, bones, tall grass`,
    recipes: [
      {
        suffix: "a",
        seed: 48601,
        notes: "Candidate A, the lead idea: golden dry grass, cracked earth.",
      },
      {
        suffix: "b",
        seed: 48602,
        subject: `Subject: ${TEXTURE}: a dry savannah, one flat even pale golden straw colour everywhere, with many small separate tufts of dry golden-brown grass of different sizes, several small bare patches of cracked tan earth and a very few small olive-green tufts scattered evenly, nothing else; dry grass only.`,
        notes:
          "More motifs for the look: the big tufts of goblin-savannah-a are cut by the field's edge, and it has no cracked earth.",
      },
    ],
  },
  {
    id: "goblin-badlands",
    faction: "GOBLIN",
    label: "Scrubby badlands",
    subject: `Subject: ${TEXTURE}: dry scrubby badlands, one flat even dusty khaki tan colour everywhere, with a few short thin cracks, small low olive scrub tufts, a few small pale stones and tiny dry twigs scattered evenly and sparsely, nothing else; dry earth only.`,
    palette: ["#b5a678", "#8d7d58", "#7f8748", "#d6cba6"],
    negative: `${NO_OBJECTS}, cactus, flowers, bones, skulls, canyon`,
    recipes: [
      {
        suffix: "a",
        seed: 48611,
        notes: "Candidate B: khaki cracked earth with olive scrub.",
      },
    ],
  },
  {
    id: "goblin-mud",
    faction: "GOBLIN",
    label: "Muddy trampled camp ground",
    subject: `Subject: ${TEXTURE}: the trampled muddy ground of a war camp, one flat even dull olive-brown mud colour everywhere, with a few small darker wet puddles, small bits of pale straw, a few short tufts of yellow-green grass and tiny pebbles scattered evenly and sparsely, nothing else; mud only.`,
    palette: ["#94875a", "#6f6444", "#cabc7c", "#8a9a4c", "#b0a274"],
    negative: `${NO_OBJECTS}, footprints, tents, campfire, bones, wheel tracks`,
    recipes: [
      {
        suffix: "a",
        seed: 48621,
        notes: "Candidate C: trampled mud, straw and puddles.",
      },
      {
        suffix: "b",
        seed: 48622,
        subject: `Subject: ${TEXTURE}: the trampled muddy ground of a war camp, one flat even dull tan-brown mud colour everywhere, with several small separate darker wet puddles of irregular shape, short bits of pale straw lying flat, a few tiny tufts of yellow-green grass and tiny pebbles scattered evenly and sparsely, nothing else; mud only.`,
        palette: ["#a39262", "#7a6c48", "#d6c88a", "#8a9a4c", "#5f5438"],
        notes:
          "goblin-mud-a is a flat dark olive with thin green blades: no puddles, no straw, and as dark as the bog. A lighter tan mud, puddles asked for by shape.",
      },
    ],
  },
];

export const GROUND_RUN = "art/explorations/faction-grounds-2026-10";
export const GROUND_RUN_FACTION = "TEST-FACTION-GROUNDS";
export const GROUND_BEAD = "pulp_wars-2yc.48";

export function groundRecipeId(
  candidate: GroundCandidate,
  recipe: GroundRecipe,
): string {
  return `${candidate.id}-${recipe.suffix}`;
}

/** The forced palette PNG of a recipe. */
export function groundPalettePath(
  candidate: GroundCandidate,
  recipe: GroundRecipe,
): string {
  return `scripts/art/chibi/palettes/ground-${candidate.id}${recipe.palette === undefined ? "" : `-${recipe.suffix}`}.png`;
}

/** `TERRAIN:GRASS/<VARIANT>`, the subject key of a recipe's asset. */
export function groundSubjectKey(
  candidate: GroundCandidate,
  recipe: GroundRecipe,
): string {
  const variant =
    `${candidate.id}${recipe.subject === undefined ? "" : `-${recipe.suffix}`}`
      .toUpperCase()
      .replaceAll(/[^A-Z]/g, "_");
  return `TERRAIN:GRASS/${variant}`;
}
