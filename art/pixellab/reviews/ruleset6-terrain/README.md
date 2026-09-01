# Ruleset 6 terrain review

This directory is the deterministic review record for `terrain-fertile-ground`,
`terrain-stone`, `terrain-road-material`, and the explicit `terrain-game` →
`terrain-animal` art alias.

Current state: all three first-sample recipes are accepted after individual
generate-inspect-iterate review. Exact request snapshots, provider/output hashes,
dimensions, alpha, anchors, bounds, post-processing, review flags, notes, and
rejected-attempt history are in `scripts/art/pixellab-generated.json`.

| Asset          | Accepted SHA-256                                                   | Alpha bounds         | Finding                                                                                                                        |
| -------------- | ------------------------------------------------------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Fertile Ground | `97545314656cee7b83d0744309086051f1d520957d0b982ff5e5515cba4adc6b` | `x56..200,y144..222` | Low matte dark-loam patch with two small sprouts; distinct from Fruit, Farm rows/structures, selection, and ownership.         |
| Stone          | `8d8719bec9de96392e1a205c38b0f74ebff32aaabbae046800ef23744bef2f14` | `x84..171,y142..222` | Three natural rounded boulders; distinct from angular gold Ore, Mountain peaks, cut Quarry blocks, and status marks at 0.625x. |
| Road material  | `d0f60535de68afa17fcc39f9fcc6cefd886d45292ad0e3216727c5dca850e84f` | `x14..239,y1..147`   | Uniform matte warm gray-brown raw material with no route, line, direction, neighbor layout, or visual noise.                   |

The preferred-bounds fit for Fertile Ground and Stone is deterministic and
recorded as `preferred-low-marker-fit`; Road receives the deterministic
supersampled `diamond-mask`. Every accepted PNG retains its requested untrimmed
canvas and straight alpha.

Two oversized/Farm-like Fertile attempts, one cut-block/Quarry-like Stone
attempt, and one striped/directional Road attempt are preserved under
`art/pixellab/quarantine/` with hashes, request snapshots, timestamps, and
specific rejection reasons in the generated manifest.

The GAME alias has also been revalidated against all four accepted Forest
variants in empty, occupied, locked, selected, hunted, and repeated contexts.
Its broad tan boar silhouette, snout, and tusks remain visibly wildlife across
all owners and at minimum zoom; the frontage stays readable with the accepted
Archer occupying the tile, while lock and selection remain separate overlays
and Hunt removes only GAME while retaining Forest.

Road material is reviewed here only as the raw PixelLab input. The sixteen
orthogonal deterministic masks and all Road integration belong to `phg.12`.
Browser consumption belongs to `phg.16`.

Rebuild the deterministic review evidence with:

```bash
npm run art:ruleset6-terrain-review
npm run art:validate
```

No later building, unit, technology, or Road-mask batch was generated. The three
accepted sample records open this class gate only; the sixteen orthogonal masks
and Road integration still belong to `phg.12`.
