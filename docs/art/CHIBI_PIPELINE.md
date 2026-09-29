# Chibi production pipeline

**Status:** built in bead `pulp_wars-67q.2` for the
[chibi migration](CHIBI_MIGRATION_PLAN.md). Batches 1–5 generate, review and
register their art with it. The [chibi direction](CHIBI_ART_DIRECTION.md)
sets the rules; the [asset inventory](CHIBI_ASSET_INVENTORY.md) sets each
batch's subjects, canvases and anchors.

## Files

| Path                                                                         | What                                                                                                               |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [`scripts/art/chibi/fragments/`](../../scripts/art/chibi/fragments/)         | Prompt fragments: style, cameras, owner colour, one per class, and the ground-removal edit                         |
| [`docs/art/factions/<ID>.md`](factions/)                                     | Faction fragment: the first `text` block under "Prompt fragment" and "Negative fragment"                           |
| [`scripts/art/chibi/subjects/`](../../scripts/art/chibi/subjects/)           | Subject texts: `<FACTION>.json` for faction pieces, `SHARED.json` for terrain and resources                        |
| [`scripts/art/chibi/batches/batch-N.json`](../../scripts/art/chibi/batches/) | Batch manifest: assets (subject, class, canvas, anchor, mask override) and recipes (endpoint, size, seed, options) |
| `scripts/art/chibi/records/batch-N.json`                                     | Generation and review records (written by the pipeline)                                                            |
| `art/pixellab/submissions/`                                                  | Credential-free receipts, one flat JSON per job, as for all production art                                         |
| `art/pixellab/chibi-raw/batch-N/`                                            | Every returned candidate, lossless                                                                                 |
| `public/assets/chibi/<class>/<asset>.png` and `.mask.png`                    | Accepted DPR 1 masters and owner masks                                                                             |
| `art/pixellab/reviews/chibi-batch-N/`                                        | Review evidence                                                                                                    |

## Prompt layers

Every text-to-image prompt is built from checked-in layers, in this order:

1. style (`fragments/style.txt`);
2. camera (`camera-three-quarter.txt`, or `camera-top-down.txt` for terrain);
3. faction (from `docs/art/factions/<ID>.md`; terrain, tall terrain and
   resources are faction-neutral and skip it);
4. class (`class-<class>.txt`), followed by `owner.txt` for owned assets;
5. subject (`subjects/<faction>.json`, then `SHARED.json`), plus an optional
   asset addendum;
6. an optional recipe addendum for one iteration.

Negative fragments combine in the same order, without repeated terms.
Pixen has no negative field, so the description ends with
`Must not include: …`, as in the studies. Records and receipts store every
layer's source and text, the full description, size, seed and options.

A faction swap changes only layer 3 and the subject list; a test checks it.

## Class recipes

| Recipe class   | Endpoint                                       | Master                                                                                                 |
| -------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `unit`         | `create-image-pixen`, south-east, low detail   | the candidate, generated at the master size                                                            |
| `settlement`   | Pixen, then optional `edit-image-pixen`        | the candidate; the edit removes a plate ("Remove all ground …")                                        |
| `building`     | Pixen, then optional edit                      | as settlement                                                                                          |
| `resource`     | Pixen, then optional edit                      | as settlement                                                                                          |
| `terrain`      | `create-image-pixflux` (flat shading) or Pixen | a field at least 2x the tile; the seamless 80 x 80 window is cropped, optionally inside a `cropRegion` |
| `tall-terrain` | Pixen, then optional edit                      | the transparent body drawn over an accepted ground tile's bottom cell                                  |

"Generate at the display size" is enforced: a non-terrain request must
equal its master canvas. Pixen sizes must be multiples of 4.

Pixen draws trees and rocks on an isometric slab just as it does cities, so
tall terrain may use the same ground-removal edit before the composite.

## Terrain palettes and variants

- **Forced palette:** a Pixflux recipe may name a checked-in PNG in
  [`scripts/art/chibi/palettes/`](../../scripts/art/chibi/palettes/) as
  `colorImage` (path and SHA-256). It is sent as PixelLab's `color_image`,
  and every output pixel uses its colours exactly. PixelLab maps each drawn
  colour to its nearest palette entry, so a palette with close tones lets
  the base colour land on different entries from seed to seed. Two-tone
  palettes (base plus one far-off accent) keep the base stable.
- **Variants that join:** variants of one terrain must share their base
  colour, or a mixed map shows a patchwork. An asset may set `cropRegion`
  (the part of the field searched for the seamless window). With
  `fieldRecipe` it takes its window from another variant's accepted field:
  `accept --id <recipe> --asset <variant>`. Pixflux is not deterministic
  per seed, so a repeated request is not a way to get the same field.

