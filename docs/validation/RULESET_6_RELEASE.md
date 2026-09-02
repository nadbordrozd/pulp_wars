# Ruleset 6 release validation

**Status:** passed independently on 2026-09-02 at the published playable
integration boundary `185ee53`.

**Ruleset:** `pulp-wars-poc-6`, schema/save/replay version 6,
`SPATIAL_ECONOMY` map revision.

This is the authoritative final release record for Ruleset 6. The staged plan
at the top of [POC validation](POC_VALIDATION.md) remains the coverage contract;
the historical Ruleset 5 evidence below it is not evidence for this release.
The machine-readable results are checked in as
[RULESET_6_RELEASE_CORPUS.json](RULESET_6_RELEASE_CORPUS.json).

## Reproducible corpus

Run:

```bash
npm run validate:ruleset6-release
```

The validator reconstructs every legal board-size/AI-count pair in both Rival
and Cooperative mode. Each of the 24 cases is generated twice and compares the
initial state, board, and post-generation PRNG hashes. The same seed/setup is
also regenerated with all-Original seats and compared with the alternating
Original/Candy case, proving faction-only map and PRNG parity. The checked JSON
records the seed and three hashes for every case.

The behavior tier positively accounts for:

- all 25 technologies under each explicit faction-tree registration;
- every five resource, eleven economic improvements, seventeen economic
  commands, eight rewards, and nine roles for each faction;
- Heal, Charge, Push, Breach, Roll, Wall, and Candify;
- ordinary and jackpot layouts, negative population and destruction,
  cross-city Workshop/Grand Works/Market, a capital-connected Market, level
  5+, pending-choice save/resume, replay/headless exactness, legacy
  compatibility, and Cooperative no-allied-harm.

These participation records are backed by the named deterministic test sources
in the corpus rather than inferred from source inventory. The full test gate
executes those sources. A 120-map, ten-seed repeated property corpus in
`ruleset-v6-map.test.ts` additionally covers every legal size/AI pair, both
relationship modes, exact resource-stream continuation, retries, invariants,
and jackpot-supporting diversity.

## Normal and deterministic headless evidence

An independently run mixed Original/Candy Rival match used seed 0, Auto 11,
the production Normal selector, and the release caps of 30,000 commands and
750 rounds. It ended in victory after 50 rounds and 742 accepted commands with
zero errors, stalls, cap hits, public-equality mismatches, or relationship
violations. Participation included 26 research commands, 56 economic builds,
4 Roads, 5 Markets, 9 captures, 20 rewards, 155 attacks, 17 Pushes, 2 Walls,
and 2 Candify actions.

Exact repeat hashes:

| Stream      | SHA-256                                                            |
| ----------- | ------------------------------------------------------------------ |
| commands    | `7fc1a0f69054fe2045174d369179579b3e60f450accc7800f4a6c32e9f3f308c` |
| events      | `2d75aa07456568ed05314f33135754c3a6aeb52b44203a32d5438fbcd35ee067` |
| checkpoints | `1cb23625f79faa7c50eb46e6c2ba12c3237cd4f6fe4f6d1d076c5ff443267eb4` |
| final state | `a1a67fba473ded644350df0567c42b26d61761ca29ba9aea687c8522277ccd40` |

To repeat the complete match and update the checked result deliberately:

```bash
npm run validate:ruleset6-release:refresh
```

The ordinary verification command does not rerun this approximately two-minute
playout. It compares the checked result while freshly rebuilding the 24-case
configuration corpus and every evidence hash. The test suite separately repeats
mixed-faction command/event/checkpoint/final-state streams, Cooperative
alternating-faction command streams with zero allied harm, pending-choice
boundaries, replay rejection/exactness, and the exact Normal policy fixtures for
rare abilities and late spatial builds. This tiering keeps the routine gate
deterministic and practical without pretending that a single emergent match
must exercise every rare branch.

## Browser, accessibility, and visual evidence

`npm run smoke:browser` exercised the production Chrome entry, not a static
mock. Its checked evidence covers both factions and both AI modes at 1440 x
1000 DPR1 and true 390 x 844 DPR2. Pointer, touch, keyboard, direct one-click
tile economy actions, contextual unit/city/tile isolation, the faction-aware
25-node Technology screen, blocking reward choices, save/resume, fixed Canvas
geometry, full/reduced motion, and high contrast passed with no console/page
errors or horizontal overflow.

The following evidence was inspected at native resolution and in its checked
nearest-neighbor enlargement:

- Original and Candy unit context, reward, city training, and Technology detail;
- mobile high contrast and desktop reduced motion for both factions;
- melee contact/impact and reduced-motion response;
- Original arrow and Candy gumball ranged flight/impact;
- map renderer/host, compact unit scale, terrain, resources, buildings, Roads,
  contributor geometry, and both complete technology trees.

The release corpus recursively verifies 11 evidence manifests and 106 hashed
artifacts. `art:validate` verifies accepted PixelLab source dimensions, alpha,
hashes, explicit reuse aliases, quarantine history, and manifest completeness.
No placeholder production asset or unregistered fallback remains reachable.

## Release commands and outcomes

The independent release run used Node 24.12.0, Chrome 152.0.7977.65, and the
checked npm lockfile. All commands below passed from the clean integration
baseline with only the audited release changes present:

```bash
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
npm run smoke:browser
npm run smoke:browser:legacy-v5
npm run check
git diff --check
```

The full gate covers formatting, ESLint, all strict TypeScript targets, 849
Vitest tests, production build, and the frozen headless golden replay. The
legacy browser smoke proves the retained v5 compatibility surface still loads;
v1-v5 saves/replays remain incompatible and byte-preserved under v6 as designed.

## Security, repository hygiene, and limits

Credential-name and generated-junk scans cover source, docs, manifests, corpus,
and review evidence. The corpus contains no environment values, absolute key
paths, tokens, or credentials. Dependency audit reports no production runtime
dependencies; the application remains a local client-only game.

Wall-clock time is diagnostic and excluded from deterministic artifacts. The
full mixed Normal playout took 132.35 seconds on the audit machine; its
commands, events, checkpoints, and final state are the release authority, not
elapsed time. Raster files remain excluded from the compressed initial-JS
budget. No accepted product, rules, accessibility, art, persistence, replay,
or determinism limitation remains for Ruleset 6.
