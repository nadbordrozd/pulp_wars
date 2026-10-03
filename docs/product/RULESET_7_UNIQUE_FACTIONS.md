# Ruleset 7: every player plays a different faction

**Status:** contract and implementation record (`pulp_wars-w5j.1`, epic
`pulp_wars-w5j`). It is a short overlay over
[Ruleset 7: current rules](RULESET_7_CURRENT.md), and it is **folded into
[section 2.1 of the current rules](RULESET_7_CURRENT.md#21-match-setup)**
(the setup table and the faction-choice bullet) and
[section 2.5](RULESET_7_CURRENT.md#25-showcase-setup) in the same change; the
current rules win wherever this document differs.

**Ruleset ID:** `pulp-wars-poc-7r29`, the next free identity after the Rift
terrain's `pulp-wars-poc-7r28`. The identity changes because the set of
legal setups changes; no state, command, event, or view shape changes.

**Scope:** the user's request of 2026-10-03, "We have enough factions now
that we can enforce that every player plays a different faction." With six
factions (seven and eight to come) and at most four seats, every seat count
always has a legal assignment.

## 1. The rule

In a match, **no two seats may play the same faction**: `setup.factions`
has no repeated entry. It applies to every map type, the
[Showcase](RULESET_7_CURRENT.md#25-showcase-setup) included, to every seat
count, and to `RIVAL` and `COOPERATIVE` modes alike. Every other setup rule
is unchanged.

## 2. Engine

- `validateMatchSetupV7` (`src/engine/v7/setup.ts`) checks the rule after
  the shape checks. A setup with a repeated faction is refused with
  **`DUPLICATE_FACTION`**, params `{ faction, seats }`: the first repeated
  faction in seat order and every seat that chose it, ascending. Every other
  refusal stays `INVALID_SETUP`. `parseMatchSetupV7` returns null for both.
- `generateInitialMapV7`, `generateInitialMapWithVillageCountV7`,
  `createInitialMapStateV7`, and `createPlayableGameV7` report the same
  error; `createReplayV7` throws `RangeError("DUPLICATE_FACTION")`; a state,
  replay, or save whose setup repeats a faction does not parse.
- `distinctFactionsV7(seatCount, preferred)` is the one deterministic
  assignment that setup defaults, the headless tools, and the browser use:
  seats keep their preferred faction in seat order, and a seat whose
  preference is missing or already taken by an earlier seat gets the first
  untaken faction in registration order (`FACTION_IDS_V7`). With no
  preference the seats play Human, Undead, Goblin, and Dinosaur.
- Saves under an earlier identity are refused by the identity rules, so no
  migration exists.

## 3. Headless and test mirror matches

Mirror matches (Human v Human, the balance matrix's `HH`, `UU`, `GG`, `DD`,
`MM`, `II`, the four-seat mixes that repeat a faction) remain a tool. A setup
may carry the optional **`allowDuplicateFactions: true`** (no other value),
which lifts the rule for that setup only; `allowDuplicateFactionsV7(setup)`
adds it. It is **headless and test only**:

- the browser setup never builds it, so the browser never writes a save
  that carries it; the browser controller refuses a launch whose setup
  carries it (`INVALID_SETUP`) and refuses to resume such a save (the
  save-recovery screen, `CORRUPT`: "Saved match repeats a faction; every
  player must play a different faction.");
- the save and replay formats themselves (`createSaveEnvelopeV7`,
  `parseSaveV7`, `runReplayV7`) are also test and headless tools and carry
  the option unchanged, so a mirror replay or save round-trips in tests;
- the headless CLI enforces the rule by default (a repeated `--factions`
  value is an error) and passes the option only with
  `--allow-duplicate-factions`; `runAiBatchV7` takes
  `allowDuplicateFactions: true` for its `factions`
  ([headless simulation](../architecture/HEADLESS_SIMULATION.md)).

## 4. Setup screen

- The **Factions** group says "Every player plays a different faction.
  Take an opponent's and they switch to a free one."
- "Your faction" offers every faction. In each opponent's select the
  factions the other shown seats play are disabled.
- The defaults are distinct: Human, Undead, Goblin, Dinosaur for seats 0–3.
  Seats keep their choice in seat order, the human first: when the human
  picks the faction an opponent plays, or the opponent count grows, a seat
  whose faction an earlier seat now plays takes the first untaken faction
  (`distinctFactionsV7`). The AI seats are therefore always distinct, and
  every seat count from 2 to 4 always has a legal assignment. The Showcase
  uses the same selects.
- [Screen flow](../ui/SCREEN_FLOW.md#current-ruleset-7-unique-factions-overlay)
  records the interaction.
