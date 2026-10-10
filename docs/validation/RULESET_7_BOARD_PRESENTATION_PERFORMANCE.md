# Ruleset 7 board presentation performance

The reproducible probe is `scripts/benchmark-board-presentation-v7.ts`. Start
the application on a local Vite server, then run:

```bash
CHROME_PATH=/path/to/chrome-headless-shell node_modules/.bin/tsx scripts/benchmark-board-presentation-v7.ts
```

The script creates a unique directory under the system temporary directory and
prints its path. It writes `evidence.json`, natural-opening and synthetic
screenshots, and a fixed-time mixed-terrain board PNG. Use
`--url=http://localhost:PORT/?ruleset=7` to target an isolated checkout and
`--output=/absolute/new/directory` to choose an empty evidence directory.
Use `--dpr=2` to request desktop device-pixel ratio 2 through Chrome device
metrics; the default remains 1. The probe records and verifies actual DPR.
`--skip-graphics` is for comparison with revisions that do not contain the
glow cache; it omits the direct draw and pixel-comparison portions only. Chrome
uses an isolated temporary profile; the probe never touches the user's browser
profile or save. It writes no checked-in review evidence.

The natural opening uses seed 20. The busy fixture is built in Node by
`scripts/board-presentation-fixture-v7.ts` from a real engine match (seed 20,
25 × 25, Human against Undead): every cell is explored, non-site land is Grass,
and the Human has 60 ready Fighters. The derived state must pass the strict
state parser, and the view and offered commands are the engine's public
projection of it, so the fixture follows the public view shape. It is a
renderer stress fixture, not a playable match.
`tests/unit/board-presentation-benchmark-fixture-v7.test.ts` builds both
fixtures and draws each once, so `npm test` catches a broken fixture. The probe
exits non-zero when any check fails. Each motion setting has five warmup
clicks and 25 measured clicks with 300 ms between clicks. Measurements report
the Canvas pointer handler, host update, and time from handler start to the next
`requestAnimationFrame` callback. That last number is a scheduling proxy; it
does not measure completed paint. One natural Move separately reports dispatch
resolution and presentation start. Idle Full and Reduced motion record callback
work over two seconds. A direct Canvas test draws a mixed Forest/Mountain
version of the busy fixture 30 warmed times and compares cached and uncached
pixels at readiness time 800 ms.

On one Mac laptop with Chrome Headless Shell 153, two runs of the same probe
measured these p95 ranges against baseline commit `d78a801` and the optimized
worktree. These are diagnostic observations, not portable performance gates:

| Measurement                      | Baseline     | Optimized    |
| -------------------------------- | ------------ | ------------ |
| Busy Full pointer handler        | 33.1–39.2 ms | 3.4–4.6 ms   |
| Busy Full next-rAF proxy         | 55.9–61.5 ms | 19.9–21.5 ms |
| Busy Reduced pointer handler     | 27.7–29.6 ms | 2.9–3.6 ms   |
| Busy Reduced next-rAF proxy      | 36.8–37.7 ms | 16.9–17.1 ms |
| Busy Full idle rAF callback work | 13.7–15.5 ms | 1.5–2.9 ms   |

Natural Move presentation start varied from 20.9 to 66.9 ms in baseline runs
and from 23.9 to 24.0 ms in optimized runs. The accepted dispatch itself took
19.2–64.4 ms in baseline runs and 22.4–22.5 ms afterward, so that single-Move
sample does not establish a robust movement-start speedup. The structural
regression verifies that the accepted board is installed before surrounding
HUD work and that the intermediate notifications do not remount the board.

The optimized mixed-terrain direct draw p95 was 2.2–3.0 ms. Its fixed-time cached
and uncached images had zero differing pixels with all 60 ready units and 12
loaded art images. The 24 MiB glow-cache cap held 884,912 bytes after the
sample. Reduced motion scheduled no ambient callbacks in either revision.

The host reuses render plans for an unchanged public view, offered-command
array, and interaction. Ready units share destination-local glow rasters keyed
by accepted asset ID, exact source dimensions, device scale, color, blur, and
opacity. The cache keeps at most four recent exact phases per asset, color, and
backing size. It repaints an older same-size Canvas for a new phase, and evicts
the oldest entries when the 24 MiB global limit requires it. Every retained
Canvas counts toward that limit; resize, art load, and host destroy clear them
all. A conservative three-cell draw margin keeps tall sprites
and glow visible at viewport edges. The renderer continues its original
row-and-column draw order, boundary clipping, target outlines, and link
exclusions. It redraws the full visible board during readiness because the
measured direct draw and idle callback costs are below the architecture's
12 ms static redraw and 16.7 ms interactive frame budgets; static scene
rasterization would complicate sprite depth and invalidation without addressing
the measured bottleneck.

The structural regressions cover glow keying, byte limits and disposal,
selection draw coalescing, resize no-ops, stale command targets, and board-first
movement notification coalescing. Absolute timing varies with browser
scheduling, CPU load, and device-pixel ratio; inspect the probe's host and
browser metadata alongside the raw samples.

## Desktop DPR 2 diagnostic

On the Intel i5-7360U Mac with Chrome Headless Shell 153.0.8010.48, an
isolated `--dpr=2` run reported actual DPR 2 and a 2880 × 2000 Canvas backing
store at the 1440 × 1000 desktop viewport. With 25 measured interactions after
five warmups, the 60-ready-unit Full and Reduced pointer-handler p95 values
were 6.9 and 3.4 ms. Their next-rAF scheduling proxies were 38.8 and 41.9 ms
at p95. This proxy includes scheduling delay and does not measure paint or the
architecture's panning-frame budget. The mixed-terrain direct draw p95 was
2.5 ms, below the 12 ms static-redraw budget. Cached and uncached fixed-time
images had zero differing pixels; the glow cache held 3,461,064 bytes against
its 25,165,824-byte cap. Reduced motion scheduled zero ambient callbacks.
The single accepted Move resolved in 19.8 ms; one Move is diagnostic only.

