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
export type TexturedFaction = "MARTIAN" | "DWARF" | "CULT";

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
