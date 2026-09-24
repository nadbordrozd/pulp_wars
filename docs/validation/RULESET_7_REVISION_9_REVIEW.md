# Ruleset 7 revision 9 runtime review

**Runtime:** `pulp-wars-poc-7r9`

This focused review exercises revision-9 behavior through public player views,
the shipped DOM, the production Canvas host, and reducer-backed dispatch. It is
an integration review for the current runtime, not a replacement for the full
release profile or frozen historical corpora.

Run against the local game server:

```bash
CHROME_PATH=/path/to/chrome-headless-shell \
  npx tsx scripts/browser-revision9-review-v7.ts \
  --output /tmp/pulp-wars-r9-review
```

The command starts from strict fixtures and requires accepted public actions for
Cultivate, Rally, Tend wounded, a full-capacity Land Grant, an occupied Port to
Shipyard upgrade, discounted naval training, and a three-attack Knight Overrun
chain. It also checks the compact tactical dock, accepted Knight and Shipyard
art, actual discount event fields, and Dry Land's three disabled Naval cards.

The isolated output contains `revision9-runtime.json` plus screenshots for the
Knight Overrun dock, Captain support actions, Inspired and Tended recipients,
combined and three-status compact docks, an occupied active Shipyard with its
preserved resource and discount, and the Dry Land Naval tree. `status: PASS` is
written only after all engine, public DOM, Canvas, visible dock-layout, and
screenshot assertions succeed.

Worker-focused deterministic coverage is:

```bash
npm test -- tests/unit/ruleset-v7-*.test.ts \
  tests/unit/persistence-v7.test.ts \
  tests/unit/persistence-browser-v7.test.ts \
  tests/unit/ruleset7-presentation.test.ts \
  tests/unit/ruleset7-ui-assets.test.ts \
  tests/unit/technology-tree-layout-v7.test.ts \
  tests/unit/board-renderer-v7.test.ts \
  tests/integration/ruleset7-*.test.ts
npm run typecheck
```

Final release acceptance additionally runs the repository's cross-cutting
Ruleset 7, Ruleset 6, art, browser, legacy, audit, and formatting gates. Frozen
release corpora are never refreshed merely to rename revision identity.
