/**
 * Composed-forest review (bead pulp_wars-maw.3): picks seeds for the
 * forest screenshots. For each seed it reports the Forest cells the human
 * seat sees at the start, the Forest in its capital's territory ring, and
 * the best 10 x 7 window of the map for "forest next to mountains".
 *
 *   npx tsx scripts/art/chibi/forest-review-seed-search.ts [first] [last]
 */
import { humanCapitalV7, startStateV7 } from "./forest-review-scenes";

const first = Number(process.argv[2] ?? 1);
const last = Number(process.argv[3] ?? 80);
const rows: string[] = [];
for (let seed = first; seed <= last; seed += 1) {
  let state;
  try {
    state = startStateV7(seed);
  } catch {
    continue;
  }
  const { width, height, tiles } = state.board;
  const at = (x: number, y: number) => tiles[y * width + x];
  const human = state.players.find((p) => p.id === state.humanPlayerId);
  const capital = humanCapitalV7(state);
  const explored = human?.explored ?? [];
  const startForest = explored.filter(
    (c) => at(c.x, c.y)?.terrain === "FOREST",
  ).length;
  let ring = 0;
  for (let dy = -2; dy <= 2; dy += 1)
    for (let dx = -2; dx <= 2; dx += 1)
      if (at(capital.x + dx, capital.y + dy)?.terrain === "FOREST") ring += 1;
  let best = { score: -1, x: 0, y: 0, f: 0, m: 0 };
  for (let y = 0; y + 7 <= height; y += 1)
    for (let x = 0; x + 10 <= width; x += 1) {
      let f = 0;
      let m = 0;
      for (let dy = 0; dy < 7; dy += 1)
        for (let dx = 0; dx < 10; dx += 1) {
          const terrain = at(x + dx, y + dy)?.terrain;
          if (terrain === "FOREST") f += 1;
          if (terrain === "MOUNTAIN") m += 1;
        }
      const score = Math.min(f, 2.5 * m);
      if (score > best.score) best = { score, x, y, f, m };
    }
  const total = tiles.filter((t) => t.terrain === "FOREST").length;
  rows.push(
    `seed ${seed}: capital ${capital.x},${capital.y} startExplored ${explored.length} startForest ${startForest} ring5x5 ${ring} totalForest ${total} bestMix window ${best.x},${best.y} forest ${best.f} mountain ${best.m}`,
  );
}
console.log(rows.join("\n"));
