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
   acceptance criteria, and dependencies, then claim it.
4. Spawn exactly one fresh worker for that bead using model `gpt-5.6-sol` with
   `reasoning_effort=high`. Tell the worker not to spawn subagents.
5. Wait synchronously for that worker to finish. Never run implementation
   workers in parallel unless the user explicitly requests parallel work.
6. Review the result, inspect the diff and outputs, and run validation
   appropriate to the change. A correction pass for the same bead may go back
   to its worker; the next bead gets a fresh worker.
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

## Worker Contract

Each worker receives one bead and must stay within it. The worker must read the
relevant agent instructions, bead, and project documentation before changing
files; preserve unrelated user work; implement the task; run focused checks;
and report changed files, validation, remaining concerns, and discovered
follow-up work to the orchestrator. Workers must not commit, push, sync Beads,
close beads, or spawn their own agents unless the user explicitly changes this
policy.

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
every completed task or bead, the root orchestrator must:

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
