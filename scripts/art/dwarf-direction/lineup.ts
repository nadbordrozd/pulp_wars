/**
 * The 32 px lineup of the Steampunk Dwarf look (bead pulp_wars-78i.5; spec
 * docs/product/RULESET_7_DWARVES.md section 16.4, root decision 8): before
 * any batch, the Hammerer beside the Undead casters (Necromancer, Lich,
 * Vampire), the Steam Tank beside the Goblin Scrap Buggy, the Steam Cannon
 * beside the Goblin Rocket Cart and the Gyrocopter beside the Martian
 * Saucer, in colour and in greyscale, at native size and at half size (a
 * 40 px tile, the sprites about 32 px tall), plus the four Dwarf units
 * beside the whole Goblin roster (copper and leather sit near the Goblin
 * leather). No base plates: the faction look alone must carry the owner.
 *
 *   npx tsx scripts/art/dwarf-direction/lineup.ts --recipes a,b,c,d --tag a
 *   npx tsx scripts/art/dwarf-direction/lineup.ts --masters
 *
 * `--recipes` takes the Hammerer, Gyrocopter, Steam Cannon and Steam Tank
 * recipes of batch `direction-dwarf` (candidate 0) and writes
 * `lineup-study-<tag>.{png,json}` and `lineup-study-<tag>-x3.png`; `--masters`
 * measures the accepted masters and writes `lineup-{1x,x3}.png` and
 * `lineup.json`. Everything goes to
 * art/pixellab/reviews/chibi-batch-direction-dwarf/.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import type { RgbaRaster } from "../chibi/owner-mask";
import { readRaster } from "../chibi/pipeline";
import type { Rgb } from "../ice-folk-direction/colour";
import {
  blank,
  blit,
  writeSheet,
  type Canvas,
  type Label,
} from "../ice-folk-direction/raster-tools";
import {
  type LineupThresholds,
  candidateOfRecipe,
  dwarfRecords,
  greyscale,
  measurePair,
  resampled,
  swatchText,
  swatches,
  type PairMeasure,
} from "./measure";

const ROOT = process.cwd();
export const DWARF_REVIEW_DIR = path.join(
  ROOT,
  "art/pixellab/reviews/chibi-batch-direction-dwarf",
);

export type LineupRole = "FIGHTER" | "RAIDER" | "CATAPULT" | "KNIGHT";

export const LINEUP_DWARF: readonly (readonly [LineupRole, string, string])[] =
  [
    ["FIGHTER", "Hammerer", "chibi-direction-dwarf-hammerer"],
    ["KNIGHT", "Steam Tank", "chibi-direction-dwarf-steam-tank"],
    ["CATAPULT", "Steam Cannon", "chibi-direction-dwarf-steam-cannon"],
    ["RAIDER", "Gyrocopter", "chibi-direction-dwarf-gyrocopter"],
  ];

/** The pairs the spec names, by Dwarf role: label and unit master id. */
export const LINEUP_RIVALS: Readonly<
  Record<LineupRole, readonly (readonly [string, string])[]>
> = {
  FIGHTER: [
    ["Necromancer", "chibi-direction-undead-necromancer"],
    ["Lich", "chibi-direction-undead-lich"],
    ["Vampire", "chibi-direction-undead-vampire"],
  ],
  KNIGHT: [["Scrap Buggy", "chibi-direction-goblin-scrap-buggy"]],
  CATAPULT: [["Rocket Cart", "chibi-direction-goblin-rocket-cart"]],
  RAIDER: [["Saucer", "chibi-direction-martian-saucer"]],
};

export const GOBLIN_ROSTER: readonly (readonly [string, string])[] = [
  ["Goblin", "chibi-direction-goblin-goblin"],
  ["Wolf Rider", "chibi-direction-goblin-wolf-rider"],
  ["Bomb Chucker", "chibi-direction-goblin-bomb-chucker"],
  ["Orc Brute", "chibi-direction-goblin-orc-brute"],
  ["Orc Warboss", "chibi-direction-goblin-orc-warboss"],
  ["Rocket Cart", "chibi-direction-goblin-rocket-cart"],
  ["Scrap Buggy", "chibi-direction-goblin-scrap-buggy"],
  ["Troll", "chibi-direction-goblin-troll"],
];

export const unitMaster = (id: string): string =>
  path.join(ROOT, "public/assets/chibi/units", `${id}.png`);

