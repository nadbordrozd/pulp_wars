# Pulp Wars Agent Instructions

Pulp Wars is a new game project: a Polytopia-style strategy game. The project is
being developed in parallel with Vibes and Magic, but it is an independent
codebase and tracker. Do not copy requirements, architecture, assets, or rules
from that project unless the user explicitly asks for it.

## Operating Model

The user works with the root Codex agent as the orchestrator. The orchestrator
owns task decomposition, Beads state, delegation, review, and validation. It
does not implement game code, assets, documentation, or fixes itself; it
delegates each implementation bead to a worker.

When the user asks to begin or continue work, the orchestrator must:

1. Run `bd prime`, then inspect in-progress, ready, and blocked work.
2. Resume an actionable in-progress leaf first; otherwise choose the
   highest-priority unblocked actionable leaf.
3. Create or refine the bead before implementation, with concrete scope,
   acceptance criteria, dependencies, and an assigned validation profile, then
   claim it.
4. Spawn exactly one fresh worker for that bead using model `gpt-5.6-sol` with
   `reasoning_effort=high`. Tell the worker not to spawn subagents.
5. Wait synchronously for that worker to finish. Never run implementation
   workers in parallel unless the user explicitly requests parallel work.
6. Independently review the result, inspect the diff and outputs, and run the
   assigned validation profile once after review. A correction pass for the
   same bead may go back to its worker; the next bead gets a fresh worker.
7. Close the bead only when its acceptance criteria pass.
8. Immediately stage only that bead's reviewed, validated scope, commit it
   directly on `main`, and push it with `git push origin main`. Do not select or
   delegate the next bead until the push succeeds.

The orchestrator may create ad hoc beads when implementation reveals required
work. Separate concerns into separate beads and record dependencies rather than
silently expanding a worker's scope. Workers may inspect Beads, but the
orchestrator owns claiming, closing, dependency changes, and durable project
memory unless it explicitly delegates a tracker operation.

Do not create a gameplay backlog merely because the repository is empty. Build
the queue from user direction and established project documentation. When a
material product or art decision is missing, record the blocker and ask the
user instead of inventing a lasting direction.

## Risk-Based Validation

Assign one profile in the bead before delegation. Record the exact focused
tests expected from the worker and any conditional gates that apply. The
profiles below are ordered from lower to higher risk; mixed-scope work uses the
highest applicable profile and also keeps any domain-specific gate from a lower
profile, such as `art:validate`. If the scope grows, update the bead and profile
before continuing.

Use this compact block in the bead design or notes:

```text
Validation profile: <profile>
Worker focused checks: <exact commands>
Conditional final gates: <exact commands and trigger, or none>
```

Every profile includes independent root review of the final diff, generated or
changed outputs, `git status --short`, and `git diff --check`. The root verifies
scope, test adequacy, repository hygiene, and that no credential, secret,
generated secret material, or unrelated user work is present. Changed visuals
receive root visual review at their intended size and enlarged where pixel art
is involved. These reviews are never delegated away.

