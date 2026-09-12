import {
  canonicalMapRandomHashV7,
  generateInitialMapV7,
  parseMatchSetupV7,
  type CoordV7,
  type TileStateV7,
} from "../src/engine/index";

const setups = [
  [11, 1],
  [14, 2],
  [16, 3],
  [20, 1],
  [20, 2],
  [20, 3],
  [25, 1],
  [25, 2],
  [25, 3],
] as const;
const failures: string[] = [];
const report: Record<string, unknown> = {};
const rate = (count: number, total: number) => (100 * count) / total;
const percentile = (values: readonly number[], p: number) =>
  [...values].sort((a, b) => a - b)[
    Math.max(0, Math.ceil(values.length * p) - 1)
  ] ?? 0;
const histogram = (values: readonly number[]) =>
  Object.fromEntries(
    [...new Set(values)]
      .sort((a, b) => a - b)
      .map((value) => [
        String(value),
        values.filter((item) => item === value).length,
      ]),
  );
const key = (at: CoordV7) => `${at.y},${at.x}`;
const family = (tile: TileStateV7) =>
  tile.resource === "FRUIT" || tile.resource === "FERTILE_GROUND"
    ? "A"
    : tile.terrain === "FOREST"
      ? "T"
      : tile.resource === "ORE"
        ? "M"
        : null;
const neighbors = (width: number, at: CoordV7, diagonal: boolean) => {
  const result: CoordV7[] = [];
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1)
      if ((dx !== 0 || dy !== 0) && (diagonal || dx === 0 || dy === 0)) {
        const next = { x: at.x + dx, y: at.y + dy };
        if (next.x >= 0 && next.y >= 0 && next.x < width && next.y < width)
          result.push(next);
      }
  return result;
};
const components = (
  tiles: readonly TileStateV7[],
  width: number,
  accepts: (tile: TileStateV7) => boolean,
  diagonal: boolean,
) => {
  const byKey = new Map(tiles.map((tile) => [key(tile.at), tile]));
  const unseen = new Set(tiles.filter(accepts).map((tile) => key(tile.at)));
  const sizes: number[] = [];
  while (unseen.size > 0) {
    const first = unseen.values().next().value as string;
    unseen.delete(first);
    const queue = [byKey.get(first) as TileStateV7];
    for (let index = 0; index < queue.length; index += 1)
      for (const at of neighbors(
        width,
        (queue[index] as TileStateV7).at,
        diagonal,
      ))
        if (unseen.delete(key(at)))
          queue.push(byKey.get(key(at)) as TileStateV7);
    sizes.push(queue.length);
  }
  return sizes;
};

