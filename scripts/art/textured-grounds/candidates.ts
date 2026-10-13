/**
 * EXPERIMENT (bead pulp_wars-2yc.48, second round; docs/art/TEXTURED_GROUNDS.md):
 * fully textured grounds in the spirit of the terrain of Heroes of Might
 * and Magic II. The user, 2026-10-13: "the gold standard for these tiles
 * should be HoMM 2 tiles. They are beautiful varied and very clearly
 * express steppe vs grass vs marsh vs volcanic vs sand vs dirt vs snow."
 *
 * A candidate is one PixelLab field: a Pixflux image of 400 x 400 forced
 * to a small palette of close tones, whose whole surface is the material.
 * `scripts/art/textured-grounds.ts plan` writes the palettes, the subjects
 * and the batch manifest of the exploration run
 * `art/explorations/textured-grounds-2026-10/` from this list.
 */
export type TexturedFaction =
  | "MARTIAN"
  | "DWARF"
  | "CULT"
  // The default Grass: neutral land and the Humans'.
  | "NEUTRAL"
  | "UNDEAD"
  | "GOBLIN"
  | "CANDY"
  | "DINOSAUR"
  | "ICE_FOLK";

export interface TexturedCandidate {
  /** The recipe id in the run. */
  readonly id: string;
  readonly faction: TexturedFaction;
  readonly label: string;
  readonly subject: string;
  /** The forced palette: close tones, the commonest ground tone first. */
  readonly palette: readonly string[];
  readonly negative: string;
  readonly seed: number;
  /** The request size, a square. Default TEXTURED_FIELD. */
  readonly size?: number;
  /** Replaces the run's Pixflux options (shading, detail, outline). */
  readonly options?: Readonly<Record<string, string>>;
  readonly notes: string;
}

export const TEXTURED_RUN = "art/explorations/textured-grounds-2026-10";
export const TEXTURED_RUN_FACTION = "TEST-TEXTURED-GROUNDS";
export const TEXTURED_BEAD = "pulp_wars-2yc.48";
/** The request size: Pixflux's largest, five board cells a side. */
export const TEXTURED_FIELD = 400;

const NOTHING_TALL =
  "trees, bushes, plants, grass, animals, people, path, road, river, water, cliff, wall, fence, buildings, big boulders, mountains, horizon, sky";

/** Close greens round the default Grass (#8ab85c and its three tufts). */
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
const MINT = ["#a4dabd", "#b0e2c8", "#98d1b2", "#8cc8a8", "#ffffff", "#c8eedb"];
const JUNGLE = [
  "#5f9f58",
  "#6aab61",
  "#55924f",
  "#4a8549",
  "#3c703f",
  "#86c474",
  "#7a8a4a",
];
const SNOW = ["#e6eef0", "#f4f8f9", "#d6e2e8", "#c4d4de", "#ffffff", "#b4c6d4"];

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
const MOSS = [
  "#8d9288",
  "#a1a59a",
  "#7a7f76",
  "#646b5e",
  "#6f8a4e",
  "#87a05d",
  "#5a7141",
];
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

