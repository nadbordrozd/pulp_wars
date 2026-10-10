# Chibi art migration plan

**Status:** complete in the game. All five batches are approved and on
`main`, the user approved all the art on 2026-10-10, and CHIBI is the only
Ruleset 7 art set. `pulp_wars-67q.13` retired the player-facing switch:
`?art=legacy` is no longer recognised, a stored LEGACY choice is cleared,
the legacy set is no longer a preload look, and the chibi direction was
folded into [ART_DIRECTION.md](ART_DIRECTION.md). `pulp_wars-67q.15`
removed the LEGACY render path itself: the board renderer, the board host
and the app view have no art-set choice, the `ArtSetV7` type is gone, and
no Ruleset 7 code resolves a file of the earlier PixelLab set
(`ACCEPTED_ART_URLS`). A subject whose raster is missing or fails to load
is drawn in code: a flat wash of its terrain for ground, a lettered marker
for a unit, city, building or resource on the board
(`src/render/canvas/missing-art-v7.ts`), and a lettered plate in the
interface (`.v7-art-missing`). The tests that drew LEGACY by default draw
the chibi art, or the stand-in where they are about missing art.

**Nothing is left.** The files only the removed path could reach are
deleted (see
[Retired: the earlier Ruleset 7 rasters](#retired-the-earlier-ruleset-7-rasters)).

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
    -> 67q.15 CHIBI the only render path, tests moved off LEGACY
       (and, in the same bead, the legacy-only rasters and their
        PixelLab recipes and records retired)

tt3.1 faction-layer dry run  (after 67q.2 and batch-1 approval 67q.4;
                              runs in parallel with batches 2–5)
```

| Bead               | What                                                                                            | Validation profile                 |
| ------------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------- |
| `pulp_wars-67q`    | Epic: chibi migration                                                                           | —                                  |
| `pulp_wars-67q.1`  | Runtime: `?art=chibi` art-set switch, 80 px tile, discrete zoom steps, mask recolour, anchors   | `ui/presentation` + browser smoke  |
| `pulp_wars-67q.2`  | Production pipeline, layered prompts, owner masks and QA, asset inventory, batch review tooling | `asset-only`                       |
| `pulp_wars-67q.3`  | Batch 1 (pilot): terrain, village and city tiers, Fighter, Marksman                             | `ui/presentation` + asset gates    |
| `pulp_wars-67q.5`  | Batch 2: Raider, Guard, Captain, Catapult, Knight, Juggernaut                                   | same                               |
| `pulp_wars-67q.7`  | Batch 3: resources, Farm, Lumber Camp, Mine, Port, Roads, Field Defense, chest, Monument        | same                               |
| `pulp_wars-67q.9`  | Batch 4: Windmill, Sawmill, Forge, Workshop, Market, Shipyard, ships, embarked form, leftovers  | same                               |
| `pulp_wars-67q.11` | Batch 5: portraits, tech/action/reward/achievement icons, HUD symbols, leftovers                | same                               |
| `.4/.6/.8/.10/.12` | User review gates, one per batch                                                                | explicit user approval             |
| `pulp_wars-67q.14` | Chibi becomes the default; `?art=legacy` stays a persisted opt-out                              | `ui/presentation` + browser smoke  |
| `pulp_wars-67q.13` | Cutover: the `?art=legacy` switch and the LEGACY preload look retired, art docs folded          | `cross-cutting/release`            |
| `pulp_wars-67q.15` | CHIBI the only render path: no art-set choice, a missing raster is drawn in code                | `cross-cutting/release`, unit tier |
| `pulp_wars-tt3`    | Epic: faction art layer                                                                         | —                                  |
| `pulp_wars-tt3.1`  | Dry run of the faction fragment with a throwaway test faction                                   | `asset-only`                       |

The design field of each bead holds the full scope, the worker checks and
the final gates.

## Retired: the earlier Ruleset 7 rasters

The last stage of `pulp_wars-67q.15` deleted the 42 rasters only the removed
render path could name (1,270,954 bytes under `public/assets/pixellab/`):
all of `terrain-ruleset7/` (19) and `buildings-ruleset7/` (8), the five
`terrain-square/ruleset7-*` resources, and ten interface files (the gold
coin, the Catapult, Captain and Knight portraits, and the Pillage, Disband,
Rally, Cultivate Forest and Blast Mountain icons). Each was checked first:
no Ruleset 6, legacy or Ruleset 7 source names its id or path, including
the ids those sources build from a template and the Ruleset 6 asset
coverage table. The other files of that folder are the frozen Ruleset 6 art
and stay.

**The retire command.** `npm run art:retire -- --ids a,b --reason "…"` (or
`--ids-file <file>`, one id per line; `--dry-run` lists what would go) is
the `retire` command of
[`scripts/art/pixellab.ts`](../../scripts/art/pixellab.ts), with its logic
in [`pixellab-retire.ts`](../../scripts/art/pixellab-retire.ts). It makes no
PixelLab call and needs no credential. For each recipe it deletes the
raster, the candidate, the quarantined rejected attempts, the reframe
sources no staying recipe uses and the submission receipts; it drops the
generation record; and it moves the recipe out of `recipes` in
[`pixellab-manifest.json`](../../scripts/art/pixellab-manifest.json) into a
`retired` list that keeps the id, the class, the output path, the hash of
the accepted raster and the reason. The manifest is edited as text, so the
recipes that stay keep their exact bytes. `pixellab-generated.json` is then
rewritten: its `sourceManifestSha256` is the hash of the new manifest text,
which is the only link in the chain between the two files (each record's
own hashes are of its raster and its provider output and do not change).
The runtime table `src/assets/generated-art-manifest.ts` is regenerated
from what is left. The new manifest is validated before anything is
written, so a refused retirement changes nothing.

**What a retirement refuses.** An alias that points at the recipe; a
staying recipe that composes it as its ground; a staying recipe whose
postprocess reads its raster again (a derived portrait, a rotated or
edge-restored diamond).

**A style reference that outlives its raster.** Two recipes that stay,
`ui-action-defection` and `ui-action-blackout`, were drawn with a retired
icon as their style reference (`ui-action-disband` and `ui-action-pillage`).
The reference stays in the recipe as history: `styleReference` still names
the retired id, the accepted record still holds the exact hash of the image
PixelLab was shown, and that hash equals the `outputSha256` of the retired
entry. Such a recipe is **frozen**: `generate`, `repair`, `archive-job` and
`resume-job` refuse it, because the reference image no longer exists; to
redraw it, give it a live style reference first. `npm run art:validate`
checks the `retired` list (no id or output in use again, no record left, no
raster left on disk) and every frozen recipe (an accepted record holding
the reference's hash, and a postprocess that does not read the reference).

**What went with the rasters.**

- The Ruleset 7 art id tables `src/assets/ruleset7-ui-art.ts`,
  `ruleset7-logistics-art.ts`, `ruleset7-playtest-art.ts` and
  `ruleset7-revision9-art.ts`. The board plan and the interface stand-ins
  are keyed by [`src/assets/art-keys-v7.ts`](../../src/assets/art-keys-v7.ts):
  a key that named a retired raster now starts with `v7-` and ends in the
  same word, so every lettered stand-in keeps its letter; the other keys
  still spell a Ruleset 6 raster id and are not looked up either.
- The unused painted-bounds layouts `src/render/dom/selection-identity-v7.ts`.
- The generation-order checks of the logistics, playtest and Catapult
  families. The building-economy, revision-3 and revision-9 checks keep the
  order of the recipes that stay (Barracks before Monument, the Horse Archer
  before its portrait, the Captain before the Knight).
- Ten review scripts `scripts/art/ruleset7-<family>-review.ts` (the
  families building-economy, catapult, economy-icons, farm, logistics,
  naval, playtest, resource-refresh, revision9 and tactical-ui), the
  Ruleset 7 modes of `square-original-terrain-review.ts`,
  `style-exploration-review.ts` (it drew its boards on the retired terrain),
  the two review scripts of the removed path
  (`scripts/browser-playtest-review-v7.ts`,
  `scripts/browser-city-buff-review-v7.ts`) and their `package.json` entries.
- Eight review evidence folders `art/pixellab/reviews/ruleset7-<family>/`
  (building-economy, catapult, farms, logistics, naval, playtest, revision9
  and tactical-ui). The `ruleset7-original-units` evidence names no retired
  raster and stays, with its script.
- The asset tests of the retired art; the tests of families with a recipe
  that stays keep that recipe's checks and assert the retirement.

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