## Continuous Full-motion glow diagnosis

The probe now supports `--no-glow-instrumentation` for timing runs without its
Canvas wrapper. Instrumented runs record glow calls, newly created offscreen
Canvases, their estimated RGBA backing bytes, and surfaces created and then
cleared within the same observation. The allocation window includes five
warmups and 25 timed clicks; p95 values use the 25 timed clicks. The disposal
count can undercount total
evictions because a surface from warmup may be evicted later. The raw 25-click
pointer, host-update, and next-rAF samples, host load, direct-draw samples, and
pixel comparisons are in
[RULESET_7_GLOW_CACHE_DIAGNOSTIC.json](./RULESET_7_GLOW_CACHE_DIAGNOSTIC.json).
The wrapper adds CPU work, so its timings are kept separate from the
uninstrumented comparison.

| Full-motion 30-click capture | New Canvases | Estimated RGBA bytes | Pointer p95 (25 timed) | Host update p95 |
| ---------------------------- | -----------: | -------------------: | ---------------------: | --------------: |
| DPR 2, prior exact cache     |          368 |              39.2 MB |                 4.1 ms |          2.5 ms |
| DPR 2, bounded phase history |           49 |               5.4 MB |                 3.5 ms |          2.2 ms |
| DPR 1, global-cap reuse only |          534 |              14.6 MB |                 3.6 ms |          2.2 ms |
| DPR 1, bounded phase history |            8 |              0.23 MB |                 3.1 ms |          1.9 ms |

The DPR 1 intermediate run showed why recycling only at the 24 MiB cap was
insufficient: the cache accumulated 534 new surfaces without reaching the cap.
Keeping four exact recent phases per asset/color/backing size preserves nearby
exact-key hits and same-frame sharing, while recycling older surfaces. It does
not round phase, alpha, blur, scale, or source dimensions. The final DPR 1 and
DPR 2 mixed-terrain comparisons had zero differing pixels at elapsed times 0,
167, 800, 1440, and 2879 ms. A separate cache limited to one glow surface
created one Canvas across 800–804 ms at each DPR, proving that repainting
occurred; all ten cached/direct comparisons had zero differing pixels and zero
channel delta. The final direct-draw p95 values were 2.3 ms at DPR 1 and
3.8 ms at DPR 2, still below the 12 ms static-redraw budget.

The separate DPR 2 uninstrumented runs measured Full pointer p95 5.6 ms before
and 3.1 ms after, with host-update p95 2.2 and 1.7 ms respectively. Their
one-minute host load averages at capture start were 2.89 and 3.45 on this
four-logical-CPU Mac. The earlier 39.2 ms pointer/37.1 ms host-update tail did
not recur in these 25-sample runs, so these observations establish the
allocation reduction and exact rendering, not a guaranteed tail-latency
improvement. The browser's coarse `performance.memory` readings did not expose
Canvas backing memory or isolate garbage-collection pauses; no GC-specific
causal claim is made.

## Byte-limit comparison (`pulp_wars-9s0.15`)

The probe once failed its forced-reuse check with about 260,000 differing
pixels at 800 and 801 ms and none at 802–804 ms. The glow cache was not the
cause. Chrome moves a Canvas to a different backing after it has been read
back with `getImageData` a few times, and the two backings blend a few
channels differently. The check compared a new Canvas with one that had
already been read back five times, so the first two comparisons differed with
or without a cache: two uncached draws compared the same way differ by the
same pixels. Every comparison in the probe is now between two Canvases of the
same age and read-back count.

The check's premise was also stale. Ready outlines are two phase-free layers
(halo and core) since `0d2f772`, so a cache limited to one frame's surfaces
only ever hits and never repaints. The probe now checks two things instead:

- **Limited board draws.** The mixed fixture is drawn at 800–804 ms under
  cache limits of 0 bytes, one byte below and exactly the smallest surface,
  one byte below and exactly the largest surface, one byte below one frame's
  surfaces, and exactly one frame. Below one frame the cache evicts and
  recreates surfaces every frame, or draws a layer without caching when it
  alone exceeds the limit. Every limit must match the uncached draw with zero
  differing pixels, and the cache must never hold more than its limit.
- **Forced reuse.** A cache limited to exactly one surface is asked for five
  outlined rasters of one sprite at one size. It may create two Canvases in
  all (the surface and the shared outline mask), so it repaints the surface
  four times; each result must be non-empty and match the uncached glow.

`tests/unit/glow-cache-limits-presentation-v7.test.ts` covers the same limits
without a browser, on a model of Canvas content: under every limit the cache
paints what the uncached path paints, holds no more than its limit, and holds
nothing uncounted except its one shared outline mask. That mask is at most the
size of one cached surface.

The glow instrumentation reports what happens. In the click captures it shows
calls with no created Canvas because the two phase-free layers already exist
when the capture starts, and its per-call times are mostly 0 because a cache
hit is one `drawImage` and Chrome reports `performance.now()` in 0.1 ms steps.
Canvas creation appears in the direct-draw observation
(`raw.graphics.glow`), whose first frame creates the surfaces.

The natural Move is clicked at `cellCentreCssPx` of the host, because the
opening view is no longer centred on the capital.