export const TEXTURED_CANDIDATES: readonly TexturedCandidate[] = [
  {
    id: "martian-regolith-a",
    faction: "MARTIAN",
    label: "Mars regolith: dust with scattered rocks of many sizes",
    subject:
      "Subject: the surface of the planet Mars seen from directly above, filling the whole image: fine rust-red dust with soft uneven darker and lighter patches, wind-blown dust drifts, and many separate rocks of very different sizes and shapes strewn over it: small pebbles, angular stones, a few flat slabs, some half buried in the dust; every rock stands apart from the others, with a lit side and a soft shadow.",
    palette: MARS,
    negative: `${NOTHING_TALL}, crater lake, rover, footprints, green, blue, lava, fire`,
    seed: 48701,
    notes:
      "The lead Mars texture: dust that is not flat, discrete varied rocks.",
  },
  {
    id: "dwarf-moss-a",
    faction: "DWARF",
    label: "Moss-covered stones: cobbles with moss in the gaps and on top",
    subject:
      "Subject: an old field of moss-covered stones seen from directly above, filling the whole image: rounded grey stones and cobbles of different sizes lying close together, soft green moss growing in all the gaps between them and creeping over the tops of many stones; no bare ground; every stone softly shaded, lit from one side.",
    palette: MOSS,
    negative: `${NOTHING_TALL}, bricks, regular grid, paving, tiles, flowers, mushrooms, snow`,
    seed: 48711,
    notes:
      "The lead Dwarf texture: stones and moss everywhere, no bare ground.",
  },
  {
    id: "martian-regolith-c",
    faction: "MARTIAN",
    label: "Mars regolith at 160 px: dust with scattered rocks of many sizes",
    subject:
      "Subject: the surface of the planet Mars seen from directly above, filling the whole image: fine rust-red dust with soft uneven darker and lighter patches and many separate rocks of very different sizes and shapes strewn over it: pebbles, angular stones, a few flat slabs, some half buried in the dust; every rock stands apart from the others, with a lit side and a soft shadow.",
    palette: MARS,
    negative: `${NOTHING_TALL}, crater lake, rover, footprints, green, blue, lava, fire, canyon, cliffs, stripes, furrows`,
    seed: 48703,
    size: 160,
    notes:
      "martian-regolith-a at 400 px was a canyon mouth over striped dust: Pixflux does not hold a texture at that size. The size the flat fields were made at.",
  },
  {
    id: "martian-regolith-d",
    faction: "MARTIAN",
    label: "Mars regolith at 160 px: slabs, pebble clusters, a small crater",
    subject:
      "Subject: the surface of the planet Mars seen from directly above, filling the whole image: mottled rust-red dust and, strewn over it, separate rocks of different sizes: flat cracked slabs, angular stones half buried in dust, clusters of pebbles, and one or two small shallow impact craters with a raised rim; every rock stands apart, with a lit side and a soft shadow.",
    palette: MARS,
    negative: `${NOTHING_TALL}, crater lake, rover, footprints, green, blue, lava, fire, canyon, cliffs, stripes, furrows, big crater`,
    seed: 48704,
    size: 160,
    notes: "A second exemplar for the quilt: other rocks, craters asked for.",
  },
  {
    id: "martian-rocks-a",
    faction: "MARTIAN",
    label: "Mars rocks at 160 px: many shapes, for the rock motifs",
    subject:
      "Subject: the flat dusty surface of the planet Mars seen from directly above, one even rust-red dust colour, with about twenty separate rocks spread evenly over the whole image, each of a different shape and size and none wider than a sixth of the image: sharp angular shards, flat cracked slabs, round boulders, long ridged stones, stones half buried in dust, tight clusters of three pebbles; every rock stands well apart from the others, with a lit side and a soft shadow.",
    palette: MARS,
    negative: `${NOTHING_TALL}, crater lake, rover, footprints, green, blue, lava, fire, canyon, cliffs, stripes, furrows, mesa, plateau, large rock`,
    seed: 48707,
    size: 160,
    notes:
      "The four fields hold about forty rocks, most of them round: a field asked for the shapes, to cut the rock motifs from.",
  },
  {
    id: "martian-rocks-b",
    faction: "MARTIAN",
    label: "Mars rocks at 160 px: slabs, shards and small craters",
    subject:
      "Subject: the flat dusty surface of the planet Mars seen from directly above, one even rust-red dust colour, with about twenty separate things spread evenly over the whole image, each different and none wider than a sixth of the image: flat layered rock slabs, broken angular shards, wind-carved stones with a sharp edge, half-buried rocks, small heaps of rubble, and three small shallow impact craters with a raised rim; every one stands well apart from the others, with a lit side and a soft shadow.",
    palette: MARS,
    negative: `${NOTHING_TALL}, crater lake, rover, footprints, green, blue, lava, fire, canyon, cliffs, stripes, furrows, mesa, plateau, large rock, big crater`,
    seed: 48708,
    size: 160,
    notes: "A second sheet of rock motifs, with craters asked for.",
  },
  {
    id: "martian-rocks-c",
    faction: "MARTIAN",
    label: "Mars rocks at 160 px: angular shards and flat slabs",
    subject:
      "Subject: the flat dusty surface of the planet Mars seen from directly above, one even rust-red dust colour, with about twenty-five separate small rocks spread evenly over the whole image, all of them sharp and angular, none round and none wider than a seventh of the image: jagged splinters, flat square-edged slabs, cracked plates broken in two, wedge-shaped shards, long thin blades of stone, small heaps of sharp rubble; every rock stands well apart from the others, with a lit side and a soft shadow.",
    palette: MARS,
    negative: `${NOTHING_TALL}, crater lake, rover, footprints, green, blue, lava, fire, canyon, cliffs, stripes, furrows, mesa, plateau, large rock, round boulders, pebbles, layered rock`,
    seed: 48709,
    size: 160,
    notes:
      "The user: 'more varied (but still discrete!) rocks'. The rocks of the six fields are mostly round; angular ones asked for by name.",
  },
  {
    id: "dwarf-moss-c",
    faction: "DWARF",
    label: "Moss-covered stones at 160 px",
    subject:
      "Subject: an old field of moss-covered stones seen from directly above, filling the whole image: rounded grey stones and cobbles of many different sizes lying close together at random, soft green moss growing in the gaps between them and creeping over the tops of many stones; no bare ground; every stone softly shaded, lit from one side.",
    palette: MOSS,
    negative: `${NOTHING_TALL}, bricks, regular grid, rows, paving, tiles, flowers, mushrooms, snow, identical stones`,
    seed: 48713,
    size: 160,
    notes:
      "dwarf-moss-a at 400 px was rows of one stone on a flat green. The size the flat fields were made at; 'at random', 'many different sizes'.",
  },
  {
    id: "dwarf-moss-d",
    faction: "DWARF",
    label: "Moss-covered stones at 160 px: larger boulder tops",
    subject:
      "Subject: mossy rocky ground seen from directly above, filling the whole image: flat grey stones and worn boulder tops of many different sizes set in the earth at random, most of them half covered with thick green moss, moss and small pebbles filling the gaps between them; no bare ground; soft shading, lit from one side.",
    palette: MOSS,
    negative: `${NOTHING_TALL}, bricks, regular grid, rows, paving, tiles, flowers, mushrooms, snow, identical stones`,
    seed: 48714,
    size: 160,
    notes: "A second exemplar for the quilt: larger stones, more moss on top.",
  },
  {
    id: "martian-regolith-e",
    faction: "MARTIAN",
    label: "Mars regolith at 160 px: small rocks only",
    subject:
      "Subject: the flat surface of the planet Mars seen from directly above, filling the whole image: mottled rust-red dust and, strewn evenly over it, many separate small rocks of different shapes, none wider than a tenth of the image: pebbles, angular stones, small flat slabs, some half buried in the dust; every rock stands apart, with a lit side and a soft shadow.",
    palette: MARS,
    negative: `${NOTHING_TALL}, crater lake, rover, footprints, green, blue, lava, fire, canyon, cliffs, stripes, furrows, mesa, plateau, large rock, rock taller than a pebble`,
    seed: 48705,
    size: 160,
    notes:
      "martian-regolith-c and -d have mesas and tree-stump rocks 50 px wide: tall things. Small rocks only, by size.",
  },
  {
    id: "martian-regolith-f",
    faction: "MARTIAN",
    label: "Mars regolith at 160 px: small rocks, dust ripples, small craters",
    subject:
      "Subject: the flat surface of the planet Mars seen from directly above, filling the whole image: rust-red dust with soft wind ripples and darker patches, three or four small shallow impact craters each no wider than a tenth of the image, and many separate small rocks of different shapes, none wider than a tenth of the image, some half buried; every rock stands apart, with a lit side and a soft shadow.",
    palette: MARS,
    negative: `${NOTHING_TALL}, crater lake, rover, footprints, green, blue, lava, fire, canyon, cliffs, stripes, furrows, mesa, plateau, large rock, big crater`,
    seed: 48706,
    size: 160,
    notes: "A further exemplar: ripples and small craters.",
  },
  {
    id: "dwarf-moss-e",
    faction: "DWARF",
    label: "Moss-covered stones at 160 px: stones over most of the image",
    subject:
      "Subject: a bed of moss-covered stones seen from directly above, filling the whole image: rounded grey stones of many different sizes, none wider than a tenth of the image, packed close together at random and covering most of the image, with soft green moss in every gap between them and patches of moss on top of many stones; soft shading, lit from one side.",
    palette: MOSS,
    negative: `${NOTHING_TALL}, bricks, regular grid, rows, paving, tiles, flowers, mushrooms, snow, identical stones, wall, border, frame, lawn, large rock`,
    seed: 48715,
    size: 160,
    notes:
      "dwarf-moss-c is a lawn with stones inside a stone wall, dwarf-moss-d a cliff: stones over most of the image, small, no wall.",
  },
  {
    id: "dwarf-moss-f",
    faction: "DWARF",
    label: "Moss-covered stones at 160 px: a second bed",
    subject:
      "Subject: a dry river bed of moss-covered pebbles and stones seen from directly above, filling the whole image: grey stones of many different sizes and shapes, none wider than a tenth of the image, lying close together at random over the whole image, thick green moss between them and growing over the tops of half of them; soft shading, lit from one side.",
    palette: MOSS,
    negative: `${NOTHING_TALL}, bricks, regular grid, rows, paving, tiles, flowers, mushrooms, snow, identical stones, wall, border, frame, lawn, large rock`,
    seed: 48716,
    size: 160,
    notes: "A second exemplar for the quilt.",
  },
  {
    id: "dwarf-moss-g",
    faction: "DWARF",
    label: "Moss-covered stones at 160 px: river pebbles packed tight",
    subject:
      "Subject: a close top-down view of a bed of smooth round grey river pebbles and stones of many different sizes packed tightly edge to edge over the whole image, like a pebble beach, with green moss filling every gap and growing as patches over the tops of about half of the stones; soft shading, lit from one side.",
    palette: MOSS,
    negative: `${NOTHING_TALL}, bricks, regular grid, rows, paving, tiles, flowers, mushrooms, snow, identical stones, wall, border, frame, lawn, garden, large rock, cliff`,
    seed: 48717,
    size: 160,
    notes:
      "dwarf-moss-e is a walled garden and dwarf-moss-f boulders beside a scree stream: scenes. A pebble beach, packed edge to edge.",
  },
  {
    id: "dwarf-moss-h",
    faction: "DWARF",
    label: "Moss-covered stones at 160 px: mossy scree",
    subject:
      "Subject: a close top-down view of rocky scree covering the whole image: grey angular stones and gravel of many different sizes lying against each other everywhere, with patches of green moss and lichen growing over many of them and in the gaps; no soil and no grass anywhere; soft shading, lit from one side.",
    palette: MOSS,
    negative: `${NOTHING_TALL}, bricks, regular grid, rows, paving, tiles, flowers, mushrooms, snow, identical stones, wall, border, frame, lawn, garden, large rock, cliff`,
    seed: 48718,
    size: 160,
    notes: "The same ground as angular scree.",
  },
  {
    id: "dwarf-stones-a",
    faction: "DWARF",
    label:
      "Mossy stones at 160 px: separate stones on moss, for the stone motifs",
    subject:
      "Subject: flat mossy ground seen from directly above, one even soft green moss colour, with about thirty separate grey stones spread evenly over the whole image, each of a different shape and size and none wider than a sixth of the image: round cobbles, flat slabs, angular rocks, small pebbles in twos and threes, every stone partly covered by a cap of green moss; the stones do not touch each other; soft shading, lit from one side.",
    palette: MOSS,
    negative: `${NOTHING_TALL}, bricks, regular grid, rows, paving, tiles, flowers, mushrooms, snow, identical stones, wall, border, frame, garden, large rock, cliff, stream, river, path`,
    seed: 48719,
    size: 160,
    notes:
      "Every field asked for a bed of stones came back a scene with a stream or a cliff. Separate stones on plain moss, to cut the stone motifs from and strew thickly.",
  },
  {
    id: "dwarf-stones-b",
    faction: "DWARF",
    label: "Mossy stones at 160 px: a second sheet",
    subject:
      "Subject: flat mossy ground seen from directly above, one even soft green moss colour, with about forty separate grey stones and pebbles of many different shapes and sizes spread evenly over the whole image, none wider than a seventh of the image, many of them half sunk in the moss with moss creeping over them; the stones do not touch each other; soft shading, lit from one side.",
    palette: MOSS,
    negative: `${NOTHING_TALL}, bricks, regular grid, rows, paving, tiles, flowers, mushrooms, snow, identical stones, wall, border, frame, garden, large rock, cliff, stream, river, path`,
    seed: 48720,
    size: 160,
    notes: "A second sheet of stone motifs, smaller and more.",
  },
  {
    id: "dwarf-cobbles-a",
    faction: "DWARF",
    label: "Mossy cobbles at 160 px: a cobblestone texture",
    subject:
      "Subject: a cobblestone ground texture seen from directly above, covering the entire image from edge to edge: irregular rounded grey cobblestones of many different sizes fitted closely together like an old cobbled yard, with green moss filling every joint between them and soft patches of moss over some of the stones; soft shading, lit from one side.",
    palette: MOSS,
    negative: `${NOTHING_TALL}, bricks, regular grid, rows, flowers, mushrooms, snow, identical stones, wall, border, frame, lawn, garden, large rock, cliff, stream, river, path, banks`,
    seed: 48731,
    size: 160,
    notes:
      "The user: 'moss covered stones'. A bed of stones came back a stream five times; 'cobblestone texture' is a thing Pixflux may know as a surface.",
  },
  {
    id: "dwarf-cobbles-b",
    faction: "DWARF",
    label: "Mossy cobbles at 160 px: a second texture",
    subject:
      "Subject: an old mossy cobblestone pavement texture seen from directly above, covering the entire image from edge to edge with no gaps: worn round-edged grey stones of different sizes set tightly side by side in an irregular pattern, thick green moss in the joints and growing over a third of the stones; soft shading, lit from one side.",
    palette: MOSS,
    negative: `${NOTHING_TALL}, bricks, regular grid, rows, flowers, mushrooms, snow, identical stones, wall, border, frame, lawn, garden, large rock, cliff, stream, river, path, banks`,
    seed: 48732,
    size: 160,
    notes: "A second cobble texture, other wording.",
  },
  {
    id: "cult-marsh-a",
    size: 160,
    faction: "CULT",
    label: "Marsh: peat hummocks, sedge and dark pools",
    subject:
      "Subject: a marsh seen from directly above, filling the whole image: wet olive peat and moss hummocks of uneven tones, many tufts of sedge and short reeds, and small dark teal pools and channels of still water winding between the hummocks, with duckweed at their edges; soft shading.",
    palette: MARSH,
    negative: `${NOTHING_TALL.replace("water, ", "").replace("grass, ", "").replace("plants, ", "")}, flowers, lily, frog, fish, purple, pink, bridge`,
    seed: 48721,
    notes:
      "The Cult bog as a full painted marsh, a preview of rolling the method out.",
  },
  {
    id: "cult-marsh-b",
    faction: "CULT",
    size: 160,
    label: "Marsh: hummocks, sedge and small pools only",
    subject:
      "Subject: a marsh seen from directly above, filling the whole image: wet olive peat and moss hummocks of uneven tones, many small tufts of sedge and short reeds, and many small separate dark teal pools of still water, none wider than a tenth of the image, with duckweed at their edges; no river and no channel; soft shading.",
    palette: MARSH,
    negative: `${NOTHING_TALL.replace("water, ", "").replace("grass, ", "").replace("plants, ", "")}, flowers, lily, frog, fish, purple, pink, bridge, stream, channel, tall reeds, bank, ledge`,
    seed: 48722,
    notes:
      "cult-marsh-a is a stream 60 px wide between banks with ledges: pools only, small.",
  },
  {
    id: "cult-peat-a",
    faction: "CULT",
    size: 160,
    label: "Peat bog: bare peat and low moss, sparse sedge",
    subject:
      "Subject: a peat bog seen from directly above, filling the whole image: wet olive peat and low moss in soft uneven patches of slightly lighter and darker olive, with only a few small low tufts of sedge far apart; no water, no pools, no stream; soft shading.",
    palette: MARSH,
    negative: `${NOTHING_TALL.replace("grass, ", "").replace("plants, ", "")}, flowers, lily, frog, fish, purple, pink, bridge, stream, channel, tall reeds, bank, ledge, pond`,
    seed: 48723,
    notes:
      "The calmer marsh: the ground alone, mostly peat, so the teal Horror, frog and willows stand off it. cult-marsh-b is sedge on every few pixels.",
  },
  {
    id: "cult-pools-a",
    faction: "CULT",
    size: 160,
    label: "Peat with separate small whole pools, for the pool motifs",
    subject:
      "Subject: flat wet olive peat seen from directly above, one even olive colour, with about twelve separate small round pools of dark teal still water spread evenly over the whole image, each of a different rounded shape and none wider than a tenth of the image, each with a thin paler rim and one tiny glint, and a small tuft of sedge beside a few of them; the pools do not touch each other and none touches the edge of the image; no stream.",
    palette: MARSH,
    negative: `${NOTHING_TALL.replace("water, ", "").replace("grass, ", "").replace("plants, ", "")}, flowers, lily, frog, fish, purple, pink, bridge, stream, channel, river, tall reeds, bank, ledge, big pond`,
    seed: 48724,
    notes:
      "Whole small pools to strew: a stream cannot be quilted without its banks, and came out as cut-off reaches.",
  },
  {
    id: "neutral-grass-a",
    faction: "NEUTRAL",
    size: 160,
    label: "Meadow: short grass with soft tone patches and small tufts",
    subject:
      "Subject: a meadow of short lawn grass seen from directly above, filling the whole image: one calm mid green with soft uneven patches of slightly lighter and slightly darker green, and many small grass tufts and short blades spread evenly over it; no flowers, no stones, no bare earth; very soft shading.",
    palette: GRASS,
    negative: `${NOTHING_TALL.replace("grass, ", "").replace("plants, ", "")}, flowers, clover, daisies, mushrooms, rocks, stones, soil, dirt, tall grass, hedge, yellow, brown`,
    seed: 48741,
    notes:
      "The default Grass as a painted meadow, in greens close to today's #8ab85c so the map does not shift.",
  },
  {
    id: "neutral-grass-b",
    faction: "NEUTRAL",
    size: 160,
    label: "Meadow: a second field, finer blades",
    subject:
      "Subject: a soft grassy lawn seen from directly above, filling the whole image: fine short grass in one calm mid green, with a gentle mottling of slightly lighter and darker green all over and small darker tufts here and there; no flowers, no stones, no bare earth; very soft shading.",
    palette: GRASS,
    negative: `${NOTHING_TALL.replace("grass, ", "").replace("plants, ", "")}, flowers, clover, daisies, mushrooms, rocks, stones, soil, dirt, tall grass, hedge, yellow, brown`,
    seed: 48742,
    notes: "A second exemplar for the quilt.",
  },
  {
    id: "undead-burnt-a",
    faction: "UNDEAD",
    size: 160,
    label: "Burnt ground: ash and charred earth, mottled",
    subject:
      "Subject: burnt ground after a wildfire seen from directly above, filling the whole image: warm grey ash and charred earth in soft uneven patches of lighter ash and darker soot, with fine charcoal specks and short burnt twigs lying flat all over it and a very few tiny glowing orange embers; nothing stands up; soft shading.",
    palette: ASH,
    negative: `${NOTHING_TALL}, flames, fire, smoke, green, skulls, bones, graves, stumps, logs, tree trunks, flowers`,
    seed: 48751,
    notes:
      "The Undead burnt ground as a painted surface: ash that is not one colour.",
  },
  {
    id: "goblin-savannah-t",
    faction: "GOBLIN",
    size: 160,
    label: "Savannah: dry grass with tone patches and fine blades",
    subject:
      "Subject: a dry savannah grassland seen from directly above, filling the whole image: pale golden straw-coloured dry grass with soft uneven patches of slightly lighter and darker straw, fine dry blades and small tufts all over it, and a few small bare patches of tan earth; no trees, no green; soft shading.",
    palette: STRAW,
    negative: `${NOTHING_TALL.replace("grass, ", "")}, acacia, flowers, bones, green, tall grass, rocks`,
    seed: 48761,
    notes: "The Goblin savannah as a painted surface.",
  },
  {
    id: "candy-frosting-t",
    faction: "CANDY",
    size: 160,
    label: "Frosting: mint icing spread with a knife, soft ridges",
    subject:
      "Subject: the top of a frosted cake seen from directly above, filling the whole image: thick pastel mint green frosting spread with a knife, with soft low swirls and ridges in slightly lighter and slightly darker mint all over it, and tiny white sugar crystals sprinkled on it; no sprinkles of other colours, no decorations; very soft shading.",
    palette: MINT,
    negative: `${NOTHING_TALL}, cake slice, plate, candles, cherries, fruit, cupcake, pink, yellow, chocolate`,
    seed: 48771,
    notes:
      "The Candy frosting as a surface with relief; the coloured sprinkles are strewn from the flat field.",
  },
  {
    id: "dinosaur-jungle-a",
    faction: "DINOSAUR",
    size: 160,
    label: "Jungle floor: low ferns, broad leaves and moss",
    subject:
      "Subject: a jungle floor seen from directly above, filling the whole image: deep green moss and low ground plants in soft uneven patches of lighter and darker green, with many small ferns and broad leaves lying flat all over it and a little olive leaf litter; nothing tall; soft shading.",
    palette: JUNGLE,
    negative: `${NOTHING_TALL.replace("grass, ", "").replace("plants, ", "")}, flowers, tree trunks, palm trees, vines, roots, pink, red, tall plants`,
    seed: 48781,
    notes: "The Dinosaur jungle floor as a painted surface.",
  },
  {
    id: "ice-folk-snow-a",
    faction: "ICE_FOLK",
    size: 160,
    label: "Snow: wind-packed snow with soft drifts",
    subject:
      "Subject: a snowfield seen from directly above, filling the whole image: white wind-packed snow with soft low drifts and ripples in very pale blue-grey shadow, a few small patches of glinting ice crystals; nothing else; very soft shading.",
    palette: SNOW,
    negative: `${NOTHING_TALL}, footprints, tracks, rocks, ice blocks, snowman, pine, dark shadows`,
    seed: 48791,
    notes: "The Ice Folk Snow as a painted surface, for a sample.",
  },
];

export function texturedPalettePath(candidate: TexturedCandidate): string {
  return `scripts/art/chibi/palettes/textured-${candidate.id}.png`;
}

export function texturedFieldPath(id: string): string {
  return `${TEXTURED_RUN}/raw/${id}.png`;
}

export function texturedSubjectKey(candidate: TexturedCandidate): string {
  return `TERRAIN:GRASS/${candidate.id.toUpperCase().replaceAll(/[^A-Z]/g, "_")}`;
}
