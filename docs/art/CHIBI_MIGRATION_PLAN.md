# Chibi art migration plan

**Status:** complete for players. All five batches are approved and on
`main`, the user approved all the art on 2026-10-10, and CHIBI is the only
Ruleset 7 art set a player sees. `pulp_wars-67q.13` retired the
player-facing switch: `?art=legacy` is no longer recognised, a stored
LEGACY choice is cleared and falls back to the default look, the legacy set
is no longer a preload look, and the chibi direction was folded into
[ART_DIRECTION.md](ART_DIRECTION.md).

**What is left** is internal and is follow-up work, done in one piece so
that there is never a state where the renderer names art that no longer
exists: make CHIBI the only render path in the board renderer, the board
host and the app view (today the plan is still built with legacy asset ids,
a chibi raster that cannot be drawn falls back to its legacy raster, and a
view built without an art set, as most unit tests do, draws LEGACY), move
those tests off the LEGACY default, and then delete the 42 rasters only that
path can name (1.27 MB under `public/assets/pixellab/`: all of
`terrain-ruleset7/` and `buildings-ruleset7/`, five `terrain-square/ruleset7-*`
files and ten interface files) with their `ruleset7-*` art scripts, asset
tests, review evidence and PixelLab records. Ruleset 6 and the older
screens draw the other 218 files of that folder and stay untouched.

The Beads IDs below are the source of truth for progress; this document
records the plan in git, so it survives a move to a new machine.

## Goal

Replace every sprite the Ruleset 7 game uses with the approved
[chibi art direction](ART_DIRECTION.md), in five batches. The user
reviews each batch before the next begins. Ruleset 6 and its frozen art stay
untouched.

The user also wants more factions later. For now only the shared style and
the [faction layer](factions/README.md) are documented; specific factions
will be named by the user.

## Order of work

```text
67q.1 runtime (art-set switch, 80 px tile)  ─┐
67q.2 pipeline, masks, inventory, review    ─┴─> 67q.3 batch 1 -> 67q.4 USER REVIEW
    -> 67q.5 batch 2 -> 67q.6 USER REVIEW -> 67q.7 batch 3 -> 67q.8 USER REVIEW
    -> 67q.9 batch 4 -> 67q.10 USER REVIEW -> 67q.11 batch 5 -> 67q.12 USER REVIEW
    -> 67q.14 chibi becomes the default (?art=legacy opt-out)
    -> 67q.13 the ?art=legacy switch retired, art docs folded
    -> follow-up: CHIBI the only render path, legacy-only rasters deleted

tt3.1 faction-layer dry run  (after 67q.2 and batch-1 approval 67q.4;
                              runs in parallel with batches 2–5)
```

| Bead               | What                                                                                            | Validation profile                |
| ------------------ | ----------------------------------------------------------------------------------------------- | --------------------------------- |
| `pulp_wars-67q`    | Epic: chibi migration                                                                           | —                                 |
| `pulp_wars-67q.1`  | Runtime: `?art=chibi` art-set switch, 80 px tile, discrete zoom steps, mask recolour, anchors   | `ui/presentation` + browser smoke |
| `pulp_wars-67q.2`  | Production pipeline, layered prompts, owner masks and QA, asset inventory, batch review tooling | `asset-only`                      |
| `pulp_wars-67q.3`  | Batch 1 (pilot): terrain, village and city tiers, Fighter, Marksman                             | `ui/presentation` + asset gates   |
| `pulp_wars-67q.5`  | Batch 2: Raider, Guard, Captain, Catapult, Knight, Juggernaut                                   | same                              |
| `pulp_wars-67q.7`  | Batch 3: resources, Farm, Lumber Camp, Mine, Port, Roads, Field Defense, chest, Monument        | same                              |
| `pulp_wars-67q.9`  | Batch 4: Windmill, Sawmill, Forge, Workshop, Market, Shipyard, ships, embarked form, leftovers  | same                              |
| `pulp_wars-67q.11` | Batch 5: portraits, tech/action/reward/achievement icons, HUD symbols, leftovers                | same                              |
| `.4/.6/.8/.10/.12` | User review gates, one per batch                                                                | explicit user approval            |
| `pulp_wars-67q.14` | Chibi becomes the default; `?art=legacy` stays a persisted opt-out                              | `ui/presentation` + browser smoke |
| `pulp_wars-67q.13` | Cutover: the `?art=legacy` switch and the LEGACY preload look retired, art docs folded          | `cross-cutting/release`           |
| `pulp_wars-tt3`    | Epic: faction art layer                                                                         | —                                 |
| `pulp_wars-tt3.1`  | Dry run of the faction fragment with a throwaway test faction                                   | `asset-only`                      |

The design field of each bead holds the full scope, the worker checks and
the final gates.

## Why this shape

- **The runtime and pipeline come first.** They let every batch be seen in
  the real game behind `?art=chibi` while the default stayed on the legacy
  art, so `main` was releasable throughout. Chibi became the default only
  after every batch was approved.
- **Batch 1 sets the look:** terrain, cities and the two units the user
  already approved. That settles grass, city scale and the owner mask before
  the bulk of the work.
- **The later batches follow the sprite review's priorities:** role
  silhouettes (batch 2), resource size and saturation (batch 3), and ship
  owner colour (batch 4).

## User review gates

After each batch the root orchestrator:

1. publishes the batch (commit and push to `main`);
2. sends the user the phone links (raw GitHub URLs for the exact-size phone
   mocks in `art/pixellab/reviews/chibi-batch-N/`), the desktop mock, the
   in-game instructions (`?art=chibi` while the switch existed), and a short
   summary;
3. stops and waits. Requested changes become correction beads that block the
   gate. The gate closes only on explicit user approval, quoted in the close
   reason.

The next batch never starts before its gate closes.

## Known risks, from the studies

- **Cities come out on plates.** Text-to-image drew all 12 cities on a plate,
  so plan on a generate-then-edit pass with `edit-image-pixen`.
- **Cities come out small.** Request a canvas wider than the tile and accept
  the overflow limits in the direction.
- **Terrain tiles come out framed.** Generate a larger field and take a
  deterministic seamless crop. The flat-shaded grass needs lower saturation
  and variants.
- **The owner mask bleeds onto red-brown shading.** Use strict mask QA,
  red-free non-owner materials, and hand-corrected overrides where needed.
- **Pixen has no reference input**, so consistency across a set depends on
  the prompt fragments and seeds. Review each batch as a contact sheet.
- **Production asset tests read every entry in
  `art/pixellab/submissions/` as a receipt.** Don't put folders there that
  aren't receipts.
- **Art-review scripts rewrite their checked-in evidence when run.** Restore
  anything outside a bead's scope before committing.

## Setting up a new machine

- Node 24 and `npm ci`.
- `PIXELLAB_API_KEY` in the environment. Never print or commit it;
  `npm run art:credentials` only reports whether it is configured.
- Headless Chrome for the browser smokes and review captures: set
  `CHROME_PATH` to the local binary.
- `VITEST_MAX_WORKERS=1` makes the full `npm run check` more reliable on a
  loaded laptop.
- Beads: run `bd prime`. Beads data lives in Dolt, not in the git tree. To
  carry these issues to a new machine the user must authorise a
  `bd dolt push` (on the old machine) and a pull (on the new one). If that
  doesn't happen, recreate the beads from the table above.
- The user's dev server runs Vite on port 6173 (`npm run dev`).
