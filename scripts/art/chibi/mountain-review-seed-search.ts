/**
 * Composed-mountain review (beads pulp_wars-e9f and pulp_wars-6kn): picks
 * seeds for the mountain screenshots. For each seed it reports the densest
 * 12 x 8 window of Mountains and the Mountains within two cells of the
 * human capital, and lists the best of each.
 *
 *   npx tsx scripts/art/chibi/mountain-review-seed-search.ts [first] [last]
 */
import { humanCapitalV7, startStateV7 } from "./forest-review-scenes";

const first = Number(process.argv[2] ?? 1);
const last = Number(process.argv[3] ?? 150);
const rows: {
  seed: number;
  window: number;
  x: number;
  y: number;
  total: number;
  near: number;
}[] = [];
for (let seed = first; seed <= last; seed += 1) {
  let state;
  try {
    state = startStateV7(seed);
  } catch {
    continue;
  }
  const { width, height, tiles } = state.board;
  let best = { n: -1, x: 0, y: 0 };
  for (let y = 0; y + 8 <= height; y += 1)
    for (let x = 0; x + 12 <= width; x += 1) {
      let n = 0;
      for (let dy = 0; dy < 8; dy += 1)
        for (let dx = 0; dx < 12; dx += 1)
          if (tiles[(y + dy) * width + x + dx]?.terrain === "MOUNTAIN") n += 1;
      if (n > best.n) best = { n, x, y };
    }
  const capital = humanCapitalV7(state);
  rows.push({
    seed,
    window: best.n,
    x: best.x,
    y: best.y,
    total: tiles.filter((tile) => tile.terrain === "MOUNTAIN").length,
    near: tiles.filter(
      (tile) =>
        tile.terrain === "MOUNTAIN" &&
        Math.max(
          Math.abs(tile.at.x - capital.x),
          Math.abs(tile.at.y - capital.y),
        ) <= 2,
    ).length,
  });
}
const line = (row: (typeof rows)[number]): string =>
  `seed ${row.seed}: window ${row.x},${row.y} holds ${row.window}; ${row.total} on the map; ${row.near} near the capital`;
console.log("Densest 12 x 8 windows:");
for (const row of [...rows].sort((a, b) => b.window - a.window).slice(0, 5))
  console.log(`  ${line(row)}`);
console.log("Most Mountains near the capital:");
for (const row of [...rows].sort((a, b) => b.near - a.near).slice(0, 5))
  console.log(`  ${line(row)}`);
