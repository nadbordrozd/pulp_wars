# Ruleset 7 revision 5: research and achievements

**Status:** authoritative overlay for the current `pulp-wars-poc-7r5` runtime. This document supersedes earlier Ruleset 7 achievement, Monument placement UI, and save identity rules. The [revision 4 biome and economy contract](RULESET_7_REVISION_4_BIOME_ECONOMY.md) remains authoritative for all other changed domains; the [baseline](RULESET_7.md) supplies unchanged rules.

## Research and milestones

Every player starts with three locked, unspent entitlements in canonical order: `EXPLORER`, `ENGINEER`, `MUSTER`. An achievement can complete only after its enabling technology is researched. Progress earned before or during research counts immediately; research does not reset a baseline counter.

| Achievement | Enabling technology | Completion condition                                                                                                                                                                                |
| ----------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Explorer    | Scouting            | At least 100 distinct tiles in that player's explored set.                                                                                                                                          |
| Engineer    | Engineering         | One currently owned qualifying processor has an individual final live population output of at least 6. The qualifying processor classes and output calculation remain as specified in the baseline. |
| Muster      | Drill               | At least four distinct living trainable unit roles currently owned simultaneously. Reward only Juggernaut does not count.                                                                           |

After each accepted transition that can affect progress, including research itself, evaluate still locked entitlements in canonical order. Completion is personal and permanent. Each completion emits one `ACHIEVEMENT_UNLOCKED` event in the same accepted batch; no replayed event is created by loading a save. An entitlement remains spent after its Monument is removed or captured. Canonical state, event, command, save, and replay readers accept `EXPLORER` as an achievement and Monument provenance. Owner safe progress exposes the viewer's explored tile count and existing Engineer and Muster counts; opponents' entitlements and progress remain hidden.

## Reward and placement interface

Each personal completion enters an ordered accessible popup queue exactly once during the live browser session. Simultaneous completions appear separately in event order. A mandatory city reward has priority; completion popups wait until its choices are resolved. The queue is transient presentation state and does not replay historical achievements on resume. Each popup explains that the shared Monument can be built from an eligible owned tile and returns focus when dismissed. The board does not accept input while a popup is open. The Achievements modal is read only and exposes the three milestones, exact progress, and locked, available, completed, or spent state for debugging.

On an eligible selected owned tile, each unlocked, unspent entitlement appears as its own illustrated `Build Monument` action labeled with its achievement. Activating that action directly dispatches the matching `BUILD_MONUMENT { achievement, at }`. No separate achievement to map targeting mode is used. The existing placement gates, 0 Coin cost, +3 live population, one Monument per city, capture provenance visibility, and one time spending semantics remain in force. AI uses the same offered command set.
Three achievements can fund at most three placements per player; captured Monuments do not consume the captor's entitlements.

## Revision identity and compatibility

The exact ruleset ID is `pulp-wars-poc-7r5`. Numeric command, event, state, save, and replay versions remain 7. Browser autosave reads and writes only `pulpWars.save.v7r5.current`. On current route startup, remove the known incompatible prototype keys `pulpWars.save.v7.current`, `pulpWars.save.v7r2.current`, `pulpWars.save.v7r3.current`, and `pulpWars.save.v7r4.current`. Preserve the Ruleset 6 save, shared settings, and unrelated storage. Earlier revision 7 saves and replays are incompatible; no migration is performed.