/** The six accepted factions' unit masters, by role (Human first). */
export const FACTION_ROSTERS: Readonly<Record<string, readonly string[]>> = {
  FIGHTER: [
    "fighter",
    "undead-skeleton",
    "goblin-goblin",
    "dinosaur-caveman",
    "martian-grunt",
    "ice-folk-yeti",
  ],
  RAIDER: [
    "raider",
    "undead-ghoul",
    "goblin-wolf-rider",
    "dinosaur-raptor",
    "martian-saucer",
    "ice-folk-sled",
  ],
  MARKSMAN: [
    "marksman",
    "undead-banshee",
    "goblin-bomb-chucker",
    "dinosaur-spitter",
    "martian-ray-gunner",
    "ice-folk-snow-hunter",
  ],
  GUARD: [
    "guard",
    "undead-zombie",
    "goblin-orc-brute",
    "dinosaur-ankylosaurus",
    "martian-shield-projector",
    "ice-folk-mammoth",
  ],
  CAPTAIN: [
    "captain",
    "undead-necromancer",
    "goblin-orc-warboss",
    "dinosaur-shaman",
    "martian-brain",
    "ice-folk-ice-witch",
  ],
  CATAPULT: [
    "catapult",
    "undead-lich",
    "goblin-rocket-cart",
    "dinosaur-triceratops",
    "martian-tripod",
    "ice-folk-boulder-yeti",
  ],
  KNIGHT: [
    "knight",
    "undead-vampire",
    "goblin-scrap-buggy",
    "dinosaur-t-rex",
    "martian-mothership",
    "ice-folk-sabretooth",
  ],
  JUGGERNAUT: [
    "juggernaut",
    "undead-abomination",
    "goblin-troll",
    "dinosaur-brontosaurus",
    "martian-colossus",
    "ice-folk-frost-giant",
  ],
};

const quantile = (values: readonly number[], share: number): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(share * (sorted.length - 1))] ?? 0;
};

/**
 * The lineup's thresholds, calibrated on the accepted factions: every pair
 * of two of the six factions' units of one role (8 roles x 15 pairs). A
 * Dwarf pair must be at least as far apart as three quarters of those
 * pairs: palette distance and its worse colour-vision simulation at least
 * their lower quartiles; lightness distance at least its lower quartile, or
 * a silhouette overlap at most its upper quartile.
 */
export async function calibratedThresholds(): Promise<{
  readonly thresholds: LineupThresholds;
  readonly pairs: number;
}> {
  const relaxed: LineupThresholds = {
    palette: 0,
    simulated: 0,
    lightness: 0,
    silhouette: 1,
  };
  const measures: PairMeasure[] = [];
  for (const ids of Object.values(FACTION_ROSTERS)) {
    const rasters = await Promise.all(
      ids.map((id) => readRaster(unitMaster(`chibi-direction-${id}`))),
    );
    for (let i = 0; i < rasters.length; i += 1)
      for (let j = i + 1; j < rasters.length; j += 1) {
        const a = rasters[i];
        const b = rasters[j];
        if (a !== undefined && b !== undefined)
          measures.push(measurePair(a, b, relaxed));
      }
  }
  return {
    pairs: measures.length,
    thresholds: {
      palette: quantile(
        measures.map((m) => m.palette),
        0.25,
      ),
      simulated: quantile(
        measures.map((m) => Math.min(m.deuteranopia, m.protanopia)),
        0.25,
      ),
      lightness: quantile(
        measures.map((m) => m.lightness),
        0.25,
      ),
      silhouette: quantile(
        measures.map((m) => m.silhouette),
        0.75,
      ),
    },
  };
}

const PAPER: Rgb = [30, 33, 40];
const GAP = 6;

function tiledGround(tile: RgbaRaster, width: number, height: number): Canvas {
  const canvas = blank(width, height, [0, 0, 0]);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const s = ((y % tile.height) * tile.width + (x % tile.width)) * 4;
      canvas.data.set(tile.data.subarray(s, s + 4), (y * width + x) * 4);
    }
  return canvas;
}

interface Row {
  readonly title: string;
  readonly sprites: readonly (readonly [string, RgbaRaster])[];
}

/**
 * One row per comparison; four blocks per row: native colour, native
 * greyscale, half colour, half greyscale. Each sprite stands bottom-centred
 * in a cell of Grass, with no plate. `scale` enlarges the whole sheet.
 */