## Owner masks

Owned assets (units, cities, and improvements that opt in) get a
deterministic mask in [`owner-mask.ts`](../../scripts/art/chibi/owner-mask.ts):

- **Extraction:** opaque pixels with hue 340–5, saturation >= 0.65 and value
  > = 0.30 (the key `#d8262c` and its shades); components under 3 pixels are
  > dropped as speckle.
- **QA failures:** mask pixels on transparency, on red-brown material (hue
  above 5 up to 15, saturation >= 0.45, value >= 0.30), not a shade of the
  key, or embedded in red-brown material (5 of 8 neighbours); red-brown
  material above 3% of opaque pixels; owner coverage below 15% or above 55%.
  Coverage outside the direction's 20–40% target is recorded.
- **Override:** a hand-corrected PNG (production overrides live in
  [`scripts/art/chibi/overrides/`](../../scripts/art/chibi/overrides/)) named in the asset's `maskOverride`,
  bound to the master's pixel hash, with a written reason. It passes the
  same QA; it may waive only `RED_BROWN_MATERIAL`, `COVERAGE_LOW` or
  `COVERAGE_HIGH`.

An asset whose art passes review but whose mask fails QA is recorded as
`MASK_REJECTED` and must not be registered.

## Workflow for a batch

```sh
npm run art:chibi -- plan --batch 1
npm run art:chibi -- prompts --batch 1 --id fighter-a
npm run art:chibi -- generate --batch 1 --ids fighter-a,fighter-b   # PixelLab calls
npm run art:chibi -- reject --batch 1 --id fighter-b --notes "shield is red-brown"
npm run art:chibi -- accept --batch 1 --id fighter-a --candidate 0 --notes "..." \
  --native-pass --enlarged-pass --owners-pass --no-plate-pass --camera-pass
npm run art:chibi -- registry --batch 1   # lines for src/assets/chibi-art-manifest.ts
npm run art:chibi-batch-review -- --batch 1
npm run art:validate
```

Generation prints a plate hint for suspect candidates; it is a heuristic
and never replaces looking. Review each candidate at 1:1 and x4 before
accepting. Register only `ACCEPTED` assets; a test checks every registry
entry against the records.

## Review evidence

`npm run art:chibi-batch-review -- --batch N` writes to
`art/pixellab/reviews/chibi-batch-N/`: 1:1 and x4 sheets for owners A (Coral)
and B (Teal) through the runtime recolour, exact 1170 x 2532 phone and
1440 x 900 desktop mocks, in-game captures with `?art=chibi` at zoom 1 and
0.75 on desktop and phone, `phone-links.md` with raw GitHub URLs, and
`index.json`. Captures start Vite on port 6175 (never 6173) unless a URL is
given, and need `CHROME_PATH`. `--skip-capture` skips them.

## Dry run

Batch 0 is a fixture batch. `npm run art:chibi-batch-review -- --batch 0
--dry-run` (or `npm run art:chibi -- dry-run --batch 0`) runs every step with
the tile-80 study's checked-in candidates instead of PixelLab: prompt
layering, request bodies, receipts, the plate rejection and ground-removal
edit of the city, the seamless grass crop, and masks. It asserts the
expected outcomes: the tile-80 Fighter's mask is rejected (red-brown shield,
10.5% owner area), and the Marksman passes only through its checked-in
override. Its outputs stay in `art/pixellab/reviews/chibi-batch-0/dry-run/`
and are never registered.

## Exploration runs

An exploration run calls PixelLab through the same layering, but keeps
everything in one directory under `art/explorations/` and never registers
anything. `plan`, `prompts`, `generate`, `accept` and `reject` take
`--exploration <dir>` in place of `--batch N`:

```sh
npm run art:chibi -- prompts --exploration art/explorations/faction-layer-dry-run/materials-motifs-only
npm run art:chibi -- generate --exploration art/explorations/faction-layer-dry-run/materials-motifs-only --ids fighter-a
```

The directory holds `batch.json` (a batch manifest), `faction.md` (a
faction document whose id must be `TEST-<NAME>`), `subjects.json`, and the
run's `records.json`, `submissions/`, `raw/` and `assets/`. A `TEST-`
faction is refused if it also exists in `docs/art/factions`, and
`art:validate` rejects any `TEST-` faction there. The faction-layer dry run
([factions README](factions/README.md#dry-run-test-clockwork-bead-pulp_wars-tt31))
is the first exploration run.
