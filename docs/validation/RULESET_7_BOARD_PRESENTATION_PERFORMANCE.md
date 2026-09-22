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
`--skip-graphics` is for comparison with revisions that do not contain the
glow cache; it omits the direct draw and pixel-comparison portions only. Chrome
uses an isolated temporary profile; the probe never touches the user's browser
profile or save. It writes no checked-in review evidence.

The natural opening uses seed 20. The synthetic public-view fixture has 625
explored Grass cells and 60 ready human units. It is a renderer stress fixture,
not a playable or serialized game state. Each motion setting has five warmup
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
by accepted asset ID, exact source dimensions, device scale, color, blur, and opacity. The
cache evicts least-recently-used rasters above 24 MiB and clears on resize, art
load, and host destroy. A conservative three-cell draw margin keeps tall sprites
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
