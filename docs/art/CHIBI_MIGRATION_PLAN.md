# Chibi art migration plan

**Status:** all five batches are approved and on `main`, and CHIBI is the
default Ruleset 7 art set (`pulp_wars-67q.14`). `?art=legacy` still selects
and persists the legacy art as an opt-out, and a stored choice is respected.
Retiring the legacy Ruleset 7 art path and folding the art docs remain in
`pulp_wars-67q.13`. The Beads IDs below are the source of truth for
progress; this document records the plan in git, so it survives a move to a
new machine.

## Goal

Replace every sprite the Ruleset 7 game uses with the approved
[chibi art direction](CHIBI_ART_DIRECTION.md), in five batches. The user
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
    -> 67q.13 legacy Ruleset 7 art retired

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
| `pulp_wars-67q.13` | Cutover: legacy Ruleset 7 art retired, art docs folded                                          | `cross-cutting/release`           |
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
   in-game `?art=chibi` instructions, and a short summary;
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
