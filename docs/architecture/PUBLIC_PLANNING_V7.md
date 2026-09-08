# Ruleset 7 Public Planning Work

Ruleset 7 command enumeration, economy previews, economic potentials, and
spatial scores remain pure functions of `PlayerViewV7`. The synchronous APIs
remain canonical. `createPublicPlanningWorkV7` is the responsive equivalent for
callers that need all economic potentials and many spatial scores on a mature
view.

## Why the incremental API exists

The retained seed-0 Rival-3 command-1100 public view has a 16 by 16 board, 9
public cities, 23 visible units, 93 explored Roads, and 199 ordered commands.
Before the shared movement context was introduced, root and worker cold command
measurements took roughly 604–1,850 ms. Reusing exact public Road connectivity
and movement indexes reduces that same cold enumeration to about 16–21 ms on
the development machine while preserving its canonical command hash.

The 16–21 ms synchronous command query is still above the Ruleset 7 policy's
8 ms event-loop threshold. `createPublicCommandWorkV7` therefore enumerates one
tile, city, or unit per operation and primes `queryPlayerCommandsV7` with the
same sorted command array when complete. No retained unit's complete movement
enumeration exceeded 3 ms in the worker diagnostic.

Spatial planning is a two-step calculation: for every candidate it enumerates
every known legal next placement, scores those placements, and reserves the
best target for each city in city-ID order. Exact synchronous evaluation of all
199 retained commands still takes roughly 0.9–1.4 seconds, and an individual
first call can take 40–100 ms. It is therefore exposed as deterministic
incremental work instead of being truncated or made approximate.

Run the retained engine-only benchmark with:

```text
npx tsx scripts/benchmark-ruleset-v7-public-query.ts
```

The command verifies the fixture, command, AI-ready, potential, and spatial
score hashes before printing timings. Timings are diagnostic because machine
load and garbage collection vary.

## Scheduler integration

The Ruleset 7 Normal-policy scheduler should persist two phases for the same
exact view. Each work object is created once, outside the resumable callback:

```ts
const commandWork = createPublicCommandWorkV7(view);
let planningWork: PublicPlanningWorkV7 | null = null;

function advancePolicyWork() {
  if (planningWork === null) {
    const commandProgress = commandWork.advance(1);
    if (!commandProgress.done || commandProgress.commands === null)
      return { kind: "YIELD" } as const;
    planningWork = createPublicPlanningWorkV7(view, commandProgress.commands);
  }

  const planningProgress = planningWork.advance(1);
  if (!planningProgress.done || planningProgress.result === null)
    return { kind: "YIELD" } as const;

  return { kind: "DONE", ...planningProgress.result } as const;
}
```

After command work finishes, `queryAiReadyCommandsV7(view)` uses the primed
command cache and only adds public tie-break tuples; it does not repeat
enumeration.

`advance(maxOperations)` accepts a positive safe integer. One operation handles
at most one board tile, candidate transition, or placement evaluation. The
budget affects only pause boundaries, never ordering, scores, command content,
or PRNG. On the retained view, budget 1 required 25,078 operations and measured
a maximum call of about 5.1 ms in the worker run. Operation count is not a
universal wall-clock guarantee, so browser integration should begin with budget
1, measure its own host, and yield between calls. Final worker benchmark runs
measured 6.5–7.5 ms maximum `advance(1)` calls and about 1.3 seconds total drain.

Do not call synchronous `queryPublicEconomicPotentialsV7` or
`scorePublicSpatialPlanV7` while the work is incomplete; doing so performs the
same exact calculation synchronously. A completed work object primes those
synchronous view-identity caches with byte-identical results for downstream
consumers.

The work object owns its mutable progress. Engine caches use `WeakMap` keys for
the exact immutable `PlayerViewV7` or economy-graph object, so their lifetime is
bounded by that input. When a command produces a new view, discard unfinished
work and create new work from the new view; do not reuse work or results across
view identities.