for (const [width, aiCount] of setups) {
  const counts = {
    tiles: 0,
    mountain: 0,
    forest: 0,
    fertile: 0,
    ore: 0,
    rings: 0,
    three: 0,
    twoFour: 0,
    highland: 0,
    highlandOre: 0,
    highlandOreTotal: 0,
    highlandMountainTotal: 0,
    highlandTwoFour: 0,
    fertileAccess: 0,
    forestAccess: 0,
    oreAccess: 0,
    farmSupports: 0,
    campSupports: 0,
    mineSupports: 0,
  };
  const attempts: number[] = [];
  const regionSizes: number[] = [];
  const mountainComponents: number[] = [];
  const capitalHistogram = [0, 0, 0, 0];
  const villageHistogram = [0, 0, 0, 0];
  const capitalScores: number[] = [];
  const capitalScoreRanges: number[] = [];
  const attemptFailureCauses: Record<string, number> = {};
  let fixedSeedHash = "";
  const legalSites = {
    windmill: 0,
    sawmill: 0,
    forge: 0,
    workshop: 0,
    grandWorks: 0,
  };
  const setup = (seed: number, mode: "RIVAL" | "COOPERATIVE") => ({
    rulesetId: "pulp-wars-poc-7r4" as const,
    seed,
    width,
    height: width,
    aiCount,
    aiDifficulty: "NORMAL" as const,
    aiMode: mode,
    humanColor: "CORAL" as const,
    factions: Array.from({ length: aiCount + 1 }, () => "ORIGINAL" as const),
    mapGenerationRevision: "REGIONAL_BIOMES_V1" as const,
  });
  for (let seed = 0; seed < 1000; seed += 1) {
    // Both modes must parse; map inputs are otherwise identical, so only Rival is generated.
    const cooperative = setup(seed, "COOPERATIVE");
    if (parseMatchSetupV7(cooperative)?.aiMode !== "COOPERATIVE")
      failures.push(`${width}/${aiCount}/${seed}: cooperative parse`);
    if (parseMatchSetupV7(setup(seed, "RIVAL"))?.aiMode !== "RIVAL")
      failures.push(`${width}/${aiCount}/${seed}: rival parse`);
    const first = generateInitialMapV7(setup(seed, "RIVAL"));
    const duplicate = generateInitialMapV7(setup(seed, "RIVAL"));
    if (!first.ok || !duplicate.ok) {
      failures.push(`${width}/${aiCount}/${seed}: generation failure`);
      continue;
    }
    if (
      canonicalMapRandomHashV7(first.map) !==
        canonicalMapRandomHashV7(duplicate.map) ||
      JSON.stringify(first.map) !== JSON.stringify(duplicate.map)
    )
      failures.push(`${width}/${aiCount}/${seed}: nondeterministic duplicate`);
    attempts.push(first.map.attempt);
    if (seed === 0) fixedSeedHash = canonicalMapRandomHashV7(first.map);
    for (const attempt of first.map.attempts)
      for (const cause of attempt.failures)
        attemptFailureCauses[cause] = (attemptFailureCauses[cause] ?? 0) + 1;
    const tiles = first.map.board.tiles;
    counts.tiles += tiles.length;
    counts.mountain += tiles.filter(
      (tile) => tile.terrain === "MOUNTAIN",
    ).length;
    counts.forest += tiles.filter((tile) => tile.terrain === "FOREST").length;
    counts.fertile += tiles.filter(
      (tile) => tile.resource === "FERTILE_GROUND",
    ).length;
    counts.ore += tiles.filter((tile) => tile.resource === "ORE").length;
    regionSizes.push(...first.map.regionSizes);
    mountainComponents.push(
      ...components(tiles, width, (tile) => tile.terrain === "MOUNTAIN", true),
    );
    const scores: number[] = [];
    for (const settlement of tiles.filter(
      (tile) => tile.site === "CAPITAL" || tile.site === "VILLAGE",
    )) {
      counts.rings += 1;
      const ring = neighbors(width, settlement.at, true).map(
        (at) => tiles[at.y * width + at.x] as TileStateV7,
      );
      const mountains = ring.filter(
        (tile) => tile.terrain === "MOUNTAIN",
      ).length;
      const families = new Set(ring.map(family).filter(Boolean));
      const fertile = ring.filter(
        (tile) => tile.resource === "FERTILE_GROUND",
      ).length;
      const forest = ring.filter((tile) => tile.terrain === "FOREST").length;
      const ore = ring.filter((tile) => tile.resource === "ORE").length;
      counts.fertileAccess += Number(fertile > 0);
      counts.forestAccess += Number(forest > 0);
      counts.oreAccess += Number(ore > 0);
      counts.farmSupports += fertile;
      counts.campSupports += forest;
      counts.mineSupports += ore;
      if (
        families.size < 2 ||
        ring.filter((tile) => family(tile) !== null).length < 3
      )
        failures.push(`${width}/${aiCount}/${seed}: settlement floor`);
      if (families.size === 3) counts.three += 1;
      if (mountains >= 2 && mountains <= 4) counts.twoFour += 1;
      const histogram =
        settlement.site === "CAPITAL" ? capitalHistogram : villageHistogram;
      histogram[
        mountains === 0 ? 0 : mountains === 1 ? 1 : mountains <= 4 ? 2 : 3
      ] =
        (histogram[
          mountains === 0 ? 0 : mountains === 1 ? 1 : mountains <= 4 ? 2 : 3
        ] ?? 0) + 1;
      if (settlement.biome === "HIGHLANDS") {
        counts.highland += 1;
        counts.highlandOre += Number(ore > 0);
        counts.highlandOreTotal += ore;
        counts.highlandMountainTotal += mountains;
        counts.highlandTwoFour += Number(mountains >= 2 && mountains <= 4);
      }
      if (settlement.site === "CAPITAL") {
        const score = ring.reduce(
          (total, tile) =>
            total +
            (tile.resource === "FRUIT"
              ? 1
              : tile.resource === "FERTILE_GROUND"
                ? 2
                : tile.terrain === "FOREST"
                  ? 2 + Number(tile.resource === "GAME")
                  : tile.resource === "ORE"
                    ? 2
                    : 0),
          0,
        );
        scores.push(score);
        capitalScores.push(score);
      }
      const emptySites = ring.filter(
        (tile) => tile.site === null && tile.resource === null,
      );
      const basic = (tile: TileStateV7) =>
        tile.resource === "FERTILE_GROUND"
          ? "FARM"
          : tile.terrain === "FOREST"
            ? "CAMP"
            : tile.resource === "ORE"
              ? "MINE"
              : null;
      const processorTypes = new Map<string, ReadonlySet<string>>();
      for (const site of emptySites) {
        const adjacent = neighbors(width, site.at, true).map(
          (at) => tiles[at.y * width + at.x] as TileStateV7,
        );
        const orthogonal = neighbors(width, site.at, false).map(
          (at) => tiles[at.y * width + at.x] as TileStateV7,
        );
        const types = new Set(adjacent.map(basic).filter(Boolean));
        const processors = new Set<string>();
        if (orthogonal.some((tile) => basic(tile) === "FARM")) {
          legalSites.windmill += 1;
          processors.add("WINDMILL");
        }
        if (orthogonal.some((tile) => basic(tile) === "CAMP")) {
          legalSites.sawmill += 1;
          processors.add("SAWMILL");
        }
        if (types.has("MINE")) {
          legalSites.forge += 1;
          processors.add("FORGE");
        }
        legalSites.workshop += Number(types.size >= 1);
        processorTypes.set(key(site.at), processors);
      }
      for (const site of emptySites) {
        const adjacentTypes = new Set(
          neighbors(width, site.at, true).flatMap((at) => [
            ...(processorTypes.get(key(at)) ?? []),
          ]),
        );
        legalSites.grandWorks += Number(adjacentTypes.size >= 2);
      }
    }
    capitalScoreRanges.push(Math.max(...scores) - Math.min(...scores));
  }
  const id = `${width}/${aiCount}`;
  const metrics = {
    maps: attempts.length,
    attempts: { p99: percentile(attempts, 0.99), max: Math.max(...attempts) },
    rates: {
      mountain: rate(counts.mountain, counts.tiles),
      forest: rate(counts.forest, counts.tiles),
      fertile: rate(counts.fertile, counts.tiles),
      ore: rate(counts.ore, counts.tiles),
      threeFamily: rate(counts.three, counts.rings),
      ringTwoFourMountain: rate(counts.twoFour, counts.rings),
    },
    highlands: {
      access: rate(counts.highlandOre, counts.highland),
      meanOre: counts.highlandOreTotal / counts.highland,
      meanMountain: counts.highlandMountainTotal / counts.highland,
      twoFourMountain: rate(counts.highlandTwoFour, counts.highland),
    },
    capitalMountainHistogram: capitalHistogram,
    villageMountainHistogram: villageHistogram,
    access: {
      fertile: rate(counts.fertileAccess, counts.rings),
      forest: rate(counts.forestAccess, counts.rings),
      ore: rate(counts.oreAccess, counts.rings),
    },
    meanBasicSupports: {
      farm: counts.farmSupports / counts.rings,
      camp: counts.campSupports / counts.rings,
      mine: counts.mineSupports / counts.rings,
    },
    basicSupportCounts: {
      farm: counts.farmSupports,
      camp: counts.campSupports,
      mine: counts.mineSupports,
    },
    capitalFairness: {
      min: Math.min(...capitalScores),
      median: percentile(capitalScores, 0.5),
      max: Math.max(...capitalScores),
      maximumWithinMapRange: Math.max(...capitalScoreRanges),
      histogram: histogram(capitalScores),
    },
    legalProcessorSites: legalSites,
    geography: {
      regionP05: percentile(regionSizes, 0.05),
      regionSizeHistogram: histogram(regionSizes),
      mountainMean:
        mountainComponents.reduce((a, b) => a + b, 0) /
        mountainComponents.length,
      mountainP95: percentile(mountainComponents, 0.95),
      mountainComponentHistogram: histogram(mountainComponents),
    },
    attemptFailureCauses,
    fixedSeedHash,
  };
  report[id] = metrics;
  process.stderr.write(`validated ${id}: ${attempts.length} maps\n`);
  const between = (value: number, low: number, high: number, label: string) => {
    if (value < low || value > high) failures.push(`${id}: ${label} ${value}`);
  };
  if (metrics.attempts.p99 > 64 || metrics.attempts.max > 192)
    failures.push(`${id}: attempts`);
  if (
    metrics.capitalFairness.min < 6 ||
    metrics.capitalFairness.max > 17 ||
    metrics.capitalFairness.maximumWithinMapRange > 5
  )
    failures.push(`${id}: capital fairness`);
  between(metrics.rates.mountain, 14, 22, "mountain");
  between(metrics.rates.forest, 24, 33, "forest");
  between(metrics.rates.fertile, 8, 13, "fertile");
  between(metrics.rates.ore, 8, 14, "ore");
  between(metrics.rates.threeFamily, 20, 40, "three-family");
  between(metrics.rates.ringTwoFourMountain, 25, 45, "ring mountains");
  between(metrics.highlands.access, 100, 100, "highland access");
  between(metrics.highlands.meanOre, 2.2, 2.9, "highland ore");
  between(metrics.highlands.meanMountain, 2.8, 3.8, "highland mountains");
  between(metrics.highlands.twoFourMountain, 75, 95, "highland 2-4");
  if (
    metrics.geography.regionP05 < 16 ||
    metrics.geography.mountainMean < 3 ||
    metrics.geography.mountainP95 < 12
  )
    failures.push(`${id}: geography`);
}
console.log(
  JSON.stringify(
    {
      rulesetId: "pulp-wars-poc-7r4",
      seeds: "0..999",
      setups: report,
      failures,
    },
    null,
    2,
  ),
);
if (failures.length > 0)
  throw new Error(
    `Ruleset 7 biome validation failed (${failures.length}): ${failures.slice(0, 12).join("; ")}`,
  );
