# Ruleset 7 Tactical AI Validation

This evidence covers the revision-11 bounded Normal policy. The production
policy consumes only `PlayerViewV7`, public commands, and public previews. The
comparison baseline is the policy from commit
`2a3c029f92a63ea33c7164b05ad0a91d134c1e7b`; its `src/ai/v7.ts` SHA-256 is
`37c5cebe79cc30939a8a7ce15ab0b83cfac6a6a220add8f57f85f6a2e1d72e73`.
The validation adapter reconstructs that pinned source for the harness while
both policies use the current revision-11 engine, public views, maps, and caps.
Historical AI code is not shipped in the production bundle.

## Semantic scenarios

Run the focused policy checks with Node 24:

```text
VITEST_MAX_WORKERS=1 npm test -- --run tests/unit/ruleset-v7-tactical-ai-r11.test.ts tests/unit/ruleset-v7-normal-policy.test.ts tests/unit/ruleset-v7-naval-ai.test.ts tests/unit/ruleset-v7-biome-query-ai.test.ts tests/unit/ruleset-v7-ai-headless.test.ts tests/unit/ai-turn-budget.test.ts tests/integration/ruleset7-browser-controller.test.ts
```

The tactical suite builds strictly parsed states and evaluates public commands.
Translations, reflections, and factual countervariants cover all twelve
families in the product contract:

1. legal next-turn attack and imminent capture threats versus proximity,
   including activation reset, minimum range, known terrain, form, and ZOC;
2. a sole city defender holding against an unreachable nominal screen;
3. projected vacating and a current-activation legal replacement permitting a
   superior defender action;
4. full-health bad trades, literal suicide, and weak chip attacks losing to a
   useful action, with a favorable-trade countervariant;
5. a sacrifice whose reducer-verified result alone saves an owned-city
   defender, with the decisive threat removed in the countervariant;
6. a two-hit lethal clear followed by legal hostile-city occupation and
   capture, with the follow-up removed in the countervariant;
7. distinct useful public approaches and objective reservations;
8. multi-unit Rally, Tend Wounded, recovery, and owned-Windmill staging;
9. Catapult range with a reachable land-form screen, Guard defense, and a
   Raider capture flank; embarked and naval pseudo-screens are rejected;
10. threatened-center training that cannot worsen Guard defense or delete the
    useful defender;
11. real land, naval-dock, and Land Grant competition under one city action,
    including first escort, first bombardment ship, sufficient escorts, and
    threatened-center defense; and
12. an executed capital corridor with at most eight missing Roads, decreasing
    missing count and producing a connection while scattered Roads lose.

The Field Defense breach exception is reserved but currently unreachable. No
revision-11 public combat preview can set `breachApplied`, so it is not counted
as implemented semantic evidence.

The scheduler scenario drains the same policy cold, synchronously, with budget
one, browser-like slices, interleaved work, reconstructed equal views, and
save/resume reconstruction. It asserts identical ordered candidate tuples and
selected commands, physical work accounting, and finite per-pass ceilings.
Cold and warm equal-view work counts may differ after an exact stable-fact
cache hit; both remain bounded and the results stay identical. The
browser `runSlice(milliseconds)` argument is only a yield threshold;
`advanceWork(workUnits)` is the deterministic operation-budget API.
Context preparation precedes spatial planning so the planner can omit only
preserved-building Redevelopments and Roads outside the next canonical
corridor tile. The original ready list still drives scoring. Frozen
no-corridor, next-Road, and useful basic-Redevelopment decisions retain their
complete pre-scheduling ordered-decision hashes.
Per-decision city, unit, stat, and actual MOVE-destination lookup preparation
is also incremental and charged. Combat and reveal caches are restricted to
the exact immutable public view and actual unit object; projected or
transformed objects use their own public facts. Focused countervariants keep
DISBAND on direct visible damage rather than cached next-turn reach and verify
transformed public combat stats in projected Knight scoring.

## Revision-13 Undead scenarios