| Profile                 | Scope                                                                                                                                                                             | Final gates run by the root after review                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/tracker`          | Beads-only changes and prose, decision, or workflow documentation with no runtime effect                                                                                          | For changed Markdown, JSON, or YAML files, `npx prettier --check <changed-files>`; verify changed local links and command examples; `git diff --check`. A Beads-only change omits the file-format command.                                                                                                                                                                                                                                                                                                                                                                       |
| `asset-only`            | Raster assets, asset manifests, generation recipes, and review evidence with no runtime behavior change                                                                           | `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run art:validate`, and `npm test -- tests/unit/*assets*.test.ts tests/unit/unit-scale-contract.test.ts`. Run the applicable checked-in review command and inspect its evidence: `npm run art:ruleset6-terrain-review`, `npm run art:ruleset6-building-road-review`, `npm run art:ruleset6-original-unit-review`, `npm run art:ruleset6-candy-unit-review`, or `npm run art:ruleset6-tech-economy-ui-review`; use the corresponding named `art:*review` script in `package.json` for another established class. |
| `ui/presentation`       | DOM, Canvas, layout, input, accessibility, animation, or presentation behavior                                                                                                    | `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test -- tests/unit/*presentation*.test.ts tests/unit/*render*.test.ts tests/unit/*ui*.test.ts tests/unit/*geometry*.test.ts tests/unit/technology-tree-layout-v6.test.ts tests/integration/*canvas*.test.ts tests/integration/*dom*.test.ts tests/integration/ruleset6-browser-controller.test.ts`, and `npm run build`. Add `npm run smoke:browser` under the browser threshold below.                                                                                                                        |
| `engine/rules`          | Commands, combat, economy, technology, turn logic, public queries, or other deterministic rules                                                                                   | `npm run check`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `ai/map/persistence`    | AI policy or scheduling, map generation, PRNG use, headless simulation, save/replay/schema, or compatibility                                                                      | `npm run check` and `npm run validate:ruleset6-release`. Add browser or legacy smoke under the thresholds below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `cross-cutting/release` | Changes spanning multiple high-risk domains; dependency, lockfile, toolchain, build/deployment, CI, or security-boundary changes; release candidates; and final integration epics | Run the release commands in `docs/validation/RULESET_6_RELEASE.md`: `npm run validate:ruleset6-release`, `npm run art:validate`, all nine listed Ruleset 6 `art:*review` commands, `npm run smoke:browser`, `npm run smoke:browser:legacy-v5`, and `npm run check`; also run `npm audit --audit-level=high` and `git diff --check`.                                                                                                                                                                                                                                              |

For `asset-only`, the bead must name its applicable `art:*review` command
before delegation. The complete Ruleset 6 art-review set required by
`cross-cutting/release` is:

```text
npm run art:ruleset6-terrain-review
npm run art:ruleset6-building-road-review
npm run art:ruleset6-original-unit-review
npm run art:ruleset6-candy-unit-review
npm run art:ruleset6-tech-economy-ui-review
npm run art:ruleset6-renderer-review
npm run art:ruleset6-host-review
npm run art:ruleset6-combat-review
npm run art:ruleset6-shell-review
```

Browser and audit gates are risk-triggered, not routine extras:

- `npm run smoke:browser` is required for a user-visible runtime UI change,
  Canvas or input change, responsive/accessibility/navigation flow change, or a
  save/resume or AI-turn lifecycle change observable in the browser.
- `npm run smoke:browser:legacy-v5` is required when legacy loading,
  compatibility routing, schema handling, or the release profile is involved.
- `npm run validate:ruleset6-release` is required for the
  `ai/map/persistence` and `cross-cutting/release` profiles. Its `:refresh`
  variant is never a routine gate; use it only when an approved change
  intentionally replaces the checked release corpus and review that diff.
- `npm audit --audit-level=high` is required for dependency/lockfile,
  toolchain, security-boundary, and release-profile work. CI is unchanged by
  this policy.

The worker owns focused implementation checks while iterating and reports their
exact commands and results. The root owns the independent review and final
profile gates. Do not ask a worker to repeat `npm run check`, a release corpus,
the complete browser smoke, or an audit unless the bead explicitly delegates
that gate for a concrete reason. After a correction, the worker reruns the
affected focused tests; once review is clean, the root runs one clean final
profile gate. A failed final gate followed by a correction does not justify
stacking unrelated broad reruns.

Size beads as coherent, independently reviewable and releasable outcomes. Keep
their implementation, tests, and directly supporting documentation together;
do not create gratuitous micro-beads merely to split validation or publication.
Separate work when concerns, dependencies, reviewability, or risk genuinely
diverge. When the final child completes all remaining acceptance criteria of
its parent epic, the root may close both after validation and publish the child
plus tracker closures in one commit and push, provided the parent adds no
unvalidated scope.

The root records an unexpected, actionable validation catch as a comment on the
active bead so later gate pruning is evidence-based. Use:

```text
bd comments add <id> 'VALIDATION_CATCH detector="<worker-focused|root-diff|root-profile:PROFILE|browser|audit>" defect="<what was wrong>" regression="<test/evidence added, or none>" follow_up="<bead-id, or none:fixed-here>"'
```

Do not log ordinary expected red/green iteration. If the defect is not fixed in
scope, create the follow-up bead and put its ID in `follow_up`.

## Worker Contract

Each worker receives one bead and must stay within it. The worker must read the
relevant agent instructions, bead, and project documentation before changing
files; preserve unrelated user work; implement the task; run focused checks;
and report changed files, validation, remaining concerns, and discovered
follow-up work to the orchestrator. Workers do not routinely run broad or full
suites; the bead must explicitly delegate one when needed. Workers must not
commit, push, sync Beads, close beads, or spawn their own agents unless the user
explicitly changes this policy.

## Documentation and Decisions

Read established project documentation before implementation. Treat explicit
project specs and recorded decisions as authoritative over assumptions and
existing code. Keep product rules, architectural decisions, and acceptance
criteria explicit and testable. If implementation and documentation disagree,
stop and surface the conflict rather than choosing silently.

## PixelLab Asset Workflow

Production graphics are created with PixelLab. Asset-generating agents must use
checked-in programmatic scripts that call PixelLab; never use a PixelLab MCP
connector or create production assets through an interactive/manual-only
workflow. Keep credentials in environment variables, never in source, prompts,
logs, or Beads.

Art direction has two levels:

- `docs/art/ART_DIRECTION.md` is the single general direction shared by every
  visual asset.
- `docs/art/classes/<asset-class>.md` contains additional constraints for a
  class such as units, terrain tiles, buildings, effects, portraits, or UI.

Class guidance may specialize but must not contradict the general direction.
These documents do not exist yet because the user will provide the direction
later. Do not generate production art or invent canonical styling until the
relevant direction is approved and recorded.

Asset scripts must make generation reproducible: preserve prompts, negative
prompts, dimensions, model/settings, seeds when supported, and output mapping
in code or a manifest. Generate a small initial sample for each asset class and
inspect every result visually at native scale and enlarged scale. Check the
class-specific needs plus silhouette, readability, composition, palette,
lighting, transparency, edge quality, consistency, and technical dimensions;
for tiles also check seamless adjacency and map-level repetition.

A successful generation request is not acceptance. Reject and regenerate or
adjust the script when an asset is ugly, unclear, inconsistent, technically
wrong, or outside the art direction. Only batch a class after its first few
assets (normally at least three) have passed individual visual review and the
recipe is stable. Review batch results as a contact sheet and inspect suspected
failures individually. The worker performs this generate-inspect-iterate loop,
and the orchestrator reviews the accepted outputs before closing the bead.

## Git and Handoff Policy

The user's standing instruction is to always publish completed work. After
every completed task or bead, subject only to the final-child/parent-epic
exception above, the root orchestrator must:

1. Run the relevant quality gates, review the diff and outputs, and verify the
   intended scope contains no credentials, secrets, generated secret material,
   or unrelated user work.
2. Ensure the work is being published from the local `main` branch, stage only
   the reviewed task scope, and create a focused commit directly on `main`.
3. Push that commit with `git push origin main` and verify that `origin/main`
   resolves to the committed revision.

This commit-and-push sequence is mandatory and does not require the user to
repeat the instruction in a later conversation. A task must not be handed off
as complete, and work on the next bead must not begin, until its push succeeds.
If a push fails, preserve the retryable local commit, surface the exact failure,
resolve safe retryable causes where possible, and retry; never silently treat a
failed push as completion. Do not force-push or rewrite shared history unless
the user explicitly requests it.

Workers still must not commit or push; publication remains the root
orchestrator's responsibility after review and validation. Git publication does
not authorize `bd dolt push`, opening a pull request, exposing credentials, or
including unrelated changes. Before handoff, run `git status`, update Beads
accurately, and report the commit, push verification, checks, bead status, and
any remaining blockers.

<!-- BEGIN BEADS CODEX SETUP: generated by bd setup codex -->

## Beads Issue Tracker

Use Beads (`bd`) for durable task tracking in repositories that include it. Use the `beads` skill at `.agents/skills/beads/SKILL.md` (project install) or `~/.agents/skills/beads/SKILL.md` (global install) for Beads workflow guidance, then use the `bd` CLI for issue operations.

### Quick Reference

```bash
bd ready                # Find available work
bd show <id>            # View issue details
bd update <id> --claim  # Claim work
bd close <id>           # Complete work
bd prime                # Refresh Beads context
```

### Rules

- Use `bd` for all task tracking; do not create markdown TODO lists.
- Run `bd prime` when Beads context is missing or stale. Codex 0.129.0+ can load Beads context automatically through native hooks; use `/hooks` to inspect or toggle them.
- Keep persistent project memory in Beads via `bd remember`; do not create ad hoc memory files.

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.
<!-- END BEADS CODEX SETUP -->