async function lineupSheet(
  file: string,
  rows: readonly Row[],
  scale: number,
): Promise<void> {
  const grass = await readRaster(
    path.join(ROOT, "public/assets/chibi/terrain/chibi-grass-1.png"),
  );
  const cellW = 92;
  const cellH = 108;
  const most = Math.max(...rows.map((row) => row.sprites.length));
  const blockW = most * cellW + GAP;
  const labelW = 150;
  const header = 24;
  const blocks = [
    ["native, colour", 1, false],
    ["native, greyscale", 1, true],
    ["half (32 px), colour", 0.5, false],
    ["half (32 px), greyscale", 0.5, true],
  ] as const;
  const width = (labelW + blocks.length * (blockW + GAP)) * scale;
  const height = (header + rows.length * (cellH + GAP)) * scale;
  const out = blank(width, height, PAPER);
  const labels: Label[] = blocks.map(([text], index) => ({
    text,
    left: (labelW + index * (blockW + GAP)) * scale,
    top: 4,
    size: 12 + scale * 2,
  }));
  for (const [rowIndex, row] of rows.entries()) {
    const top = (header + rowIndex * (cellH + GAP)) * scale;
    labels.push({
      text: row.title,
      left: 6,
      top: top + 8,
      size: 11 + scale * 2,
    });
    for (const [blockIndex, [, factor, grey]] of blocks.entries())
      for (const [index, [, sprite]] of row.sprites.entries()) {
        const left =
          (labelW + blockIndex * (blockW + GAP) + index * cellW) * scale;
        const cw = factor === 1 ? cellW : cellW / 2;
        const ch = factor === 1 ? cellH : cellH / 2;
        const ground = tiledGround(
          factor === 1 ? grass : await resampled(grass, 0.5),
          cw * scale,
          ch * scale,
        );
        const shown = factor === 1 ? sprite : await resampled(sprite, factor);
        const finalSprite = grey ? greyscale(shown) : shown;
        const groundCanvas = grey ? greyscale(ground) : ground;
        blit(out, groundCanvas, left, top + (cellH - ch) * scale);
        blit(
          out,
          finalSprite,
          left + ((cw - finalSprite.width) / 2) * scale,
          top + (cellH - finalSprite.height) * scale,
          scale,
        );
      }
  }
  await writeSheet(file, out, labels);
  console.log(`wrote ${path.relative(ROOT, file)}`);
}

export interface LineupResult {
  readonly thresholds: LineupThresholds;
  readonly calibrationPairs: number;
  readonly pairs: readonly {
    readonly dwarf: string;
    readonly rival: string;
    readonly measure: PairMeasure;
  }[];
  readonly goblinRoster: Readonly<
    Record<string, Readonly<Record<string, PairMeasure>>>
  >;
  /** Failing pairs of 32 (four roles x eight Goblins), per faction. */
  readonly goblinRosterFailures: Readonly<Record<string, number>>;
  readonly dwarfColours: Readonly<Record<string, readonly string[]>>;
  /** The verdict on the pairs the spec names. */
  readonly verdict: "PASS" | "FAIL";
  readonly failing: readonly string[];
}

/**
 * Measures and draws the lineup for the four given Dwarf sprites; writes
 * `<stem>.json`, `<stem>-1x.png` and `<stem>-x3.png` under `outDir`.
 */