`tests/unit/ruleset-v7-undead-ai.test.ts` adds the Undead semantic scenarios
(`pulp_wars-vkq.9`) on strictly parsed seed-2 arenas, each with a
countervariant where it matters:

1. Raise Dead of every adjacent Grave; occupied Graves are never offered;
2. a Necromancer moves beside a Grave cluster, then raises it; it never
   walks into lethal visible danger;
3. Devour heals a wounded Ghoul and denies a Grave near a hostile
   Necromancer; a full-HP Ghoul with no hostile Necromancer does not Devour;
4. Wail with a kill in radius; a Banshee moves to a better Wail first; no
   Wail against Undead-only units;
5. Lich target choice by visible splash;
6. Vampire Lifesteal in the attack value and a Zombie kill valuing the
   Infect rising;
7. Frenzy only when adjacent attackers can reach a visible enemy;
8. Restless retreat of a wounded unit into own territory (no Recover
   outside it);
9. a Human refusing a melee attack that feeds a Zombie while its ranged
   unit shoots the Zombie;
10. Necromancer target priority, higher beside raisable Graves;
11. Wail radius counted as threat only for a living viewer; and
12. identical cold, synchronous, and budget-one decisions on an Undead view,
    plus headless Undead-vs-Human and Undead-vs-Undead matches on several
    seeds and map types that reach an outcome without errors or stalls and
    use Raise Dead, Devour, Wail, and Frenzy.

The frozen benchmark below compares the pinned revision-11 policy with the
current one on two fixed all-Human public views; it is a performance and
decision-parity artifact, not a scenario suite, and its pinned baseline has
no Undead tactics to compare. Undead coverage therefore lives in the
semantic scenarios above, and the frozen benchmark is unchanged: all-Human
decisions are unaffected by the Undead gate.

## Frozen benchmark

Generate the checked benchmark with:

```text
npx tsx scripts/benchmark-ruleset7-tactical-ai.ts --output /tmp/pulp-wars-r11-tactical-benchmark.json
```

The checked [benchmark JSON](RULESET_7_TACTICAL_AI_BENCHMARK.json) records the
final local Node 24 run. Every policy/view pair produced a non-null command and
nonzero candidate count. Each policy/view measurement starts in a fresh child
process, records one genuinely cold decision, then records an immediate warm
budget-one physical-work probe for the revised policy, three warm synchronous
decisions, and a warm browser-like sliced decision. Every decision hash agrees
within its policy. Elapsed time is diagnostic and does not affect candidates,
scores, ordering, or ties.

| Public view           | Baseline / revised command (candidates) | Baseline / revised cold | Revised cold / warm work | Baseline / revised warm 3-run total | Baseline / revised warm sliced max |
| --------------------- | --------------------------------------- | ----------------------: | -----------------------: | ----------------------------------: | ---------------------------------: |
| retained command 1100 | Attack (30) / Attack (29)               |      49.977 / 43.552 ms |            3,639 / 1,440 |                  15.923 / 15.083 ms |                   3.299 / 3.465 ms |
| legal 25 by 25        | Field Defense (43) / Field Defense (28) |  1,598.548 / 481.321 ms |           35,621 / 5,816 |               2,077.016 / 49.721 ms |                 109.927 / 8.054 ms |

The legal 25 by 25 public-view hash is
`213a55e5a88f09e0b91186e654ff72c15c73214d94e7faa59856cf15f479cd40`.
Its revised decision used 374 generated candidates and planned 69 after the
two unconditional policy exclusions. It recorded 922 naval path expansions,
18 threat expansions, 80 replacement-path validations, and 84 Road expansions.
The declared ceiling was 13,251,203 work units; cold physical work was 35,621
and the immediate equal-view warm decision used 5,816. The
replacement ceiling derives from generated candidates times own units, cells,
and path-neighbor checks rather than a cells-only estimate. Constructor and
final tuple sorting remain finite setup/finish overhead and are not policy work
units. The baseline's synthetic-clock loop count is observational only and is
not presented as an equivalent path-expansion count.

