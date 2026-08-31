# Ruleset 6 terrain review

This directory is the deterministic review record for `terrain-fertile-ground`,
`terrain-stone`, `terrain-road-material`, and the explicit `terrain-game` →
`terrain-animal` art alias.

Current state: the GAME alias has been revalidated against all four accepted
Forest variants in empty, occupied, locked, selected, and repeated contexts.
Its broad tan boar silhouette, snout, and tusks remain visibly wildlife across
all owners and at minimum zoom; the frontage stays readable with the accepted
Archer occupying the tile, while lock and selection remain separate overlays.
The three new PixelLab samples are blocked because the safe credential check
reports `PIXELLAB_API_KEY: missing`. No candidate, request result, hash, review
pass, or production output is claimed for those samples.

Road material is reviewed here only as the raw PixelLab input. The sixteen
orthogonal deterministic masks and all Road integration belong to `phg.12`.
Browser consumption belongs to `phg.16`.

Once the credential is available, run:

```bash
npm run art:credentials
npx tsx scripts/art/pixellab.ts generate --stage sample --ids terrain-fertile-ground,terrain-stone,terrain-road-material --concurrency 1
npm run art:ruleset6-terrain-review
```

Inspect every candidate at source, native, enlarged, and minimum zoom plus all
generated context sheets. Accept or quarantine each candidate individually:

```bash
npx tsx scripts/art/pixellab.ts review --id <id> --accept --notes "<visual findings>" --source-pass --native-pass --enlarged-pass --minimum-pass --composition-pass
# or
npx tsx scripts/art/pixellab.ts review --id <id> --reject --notes "<failure reason>"
npm run art:ruleset6-terrain-review
npm run art:validate
```

Do not start any batch until all three sample records are genuinely `ACCEPTED`.
