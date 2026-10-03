import { strict as assert } from "node:assert";
import {
  CURIOSITY_KINDS_V7,
  RULESET_7_ID,
  curiosityRandomStateV7,
  curiosityTargetCountV7,
  generateInitialMapV7,
  generateInitialMapWithVillageCountV7,
  villageCountV7,
  type CuriosityKindV7,
  type MapTypeV7,
  type MatchSetupV7,
} from "../src/engine/index";
import { checkCuriosityPlacementV7 } from "../tests/fixtures/v7-curiosity-checker";

// Map curiosities (`pulp_wars-737.2`,
// docs/product/RULESET_7_MAP_CURIOSITIES.md sections 4 and 13.1): for every
// generated map type, size, and AI count, seeds 0..SEEDS-1 (default 32):
// with the option off the map is exactly the `RIFTS` map (the generator
// before the curiosities); with it on every tile and every other generated
// fact is unchanged and each curiosity obeys section 4 (checked
// independently of the engine); the same setup gives the same curiosities.
// Prints the curiosity count per map type and size and the kind
// frequencies (the Rift table precedent).
const seeds = Number(
  process.argv.find((value) => value.startsWith("--seeds="))?.slice(8) ?? 32,
);
const mapTypes: readonly MapTypeV7[] = [
  "DRY_LAND",
  "PANGEA",
  "CONTINENTS",
  "ARCHIPELAGO",
  "LAKES",
];
const setups = [
  [11, 1],
  [14, 1],
  [14, 2],
  [16, 1],
  [16, 2],
  [16, 3],
  [20, 1],
  [20, 2],
  [20, 3],
  [25, 1],
  [25, 2],
  [25, 3],
] as const;
const counts: Record<string, [number, number, number]> = {};
const kinds: Record<string, Record<CuriosityKindV7, number>> = {};
const totals = Object.fromEntries(
  CURIOSITY_KINDS_V7.map((kind) => [kind, 0]),
) as Record<CuriosityKindV7, number>;
let cases = 0;
for (const mapType of mapTypes)
  for (const [width, aiCount] of setups)
    for (let seed = 0; seed < seeds; seed += 1) {
      const setup = (curiosities: boolean): MatchSetupV7 => ({
        rulesetId: RULESET_7_ID,
        seed,
        width,
        height: width,
        aiCount,
        aiDifficulty: "NORMAL",
        aiMode: "RIVAL",
        humanColor: "CORAL",
        factions: Array.from({ length: aiCount + 1 }, () => "ORIGINAL"),
        allowDuplicateFactions: true,
        mapType,
        mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
        curiosities,
      });
      const off = generateInitialMapV7(setup(false));
      const on = generateInitialMapV7(setup(true));
      const again = generateInitialMapV7(setup(true));
      const base = generateInitialMapWithVillageCountV7(
        setup(true),
        villageCountV7(setup(true)),
        "RIFTS",
      );
      const label = `${mapType}/${width}`;
      assert(off.ok && on.ok && again.ok && base.ok, `${label}/${seed}`);
      assert.deepEqual(off.map, base.map, `${label}/${seed}: off is RIFTS`);
      assert.deepEqual(again.map, on.map, `${label}/${seed}: deterministic`);
      const target = curiosityTargetCountV7(
        width,
        curiosityRandomStateV7(seed),
      ).count;
      const placed = checkCuriosityPlacementV7(
        on.map,
        base.map,
        mapType,
        target,
      );
      const tally = (counts[label] ??= [0, 0, 0]);
      tally[placed.length] = (tally[placed.length] ?? 0) + 1;
      const kindTally = (kinds[label] ??= Object.fromEntries(
        CURIOSITY_KINDS_V7.map((kind) => [kind, 0]),
      ) as Record<CuriosityKindV7, number>);
      for (const curiosity of placed) {
        kindTally[curiosity.kind] += 1;
        totals[curiosity.kind] += 1;
      }
      cases += 1;
    }
assert.equal(cases, mapTypes.length * setups.length * seeds);
// Pillar 2: no board has two of a kind (checked per map), and the targets
// of section 4.2 bound the counts: 11 and 14 at most 1, 25 at most 2.
for (const [label, tally] of Object.entries(counts)) {
  const width = Number(label.split("/")[1]);
  if (width <= 16) assert.equal(tally[2], 0, `${label} has two`);
}
console.log(
  JSON.stringify({
    rulesetId: RULESET_7_ID,
    seeds: `0..${seeds - 1}`,
    cases,
    counts,
    kinds,
    totals,
    status: "PASS",
  }),
);
