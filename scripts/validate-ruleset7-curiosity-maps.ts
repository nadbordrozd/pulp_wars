import { strict as assert } from "node:assert";
import {
  CURIOSITY_PLACEMENT_KINDS_V7,
  RULESET_7_ID,
  curiosityRandomStateV7,
  curiosityTargetCountV7,
  generateInitialMapV7,
  generateInitialMapWithVillageCountV7,
  villageCountV7,
  type CuriosityPlacementKindV7,
  type FactionIdV7,
  type MapTypeV7,
  type MatchSetupV7,
} from "../src/engine/index";
import { checkCuriosityPlacementV7 } from "../tests/fixtures/v7-curiosity-checker";

// Map curiosities (`pulp_wars-737.2` and `pulp_wars-737.3`, the Monster;
// round 2 `pulp_wars-737.14`, docs/product/RULESET_7_MAP_CURIOSITIES.md
// sections 4, 13.1, and 24.5): for every generated map type, size, and AI
// count, seeds 0..SEEDS-1 (default 32), and two faction mixes (one with no
// Martian or Undead seat, one with both): with the option off the map is
// exactly the `RIFTS` map (the generator before the curiosities); with it
// on every tile and every other generated fact is unchanged and each
// curiosity obeys sections 4 and 24 (checked independently of the engine:
// no Downed Saucer with a Martian seat, no Graveyard with an Undead seat,
// no gates or Bigfoot below width 20, never two dangers); the same setup
// gives the same curiosities. Prints the curiosity count per map type, size,
// and mix and the kind frequencies (the Rift table precedent).
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
/**
 * Section 24.5: the faction mixes, by seat count. `PLAIN` has no Martian or
 * Undead seat (every kind is possible); `MARTIAN_UNDEAD` has both (no camp).
 */
const MIXES: Readonly<
  Record<"PLAIN" | "MARTIAN_UNDEAD", Readonly<Record<number, FactionIdV7[]>>>
> = {
  PLAIN: {
    2: ["ORIGINAL", "GOBLIN"],
    3: ["ORIGINAL", "GOBLIN", "DINOSAUR"],
    4: ["ORIGINAL", "GOBLIN", "DINOSAUR", "ICE_FOLK"],
  },
  MARTIAN_UNDEAD: {
    2: ["MARTIAN", "UNDEAD"],
    3: ["MARTIAN", "UNDEAD", "ORIGINAL"],
    4: ["MARTIAN", "UNDEAD", "ORIGINAL", "DWARF"],
  },
};
const counts: Record<string, [number, number, number]> = {};
const kinds: Record<string, Record<CuriosityPlacementKindV7, number>> = {};
const totals = Object.fromEntries(
  CURIOSITY_PLACEMENT_KINDS_V7.map((kind) => [kind, 0]),
) as Record<CuriosityPlacementKindV7, number>;
let cases = 0;
for (const mix of ["PLAIN", "MARTIAN_UNDEAD"] as const)
  for (const mapType of mapTypes)
    for (const [width, aiCount] of setups)
      for (let seed = 0; seed < seeds; seed += 1) {
        const factions = MIXES[mix][aiCount + 1] as FactionIdV7[];
        const setup = (curiosities: boolean): MatchSetupV7 => ({
          rulesetId: RULESET_7_ID,
          seed,
          width,
          height: width,
          aiCount,
          aiDifficulty: "NORMAL",
          aiMode: "RIVAL",
          humanColor: "CORAL",
          factions,
          mapType,
          mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
          curiosities,
        });
        const off = generateInitialMapV7(setup(false));
        const on = generateInitialMapV7(setup(true));
        const again = generateInitialMapV7(setup(true));
        const base = generateInitialMapWithVillageCountV7(
          setup(true),
          villageCountV7(setup(true)),
          "CAPITAL_DOMAINS_RIFTS",
        );
        const label = `${mix}/${mapType}/${width}`;
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
          factions,
        );
        // The gate pair is one curiosity.
        const placedCount = new Set(placed.map((entry) => entry.kind)).size;
        const tally = (counts[label] ??= [0, 0, 0]);
        tally[placedCount] = (tally[placedCount] ?? 0) + 1;
        const kindTally = (kinds[label] ??= Object.fromEntries(
          CURIOSITY_PLACEMENT_KINDS_V7.map((kind) => [kind, 0]),
        ) as Record<CuriosityPlacementKindV7, number>);
        for (const kind of new Set(placed.map((entry) => entry.kind))) {
          kindTally[kind] += 1;
          totals[kind] += 1;
        }
        cases += 1;
      }
assert.equal(cases, 2 * mapTypes.length * setups.length * seeds);
// Pillar 2: no board has two of a kind (checked per map), and the targets
// of section 4.2 bound the counts: 11 and 14 at most 1, 25 at most 2.
for (const [label, tally] of Object.entries(counts)) {
  const width = Number(label.split("/")[2]);
  if (width <= 16) assert.equal(tally[2], 0, `${label} has two`);
}
// Sections 4.4 and 24.1: the Spider and the camps only on boards of width
// 16 and up, the gates and Bigfoot on 20 and up; no camp in the
// Martian-and-Undead mix (the checker also holds each exclusion per board).
for (const [label, kindTally] of Object.entries(kinds)) {
  const width = Number(label.split("/")[2]);
  if (width < 16)
    for (const kind of ["MONSTER", "DOWNED_SAUCER", "GRAVEYARD"] as const)
      assert.equal(kindTally[kind], 0, `${label} has a ${kind}`);
  if (width < 20)
    for (const kind of ["GATES", "BIGFOOT"] as const)
      assert.equal(kindTally[kind], 0, `${label} has ${kind}`);
  if (label.startsWith("MARTIAN_UNDEAD/"))
    for (const kind of ["DOWNED_SAUCER", "GRAVEYARD"] as const)
      assert.equal(kindTally[kind], 0, `${label} has a ${kind}`);
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