Public-planning preparation remains the largest cold revised phase on the
dense view, but the policy no longer prepares spatial scores for commands it
will unconditionally discard. The bounded public stable-fact cache scans the
current view and reconstructs current candidate objects before reusing an
exact result, which accounts for the lower warm physical work above. The
planner's independently frozen exact-query, cache-key, and timing evidence is in
[Ruleset 7 public planning performance](RULESET_7_PUBLIC_PLANNING_PERFORMANCE.md).

## Comparison harness

Run the three-map focused comparison with:

```text
npx tsx scripts/validate-ruleset7-tactical-ai.ts --mode focused --output /tmp/pulp-wars-r11-tactical-focused.json
```

Run the authoritative fixed 24 paired games plus 12 natural games with:

```text
npx tsx scripts/validate-ruleset7-tactical-ai.ts --mode full --output /tmp/pulp-wars-r11-tactical-full.json
```

The full harness runs the unchanged 12 natural cases first, then the unchanged
24 paired cases, preserving both arrays in every later checkpoint. A narrow
single-case lifecycle diagnostic is available without making a full acceptance
claim:

```text
npx tsx scripts/validate-ruleset7-tactical-ai.ts --mode natural-diagnostic --output /tmp/pulp-wars-r11-tactical-natural-diagnostic.json
```

The harness checkpoints every completed game and retains structured failure
artifacts. A paired or natural non-outcome also writes its exact final state,
active actor, public view, round, command index, termination, and failure once
after the hot loop. Paired games classify outcome, round cap, wall cap, command
cap, and policy failure. Natural games permit outcome or round cap; wall,
command, rejection, non-advancing, stall, and allied-harm violations fail.
Equal-public-
view tests and the policy import boundary separately enforce privacy rather
than inferring hidden-information use from natural matches. A full result exits
nonzero unless the revised policy wins at least 14 of 24, wins more than
baseline, and satisfies every paired and natural validity gate.
Metrics are attributed per policy and distinguish prior-owner city losses from
neutral expansion, unique threatened-city saves from raw threat-pair changes,
raw nonlethal sacrifices from computed low-value attacks, and newly connected
Road city IDs from builds on an already connected network. Pinned-baseline
exact scheduler units and maximum decision work are unavailable and encoded as
`null`; synthetic loop counts or zero placeholders are not equivalent revised
path-work evidence.

## Final acceptance

The checked [full corpus](RULESET_7_TACTICAL_AI_CORPUS.json) is the complete
unchanged 24-paired plus 12-natural run. The source gate artifact SHA-256 is
`cca003ccc096050236c4a1ce849656759cf11929684a40733fffc8f7730684da`;
the semantics-identical formatted checked copy is
`03c5a35c3a7eece712c29c5676ef802817f0cfed7f16df3c46cbae35eb72b13f`.

The paired matrix passed with 17 revised-policy wins, five pinned-baseline
wins, and two round caps. Both caps were honestly retained: Archipelago seed
7312 revised seat 0 and seed 7313 revised seat 0 reached round 201. No paired
game ended by wall cap, command cap, rejection, stall, non-advancing command,
or structured policy failure.

The natural matrix passed with ten outcomes and two permitted round caps. The
three-AI Rival cases for seeds 0 and 6173 reached round 201; every other natural
case reached an outcome. Cooperative games recorded zero AI-on-AI hostile
commands, casualties, captures, and allied-territory path steps. All 36 games
used the published maps, seeds, current engine, 200-round limit, 30,000-command
limit, 128-command owner-turn limit, and 300-second wall safety cap. An earlier
host-load-contaminated run was superseded by this unchanged-policy,
unchanged-cap result.

The independent final profile also passed `npm run check` with 1,736 tests in
166 files, including build and headless golden validation, the Ruleset-6
release corpus, current browser smoke, and a fresh tactical benchmark with the
checked decision hashes. These results satisfy the finite revision-11
acceptance contract for the frozen corpus; they do not claim universal strength
outside these maps, seeds, and caps.
