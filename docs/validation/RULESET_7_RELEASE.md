# Ruleset 7 release validation

**Status:** historical revision-2 evidence; final acceptance passed for
`pulp-wars-poc-7r2`. This evidence is not current for the authoritative
[revision-3 prototype](../product/RULESET_7.md) and must not be relabeled or
refreshed as revision-3 evidence. Runtime candidate
`7831cc95bcba4b5938d414d817744c7e2ee34ca2` is published on `main`, verified on
`origin/main`, deployed successfully to GitHub Pages, and verified through the
actual production URL.

For that revision-2 release, Ruleset 7 was the normal browser default and the
supported Original-faction game. Exact `?ruleset=7` selected the same contract.
Frozen Ruleset 6 remains a
discoverable compatibility game at exact `?ruleset=6`, including Candy setup
and its historical save. Development-only `?legacy-v5=1` remains available to
the retained legacy smoke.

The machine-readable deterministic record is
[RULESET_7_RELEASE_CORPUS.json](RULESET_7_RELEASE_CORPUS.json). The frozen
[Ruleset 6 corpus](RULESET_6_RELEASE_CORPUS.json) is an input whose bytes and
hash are verified; the Ruleset 7 workflow never refreshes or relabels it.

## Reproducible deterministic evidence

Run:

```bash
npm run validate:ruleset7-release
```

The command regenerates 24 legal board-size, AI-count, and relationship-mode
map cases. Every case is generated twice, and the board, treasures, and
post-generation PRNG state are compared with the frozen v6 generator. It then
executes the named deterministic fixture tests recorded in the corpus. A
coverage entry counts only when its exact test title passed in that invocation;
the validator rejects missing execution, stale inventory, duplicate evidence,
dirty artifact hashes, partial browser evidence, and a partial or stale Normal
matrix. The natural browser report also carries a fingerprint of its production
route, controller, persistence, renderer, UI, art registry, and smoke contract,
so an earlier successful capture is rejected after any of those inputs change.

The inventory mapping accounts for all 25 technologies, 13 roles, 13
improvements, and eight rewards. These records deliberately distinguish
contracts from participation: the technology fixture accepts all 25 research
commands, role records prove each immutable role contract while separate
mechanic fixtures exercise its behavior, and reward records say whether a
choice was offered, accepted, or evaluated by the production policy. No
positive counter is fabricated from an identifier list. Masonry's future
wildcard extension is reserved only; the exact 13-role fixture proves that no
wildcard role is implemented.

The behavior mapping covers the required revision-2 schemas and identities,
economy and repair package, every-level rewards, achievements and Monuments,
combat and lifecycle, Pursuit, Defection, Concealment, Blackout, persistence,
compatibility, public AI boundary, and production asset registration. Telemetry
fixtures start from real accepted transition sequences. They verify the
zero-filled inventory shape and separately verify restoration/rebuild, Coin,
Catapult recovery, Pursuit, and Blackout/exposure accounting. Source inventory
alone is not behavioral or telemetry evidence.

`npm run validate:ruleset7-release:refresh` deliberately replaces only the new
Ruleset 7 deterministic corpus after review. It is not a routine gate and does
not run or rewrite the Normal matrix. The matrix must first be generated from
the current runtime with:

```bash
npx tsx scripts/validate-ruleset-v7-normal-ai-matrix.ts --ai-counts 1,2,3 --modes rival,cooperative --repeats 2 --output docs/validation/RULESET_7_NORMAL_AI_MATRIX.json
```

The matrix is six all-AI cells: one, two, and three Normal AI opponents in both
Rival and Cooperative mode, with two exact repeats. Release requires an actual
outcome, equal repeat hashes, and zero errors, rejected commands, mandatory-work
overflows, stalls, hidden-information violations, allied hostile actions,
allied-territory path steps, command-cap hits, and round-cap hits. Repeat hashes
show deterministic clone execution. Separate equal-public-view tests prove
hidden-authority observation equivalence; the matrix does not claim to measure
that by itself.

