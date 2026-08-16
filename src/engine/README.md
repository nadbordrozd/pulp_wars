# Deterministic engine scaffold

`src/engine` is the authoritative, DOM-independent simulation boundary. Its
public API is exported by `index.ts`; browser, headless, and future AI callers
should not reach through that boundary to internal modules.

Match creation constructs the supported seeded land maps, reserves settlement
centers as Grass, then assigns exactly 18% of the non-settlement tiles as
Mountain and 24% as Forest from one stable shuffle. Resources are drawn in
settlement/neighbor coordinate order with terrain-specific thresholds: Fruit on
Grass, Ore on Mountain, and Animal on Forest. They occur only in territories.
Every settlement has at least two distinct, immediately controllable adjacent
opportunities; there is no fixed upper or per-type quota. Every valid map has at
least one Animal, connected capitals through Grass or Forest, and four
non-Mountain capital neighbors. Map generation is bounded to 256 deterministic
candidates and reports stable failure context without weakening constraints.
Capital assignment and turn order use their own stable shuffles in the specified
v4 draw order, and `aiMode` never changes the board.

The ruleset-4 target supports square sizes 11, 14, 16, explicit Large 20, and
explicit Huge 25. Auto remains 11/14/16 for 1/2/3 AI. Large generates 20
settlements and 72 mountains; Huge generates 30 settlements and 113 mountains.
Their neutral-village counts derive only on their explicit size paths.

Commands use shared pure eligibility predicates for both legal enumeration and
transactional application. Fruit harvesting, Animal hunting, explicit-ore
Mines, empty-Forest Lumber Mills, uncapped city growth, level-based non-exempt
training, movement, combat, Wait, recovery, promotion, capture, cooperative
relationships, and turn lifecycle reducers apply effects in stable event order,
freeze the next state, and increment `commandIndex` exactly once. Lumber Mills
and Mines remain on captured territory. Forest movement ends on entry; Archery
grants Forest defenders the greater 3/2 defense multiplier. Every ordinary
starting capital Warrior carries a durable capacity exemption; legal
over-capacity acquired states are preserved. Rejected commands retain the
identical state object and consume no randomness.

The v4 schemas use ruleset `pulp-wars-poc-4`. Save/replay versions 1 through 3
are deliberately incompatible; loaders report that incompatibility without
rewriting stored bytes or attempting migration.

Default Vitest keeps the seed-zero canonical board hashes and a bounded paired
10-seed smoke across all twelve supported size/AI configurations. The complete
9,300-input, 18,600-board Rival/Cooperative corpus is an explicit validation
gate so ordinary `npm test` stays within its roughly 60-second host target:

```sh
npm run validate:v4-map
```

Its checked evidence is
[`POC_V4_MAP_CORPUS.json`](../../docs/validation/POC_V4_MAP_CORPUS.json).

The bounded complete-match Normal-policy corpus, including Mathematics and
positive Catapult training/attack/kill participation, is checked in at
[`POC_V4_AI_CORPUS.json`](../../docs/validation/POC_V4_AI_CORPUS.json).

Deterministic additions must use `nextUint32`/`nextBounded`, explicitly sort
candidate collections before sampling, allocate city/unit IDs from the shared
`nextEntityId`, and use `canonicalJson`/`canonicalHash` for checkpoints. Keep
wall clock, storage, localization, Canvas, and DOM dependencies outside this
directory; `tsconfig.engine.json` enforces an ES-only compilation surface.
