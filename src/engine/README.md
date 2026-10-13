# Deterministic engine

`src/engine` is the authoritative, DOM-independent simulation boundary. Its
public API is exported by `index.ts`; browser, headless, and AI callers should
not reach through that boundary to internal modules.

The engine implements one game, Ruleset 7. Its rules are specified in
[Ruleset 7: current rules](../../docs/product/RULESET_7_CURRENT.md) and live
in `v7/` with their numbers in `rules/ruleset-v7.ts`. The shared pieces
beside them are small: entity ids (`model/ids.ts`), deep freezing
(`model/freeze.ts`), the seeded generator (`random/random.ts`), canonical JSON
and hashing (`replay/canonical.ts`) and UTF-8 encoding (`encoding/utf8.ts`).

The earlier prototypes, the legacy ruleset-5 engine and Ruleset 6, were
retired with bead `pulp_wars-lky5` and their code is gone. One function of
the Ruleset 6 map generator is still used and kept its name:
`placeTreasureChestsV6` in `v7/treasure-placement.ts` draws the treasure
chests of a Ruleset 7 map with the same samples as before.

Deterministic additions must use `nextUint32`/`nextBounded`, explicitly sort
candidate collections before sampling, allocate city/unit IDs from the shared
`nextEntityId`, and use `canonicalJson`/`canonicalHash` for checkpoints. Keep
wall clock, storage, localization, Canvas, and DOM dependencies outside this
directory; `tsconfig.engine.json` enforces an ES-only compilation surface.