## Browser and reviewed visual evidence

`npm run smoke:browser` opens the normal production entry with no `ruleset`
parameter. It launches a real one-AI Original match, uses only public controller
snapshots and actual offered DOM controls, and lets the shipped Normal AI play
all non-human commands while the human harness chooses offered rewards and ends
turns. The match must reach a real Victory or Defeat under the production
scheduler. The same run checks keyboard/pointer/touch input, Fast Forward,
autosave, restart, resume, delete, the separate r2/r1/v6 storage keys, explicit
Ruleset 6 Original/Candy discovery, and unsupported-route storage isolation.

This is automated playability evidence, not human playtesting or a claim about
subjective balance. The Normal matrix and deterministic fixtures support
analytical correctness and balance telemetry; neither substitutes for future
human playtesting. The checked tactical browser captures are also explicitly
labeled as strict engine-applied synthetic fixtures, not natural matches.

After deployment, a bounded production-bundle probe can be run without source
or test-module imports:

```bash
npx tsx scripts/browser-smoke-v7.ts --deployed 'https://nadbordrozd.github.io/pulp_wars/?browser-smoke=1'
```

It verifies default-v7 launch, a real AI return, a human End Turn and second AI
return, DOM Main menu/resume at an unchanged accepted command/hash boundary,
reload/resume, route-owned restart/delete, explicit-v6 Candy discovery, and
unsupported-route isolation. The debug bundle is accessed only through its
explicit spoiler acknowledgement API.

Production asset acceptance is independently rechecked by `art:validate`, the
five Ruleset 7 art review commands, and the inherited nine Ruleset 6 review
commands. The release corpus binds the five v7 PixelLab review manifests plus
the core, tactical, natural-match, natural/synthetic Farm, and UI-polish browser
evidence groups to their checked files. Farm evidence covers the accepted
single, horizontal-pair, and vertical-pair rasters, deterministic same-city
pairing, fog/ownership/removal boundaries, and production pointer selection.
The UI-polish evidence covers single physical city contours, grouped bounded
desktop docks, unique Technology headings, compact reflow, and route-owned Main
menu/resume at an accepted authoritative boundary.

## Final release gates

Run from the reviewed release revision:

```bash
npm run validate:ruleset7-release
npm run validate:ruleset6-release
npm run art:validate
npm run art:ruleset6-terrain-review
npm run art:ruleset6-building-road-review
npm run art:ruleset6-original-unit-review
npm run art:ruleset6-candy-unit-review
npm run art:ruleset6-tech-economy-ui-review
npm run art:ruleset6-renderer-review
npm run art:ruleset6-host-review
npm run art:ruleset6-combat-review
npm run art:ruleset6-shell-review
npm run art:ruleset7-original-unit-review
npm run art:ruleset7-catapult-review
npm run art:ruleset7-building-economy-review
npm run art:ruleset7-tactical-ui-review
npm run art:ruleset7-farm-review
npm run smoke:browser
npm run smoke:browser:ruleset6
npm run smoke:browser:legacy-v5
npx tsx scripts/browser-core-ui-review-v7.ts
npx tsx scripts/browser-tactical-ui-review-v7.ts
npx tsx scripts/browser-farm-review-v7.ts
npm run review:ruleset7-ui-polish
npm run check
npm audit --audit-level=high
git diff --check
```

The browser default, compatibility routes, all three save keys, Normal matrix,
fixture corpus, visual evidence, and production build pass or fail together.
There is no Ruleset 7 release fallback to Ruleset 6 and no silent Candy
adaptation.

## Root verification status

The following checks passed at the current reviewed source revision:

- `npm run check`: formatting, lint, strict TypeScript checks, 1,375 tests in
  126 files, production build, and golden replay;