export async function writeLineup(
  dwarf: Readonly<Record<LineupRole, RgbaRaster>>,
  outDir: string,
  stem: string,
  note: string,
): Promise<LineupResult> {
  await mkdir(outDir, { recursive: true });
  const { thresholds, pairs: calibrationPairs } = await calibratedThresholds();
  const rows: Row[] = [];
  const pairs: LineupResult["pairs"][number][] = [];
  for (const [role, label] of LINEUP_DWARF) {
    const mine = dwarf[role];
    const rivals = await Promise.all(
      (LINEUP_RIVALS[role] ?? []).map(
        async ([name, id]) => [name, await readRaster(unitMaster(id))] as const,
      ),
    );
    rows.push({
      title: `${label} vs ${rivals.map(([name]) => name).join(", ")}`,
      sprites: [[label, mine], ...rivals],
    });
    for (const [name, sprite] of rivals)
      pairs.push({
        dwarf: label,
        rival: name,
        measure: measurePair(mine, sprite, thresholds),
      });
  }
  const goblins = await Promise.all(
    GOBLIN_ROSTER.map(
      async ([name, id]) => [name, await readRaster(unitMaster(id))] as const,
    ),
  );
  rows.push({ title: "Goblin roster", sprites: goblins.slice(0, 4) });
  rows.push({ title: "Goblin roster", sprites: goblins.slice(4) });
  rows.push({
    title: "Dwarf lineup",
    sprites: LINEUP_DWARF.map(([role, label]) => [label, dwarf[role]] as const),
  });
  const goblinRoster: Record<string, Record<string, PairMeasure>> = {};
  for (const [role, label] of LINEUP_DWARF) {
    goblinRoster[label] = {};
    for (const [name, sprite] of goblins)
      (goblinRoster[label] ?? {})[name] = measurePair(
        dwarf[role],
        sprite,
        thresholds,
      );
  }
  const failing = pairs
    .filter((pair) => !pair.measure.distinct)
    .map(
      (pair) =>
        `${pair.dwarf} / ${pair.rival}: ${pair.measure.reasons.join(", ")}`,
    );
  // The Goblin roster is a context measure: the same four roles of every
  // accepted faction against the eight Goblins, so the Dwarf count reads
  // against what the game already accepts.
  const goblinRosterFailures: Record<string, number> = {
    Dwarf: Object.values(goblinRoster).reduce(
      (sum, measures) =>
        sum + Object.values(measures).filter((m) => !m.distinct).length,
      0,
    ),
  };
  const factionNames = [
    "Human",
    "Undead",
    "Goblin",
    "Dinosaur",
    "Martian",
    "Ice Folk",
  ];
  for (const [index, name] of factionNames.entries()) {
    if (name === "Goblin") continue;
    let failures = 0;
    for (const [role] of LINEUP_DWARF) {
      const id = FACTION_ROSTERS[role]?.[index];
      if (id === undefined) continue;
      const sprite = await readRaster(unitMaster(`chibi-direction-${id}`));
      for (const [, goblin] of goblins)
        if (!measurePair(sprite, goblin, thresholds).distinct) failures += 1;
    }
    goblinRosterFailures[name] = failures;
  }
  const result: LineupResult = {
    thresholds,
    calibrationPairs,
    pairs,
    goblinRoster,
    goblinRosterFailures,
    dwarfColours: Object.fromEntries(
      LINEUP_DWARF.map(([role, label]) => [
        label,
        swatches(dwarf[role]).swatches.slice(0, 8).map(swatchText),
      ]),
    ),
    verdict: failing.length === 0 ? "PASS" : "FAIL",
    failing,
  };
  await writeFile(
    path.join(outDir, `${stem}.json`),
    `${JSON.stringify({ bead: "pulp_wars-78i.5", note, ...result }, null, 2)}\n`,
  );
  console.log(`wrote ${stem}.json: ${result.verdict}`);
  await lineupSheet(path.join(outDir, `${stem}-1x.png`), rows, 1);
  await lineupSheet(path.join(outDir, `${stem}-x3.png`), rows, 3);
  return result;
}

export async function masterLineupSprites(): Promise<
  Record<LineupRole, RgbaRaster>
> {
  const entries = await Promise.all(
    LINEUP_DWARF.map(
      async ([role, , id]) => [role, await readRaster(unitMaster(id))] as const,
    ),
  );
  return Object.fromEntries(entries) as Record<LineupRole, RgbaRaster>;
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function main(): Promise<void> {
  if (process.argv.includes("--masters")) {
    await writeLineup(
      await masterLineupSprites(),
      DWARF_REVIEW_DIR,
      "lineup",
      "The accepted masters.",
    );
    return;
  }
  const recipes = (option("--recipes") ?? "").split(",");
  if (recipes.length !== 4)
    throw new Error(
      "--recipes takes four recipes: Hammerer, Gyrocopter, Steam Cannon, Steam Tank",
    );
  const records = await dwarfRecords(ROOT);
  const [fighter, raider, catapult, knight] = await Promise.all(
    recipes.map((recipe) => {
      const [id = "", candidate = "0"] = recipe.split(":");
      return candidateOfRecipe(ROOT, records, id, Number(candidate));
    }),
  );
  if (!fighter || !raider || !catapult || !knight)
    throw new Error("missing sprite");
  const tag = option("--tag") ?? "a";
  await writeLineup(
    { FIGHTER: fighter, RAIDER: raider, CATAPULT: catapult, KNIGHT: knight },
    DWARF_REVIEW_DIR,
    `lineup-study-${tag}`,
    `Study recipes ${recipes.join(", ")} (candidate 0 unless given).`,
  );
}

if (process.argv[1]?.endsWith("lineup.ts"))
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "lineup failed");
    process.exitCode = 1;
  });