- `art:validate`, all nine Ruleset 6 art reviews, and all five Ruleset 7 art
  reviews;
- default Ruleset 7 natural browser smoke: a real Defeat in round 18 after 161
  commands, three initial production AI commands over nine scheduled slices,
  maximum accepted-callback time 34.5 ms against the 40 ms limit, and a cold
  command-1100 result of 873 callbacks, 1,482 host ticks, 12.3 ms maximum
  callback time, and 13,262.7 ms total;
- full Ruleset 6 Original/Candy browser smoke, including the AI-first launch;
- quiet legacy v5 browser smoke with 1-AI, 2-AI, and 3-AI outcomes after 378,
  669, and 1,306 commands respectively;
- Ruleset 7 core, tactical, Farm, and UI-polish browser reviews;
- frozen Ruleset 6 corpus validation: 24 maps, 50 fixtures, 12 evidence
  manifests, with corpus SHA-256
  `70a3074be0ac565c7bd5c25a5733796ca7ff262fe8c5931b70bc3d41a90ff77e`;
- `npm audit --audit-level=high` with zero vulnerabilities after updating Sharp
  to 0.35.4 and Vitest to 4.1.11.

The fresh Normal matrix passed all six cells with two exact repeats, equal
repeat hashes, and zero diagnostics. Its runtime fingerprint is
`52b0d0d0b63692b9f49a0d01ca0043d4463fb05051508bb6bb73410d214b5c1e`.

| Mode        | Normal AI count | Rounds | Accepted commands |
| ----------- | --------------: | -----: | ----------------: |
| Rival       |               1 |     53 |               971 |
| Rival       |               2 |     18 |               319 |
| Rival       |               3 |     40 |             1,334 |
| Cooperative |               1 |     53 |               971 |
| Cooperative |               2 |     19 |               352 |
| Cooperative |               3 |     31 |               993 |

The approved initial Ruleset 7 corpus refresh and subsequent ordinary
`npm run validate:ruleset7-release` both passed with 24 repeated v6-parity
maps, 74 executed deterministic fixtures, ten reviewed evidence groups, a
fresh six-cell matrix, and exact inventory coverage for 25 technologies, 13
roles, 13 improvements, and eight rewards.

The corrected bounded `--deployed` path also passed against the built
production distribution served locally under `/pulp_wars/`: three initial AI
commands over 14 scheduled slices with a 38.6 ms maximum callback, followed by
the real second AI return, DOM Main menu/resume command-and-hash equality,
restart, reload, delete, and compatibility routing. This validates the built
probe path independently of the subsequent actual Pages verification.

Timing results are run-specific acceptance observations, not universal
performance guarantees. Earlier development-host attempts recorded 45.3 ms
and 41.4 ms callbacks; those failures remain in the Beads validation history
and are not relabeled as passes.

GitHub Pages workflow
[34377218485](https://github.com/nadbordrozd/pulp_wars/actions/runs/34377218485)
completed Build and Deploy successfully at `2026-09-09T16:33:19Z`. The actual
deployed verification command was:

```bash
npx tsx scripts/browser-smoke-v7.ts --deployed 'https://nadbordrozd.github.io/pulp_wars/?browser-smoke=1'
```

It passed in Chrome 153.0.8010.36 with three initial AI commands over 14
scheduled slices and a 39.9 ms maximum callback against the 40 ms limit. The
production-bundle path loaded no source or test modules and passed default-v7
launch, the real second AI return, DOM Main menu to `RESUMABLE` and Resume with
exact command-index/hash preservation, deterministic restart, reload/resume,
route-owned delete, old-v7 and v6 key isolation, exact Ruleset 6 Original/Candy
discovery, and unsupported-route isolation.

All release acceptance and actual deployment checks are therefore complete.
Any subsequent commit containing this final record and tracker closures is
documentation/tracker-only and introduces no runtime changes; no future commit
SHA is asserted here.
