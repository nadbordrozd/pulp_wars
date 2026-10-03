# Ruleset 7 revision 21: four more achievements

**Status:** contract and implementation record (`pulp_wars-9s0.4`). It is an
overlay over [revision 20](RULESET_7_REVISION_20.md) (`pulp-wars-poc-7r20`),
which amends the [revision-19 Dinosaur overlay](RULESET_7_REVISION_19_DINOSAURS.md)
over [Ruleset 7: current rules](RULESET_7_CURRENT.md). It replaces the
achievement list of the [revision-5 overlay](RULESET_7_REVISION_5_ACHIEVEMENTS.md);
the Monument rules there are unchanged. `pulp_wars-c87.9` **folded it into
[section 5 of the current rules](RULESET_7_CURRENT.md#5-achievements-and-monuments)
(kept as history)** at `pulp-wars-poc-7r23`; the current rules win wherever
this document differs.

**Ruleset ID:** `pulp-wars-poc-7r21`

**Map-generation revision:** `REGIONAL_BIOMES_NAVAL_V2` (unchanged)

**Scope:** the user's request of 2026-10-02, "come up with a couple more
achievements" (epic `pulp_wars-9s0`). Four achievements join Explorer,
Engineer, and Muster: **Conqueror**, **Land Baron**, **Sea Dog**, and
**Slayer**. They reward aggression, expansion, naval play, and keeping a
veteran alive, none of which the three older achievements reward. Every
unmentioned rule stays in force.

## 1. Identity and compatibility

| Boundary                                   | Revision-21 value                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| Ruleset                                    | `pulp-wars-poc-7r21`                                                           |
| Game-state schema                          | `7`                                                                            |
| Command/event/save/replay numeric versions | `7`                                                                            |
| Browser autosave                           | `pulpWars.save.v7r21.current`                                                  |
| Map revision                               | `REGIONAL_BIOMES_NAVAL_V2`                                                     |
| Factions, trees, bindings, display names   | unchanged (four factions)                                                      |
| `ACHIEVEMENT_IDS_V7`                       | seven: the revision-5 three, then the four of [section 2](#2-the-achievements) |
| `PlayerStateV7.achievementEntitlements`    | seven entries, in `ACHIEVEMENT_IDS_V7` order                                   |
| `PlayerViewV7.achievementProgress`         | seven entries, in the same order                                               |
| `COMMAND_KIND_ORDER_V7`                    | unchanged (45 kinds)                                                           |
| `DOMAIN_EVENT_KIND_ORDER_V7`               | unchanged (72 kinds)                                                           |

- The identity must change: a state holds seven entitlements per player
  instead of three, `BUILD_MONUMENT` and `ACHIEVEMENT_UNLOCKED` accept four
  more achievement ids, and a revision-20 command stream is not replayable
  once a new achievement unlocks (the event list and the offered Monument
  commands differ).
- `pulp-wars-poc-7r20` is appended to `PRIOR_RULESET_7_IDS` (gap-free). A
  revision-21 reader rejects it and every earlier Ruleset 7 identity in
  setups, states, saves, replays, and release artifacts; there is no
  migration.
- Current-route startup deletes the known obsolete Ruleset 7 autosave keys,
  now through `pulpWars.save.v7r20.current`, and preserves the Ruleset 6 save,
  settings, the art-set preference, and unrelated storage.
- No key is added to or removed from `GameStateV7`, a player, a unit, or a
  city. The only shape changes are the two seven-entry lists above and the
  wider achievement id set.

## 2. The achievements

| Name       | ID           | Requires | Condition                                                                              | Reward       |
| ---------- | ------------ | -------- | -------------------------------------------------------------------------------------- | ------------ |
| Conqueror  | `CONQUEROR`  | —        | the player captures a city owned by another player (1 capture)                         | one Monument |
| Land Baron | `LAND_BARON` | —        | the player owns at least 5 cities at once                                              | one Monument |
| Sea Dog    | `SEA_DOG`    | —        | the player has at least 3 naval units (Patrol Boat or Battleship) on the board at once | one Monument |
| Slayer     | `SLAYER`     | —        | one of the player's units on the board has at least 5 kills                            | one Monument |

One-line descriptions, as shown to the player:

- **Conqueror:** "Capture an enemy city."
- **Land Baron:** "Own 5 cities at once."
- **Sea Dog:** "Own 3 warships at once."
- **Slayer:** "Get 5 kills with one unit."

The numbers are the engine constants `CONQUEROR_CAPTURES_V7` (1),
`LAND_BARON_CITIES_V7` (5), `SEA_DOG_SHIPS_V7` (3), and `SLAYER_KILLS_V7` (5)
in `src/engine/v7/achievements.ts`.

### 2.1 Exact conditions

- **Requires.** The four have no enabling technology
  (`ACHIEVEMENT_REQUIRED_TECH_V7` is `null` for each). Explorer, Engineer, and
  Muster keep Scouting, Engineering, and Drill.
- **Conqueror.** An accepted `CAPTURE` whose city had an owner other than the
  capturing player (`CITY_CAPTURED.from` is not `null`). Capturing a neutral
  village does not count. Recapturing a city the player lost counts, because
  the city is another player's when it is taken. The capture that eliminates
  a player, or that ends the match, counts. Conqueror has no stored counter:
  the entitlement's `unlocked` flag is the record, and the progress is 1 when
  it is set and 0 otherwise. A capture is the only way to gain another
  player's city, so no other command can complete it.
- **Land Baron.** The number of cities whose `ownerId` is the player, the
  capital included, however they were gained (founded from a village or
  captured).
- **Sea Dog.** The number of the player's units on the board (HP above 0)
  with `form` `NAVAL`. An embarked land unit is `EMBARKED` and does not count.
  A Dry Land match has no water and no Naval research, so Sea Dog cannot be
  completed there.
- **Slayer.** The largest `kills` value among the player's units on the board.
  Kill credit is the existing rule: attack kills, retaliation kills, and
  hostile splash kills count; explosions credit no unit; a rising (Zombie,
  Skeleton) starts at 0; an Egg has 0. Kills by different units do not add
  up. A Dinosaur unit's growth and another faction's Promotion use the same
  counter and do not reset it.
- **All factions.** No condition names a role, a technology, a training
  command, or a faction rule. Dinosaurs (Eggs), Goblins (Plunder, no unit
  credit for explosions), and Undead (risings) capture cities, own cities,
  build Patrol Boats and Battleships, and earn unit kills by the same rules
  as Humans.
- **Permanent, once.** Unlocking is personal and permanent, as in revision 5:
  an entitlement that is unlocked stays unlocked when the count later drops
  (a city is lost, a ship sinks, the veteran dies), and each achievement
  unlocks at most once per player per match.

### 2.2 Reward

Each of the four is an ordinary entitlement: once unlocked and unspent it
funds one `BUILD_MONUMENT { achievement, at }` under the unchanged Monument
rules (0 Coins, +3 live population, an explored owned land tile with no site,
resource, improvement, or treasure, Mountain needs Engineering, at most one
Monument per city, no siege or pending reward; a spent entitlement stays
spent; a captured Monument keeps its +3 for the captor and spends nothing of
the captor's). A player can therefore place at most seven Monuments in a
match and never more than one per owned city.

## 3. Evaluation and events

- Achievements are evaluated where they already were: for the acting player
  at the end of every accepted command that already evaluated them, and for
  the incoming player at the end of its Start Turn. Revision 21 adds no
  evaluation point.
- Locked entitlements are checked in canonical order (`EXPLORER`, `ENGINEER`,
  `MUSTER`, `CONQUEROR`, `LAND_BARON`, `SEA_DOG`, `SLAYER`). Each one that
  qualifies emits one `ACHIEVEMENT_UNLOCKED { playerId, achievement }` in
  that order, in the same accepted batch, at the position the achievement
  events already had (after the economy and reward-settlement events; in a
  `CAPTURE`, before `PLAYER_ELIMINATED` and `MATCH_ENDED`).
- **Conqueror** is evaluated only in the `CAPTURE` that takes another
  player's city. A hostile capture that brings the player to 5 cities emits
  Conqueror, then Land Baron.
- **Only the acting player is evaluated in a command.** A unit that earns its
  fifth kill by retaliation during another player's turn completes Slayer at
  its owner's next Start Turn, if it is still on the board then.
- The event is projected as before: only its owner receives it. Opponents see
  neither entitlements nor progress.
- Loading a save replays no event.

## 4. State, commands, queries, and schema

- `ACHIEVEMENT_IDS_V7` is `EXPLORER`, `ENGINEER`, `MUSTER`, `CONQUEROR`,
  `LAND_BARON`, `SEA_DOG`, `SLAYER`. Command ordinals use this order, so the
  three older ids keep their ordinals.
- A new seat has seven locked, unspent entitlements. The state parser
  requires exactly seven entries in canonical order, rejects `spent` without
  `unlocked`, and requires the enabling technology only for the three
  achievements that have one.
- `PlayerViewV7.achievementProgress` keeps the three older entries unchanged
  and appends `{ achievement, current, required }` for the four new ones.
- `BUILD_MONUMENT`, `MONUMENT_BUILT`, the Monument population source, and
  `ACHIEVEMENT_UNLOCKED` accept the four new ids. The public command query
  offers one `BUILD_MONUMENT` per unlocked, unspent entitlement on an
  eligible tile, as before.

## 5. UI

- **Achievements screen** (menu). Under the heading, one line: "Each
  achievement earns a free Monument: +3 population, one per city." Then one
  card per achievement in canonical order, each with its state symbol, name,
  one-line goal, progress meter, and status ("0 / 5", "Done! Build your
  monument.", "Monument built", or "Needs {technology}" for the three older
  ones). A new achievement is "available" from the start. On a Dry Land map
  the Sea Dog card is omitted (six cards); every other map type lists seven.
- **Completion notice.** Unchanged dialog, with the display name: "Conqueror
  achievement complete", "Land Baron achievement complete", "Sea Dog
  achievement complete", "Slayer achievement complete". Notices queue in
  event order and wait for a mandatory city reward, as before.
- **Monument action.** `command-build_monument-{id}` (`conqueror`,
  `land_baron`, `sea_dog`, `slayer`), labelled "Monument", as before. A
  Monument's source chip reads "{Name} monument".
- **Technology tree.** The trophy badge still marks Scouting, Engineering,
  and Drill only; the new achievements have no technology.
- **Help.** One tip: "Achievements (see the menu) each earn a free Monument:
  +3 population, one per city. Conquer, expand, sail, and keep your killers
  alive."
- **Icons.** Achievements have no per-achievement art. The cards use the
  existing drawn state symbols (`ui-status-achievement-entitlement-locked`,
  `-unlocked`, `-spent`) and the notice uses the existing trophy icon, so no
  new asset is needed.

## 6. Normal AI

The Normal AI does not plan for an achievement. It builds a Monument when the
public command query offers one, exactly as for the older entitlements, so it
places the new Monuments with no policy change. `src/ai/` is unchanged.

## 7. Headless telemetry

`HeadlessMetricsV7.achievements.progressMaximum` and `.unlockRound` have a
key for each of the seven achievements, and `.unlockedSeats` counts the seats
that unlocked each one in the match.

## 8. Measurements

Sample: 120 headless Normal-AI matches under `pulp-wars-poc-7r21`, every seat
played by the AI, 80-round cap: 80 duels on 11 x 11 (seeds 1 to 4) and 40
four-seat matches on 16 x 16 (seeds 1 and 2), on Pangea, Continents,
Archipelago, Lakes, and Dry Land, each with four rotations of the faction
order Human, Undead, Goblin, Dinosaur. 320 seats, 80 of each faction. 99
matches ended by conquest; the median match length was 29 rounds (28 in
duels, 72 with four seats). "Round" is the round of the unlock.

| Achievement | Seats that unlocked it | Earliest round | Median round | Quartiles | Unlocks before round 10 |
| ----------- | ---------------------: | -------------: | -----------: | --------- | ----------------------: |
| Explorer    |              169 (53%) |             10 |           22 | 18 to 26  |                       0 |
| Engineer    |                 7 (2%) |             27 |           45 | 35 to 46  |                       0 |
| Muster      |              202 (63%) |              5 |           20 | 16 to 24  |                       1 |
| Conqueror   |              192 (60%) |              7 |           20 | 15 to 28  |                       8 |
| Land Baron  |              105 (33%) |             11 |           27 | 18 to 34  |                       0 |
| Sea Dog     |              146 (46%) |             10 |           21 | 17 to 26  |                       0 |
| Slayer      |              138 (43%) |              9 |           30 | 24 to 37  |                       3 |

| Achievement | Human | Undead | Goblin | Dinosaur | Duels | Four seats |
| ----------- | ----: | -----: | -----: | -------: | ----: | ---------: |
| Conqueror   |   53% |    61% |    56% |      70% |   59% |        61% |
| Land Baron  |   23% |    36% |    36% |      36% |   38% |        28% |
| Sea Dog     |   43% |    44% |    49% |      48% |   35% |        56% |
| Slayer      |   41% |    49% |    40% |      43% |   28% |        59% |

- The four new achievements unlock at rates between Engineer's (2%) and
  Muster's (63%), no earlier than the older ones, and for every faction.
- **Sea Dog by map:** Continents 81%, Archipelago 77%, Lakes 39%, Pangea 31%,
  Dry Land 0% (not reachable there by design). Without Dry Land it is 57%.
- **Slayer by map:** 13% on Dry Land, 36% to 66% elsewhere.
- **Conqueror in duels** unlocks for 59% of seats, usually in the capture
  that ends the match.
- **Thresholds considered** on the same matrix under revision 20 (rate of
  seats that would have met the condition): 4 cities 45%, 5 cities 34%, 6
  cities 20%; 2 ships 59%, 3 ships 46%, 4 ships 39%; 3 kills 65%, 4 kills
  53%, 5 kills 44%, 6 kills 36%.
- **Total reward.** A seat unlocked 1.18 of the three older achievements on
  average and 1.82 of the four new ones; 81 seats unlocked none of the new
  ones and 46 all four. The same matrix under revision 20 had 98 conquests
  and a median of 32 rounds (28 in duels, 76 with four seats), so match
  length and the number of decided matches did not move
  ([concern 1](#11-concerns)).

## 9. Decisions

1. **Reward.** The same reward as the older achievements, one Monument, with
   no new reward type. The one-Monument-per-city rule bounds the total.
2. **No enabling technology.** A technology gate would make an achievement
   depend on a research order, and the conditions cannot be met in the
   opening turns anyway. Sea Dog needs Shorecraft in practice, because ships
   need a Port.
3. **Conqueror is an event, not a count.** The state does not record who
   founded a city, and adding a counter would change the player shape for one
   bit that the entitlement already stores.
4. **Sea Dog counts ships, not embarked units**, so ferrying an army does not
   complete it.
5. **Slayer needs 5 kills**, above the 3 of a Promotion, so it is not a second
   reward for the Promotion.
6. **Only the acting player is evaluated in a command** (unchanged rule). A
   retaliation kill is credited at the owner's next Start Turn.
7. **Sea Dog is hidden on Dry Land** in the UI only; the entitlement exists in
   every match so that the state shape does not depend on the map type.
8. **Overlay only.** Revisions 19 and 20 are overlays that are not yet folded
   into the current rules document, so this revision is an overlay too. The
   fold bead for revisions 19 and 20 (`pulp_wars-c87.9`) should fold
   [section 2](#2-the-achievements) into section 5 of the current rules and
   remove its sentence "No achievement counts kills".

## 10. Test expectations

`tests/unit/ruleset-v7-revision21-achievements.test.ts`:

- identity: `pulp-wars-poc-7r21`, the gap-free prior list ending at 7r20, the
  save key, the obsolete keys through `v7r20`, rejection of 7r20 setups,
  states, replays, and saves, and the identity in the release and smoke
  scripts;
- registry: the seven ids in order, no enabling technology for the new four,
  the four constants, seven locked entitlements and the four progress entries
  for a new seat of each faction, the parser (three entries rejected, a new
  unlock with no technology accepted, `spent` without `unlocked` rejected,
  Muster without Drill still rejected), command and event parsing;
- Conqueror, for each faction: a village capture does not unlock; the first
  hostile capture unlocks once, before `PLAYER_ELIMINATED`; a second hostile
  capture does not repeat; an AI seat unlocks; only the owner receives the
  event; the entitlement funds exactly one Monument;
- Land Baron, for each faction: progress 1 to 5, the unlock in the capture
  that reaches 5 and not before, no repeat; Conqueror then Land Baron in one
  capture; still unlocked at 4 cities;
- Sea Dog, for each faction: three naval units unlock at the Start Turn, once;
  two naval units and one embarked unit do not;
- Slayer, for each faction: the attack that gives one unit its fifth kill
  unlocks; four kills do not; four and four on two units do not; a
  retaliation kill unlocks at the owner's next Start Turn;
- persistence: a fresh four-faction save round-trips with seven entitlements;
  states with unlocked and spent new entitlements round-trip through JSON;
- telemetry: the seven keys, the unlock round, and the seat count.

`tests/unit/ruleset7-achievement-presentation.test.ts`: names, goals with the
engine's numbers, the listed achievements per map type, and the progress
counts of every shape.

`tests/integration/ruleset7-achievements-dom.test.ts`: seven cards with name,
goal, state, status, and meter on a naval map; six on Dry Land; partial,
complete, and spent states; the queued notices with display names; the
Monument action of a new achievement; the Help tip.

**Parity.** A match in which no new achievement unlocks is identical to the
same match under revision 20 (commands, events, and the state apart from the
identity and the four extra locked entitlements), and every match is
identical up to the command that first unlocks one.

Checked on fixed Normal-AI matches by running each one on the 7r20 tree
(93b7823) and on this revision and comparing every command, its events, and
the state hash after it (with the identity and the four new entitlements
removed):

| Match (map, seed, seats, factions, round cap)              | Identical commands | Then                                 |
| ---------------------------------------------------------- | -----------------: | ------------------------------------ |
| Pangea 1, duel, Human/Undead, 60                           |                164 | Slayer at command 165, round 14      |
| Dry Land 2, duel, Undead/Goblin, 60                        |                 85 | Conqueror at command 86, round 11    |
| Archipelago 3, duel, Goblin/Dinosaur, 60                   |                207 | Sea Dog at command 208, round 17     |
| Lakes 4, duel, Dinosaur/Human, 60                          |                 99 | Conqueror at command 100, round 10   |
| Continents 5, duel, Human/Undead, 60                       |                238 | Sea Dog at command 239, round 17     |
| Pangea 6, three seats, Undead/Goblin/Dinosaur, 30          |                179 | Conqueror at command 180, round 10   |
| Continents 7, duel, all Human, 30                          |                146 | Sea Dog at command 147, round 15     |
| Archipelago 1234, three seats, all Human, Cooperative, 18  |                233 | Sea Dog at command 234, round 13     |
| Pangea 1, duel, Human/Undead, 9                            |                 98 | whole match identical, no new unlock |
| Dry Land 2, duel, Undead/Goblin, 9                         |                 75 | whole match identical, no new unlock |
| Lakes 9, four seats, Goblin/Dinosaur/Human/Undead, 8       |                160 | whole match identical, no new unlock |
| Continents 10, four seats, Dinosaur/Human/Undead/Goblin, 8 |                165 | whole match identical, no new unlock |

The first-turn states of the five generated map types also keep their
revision-18 hashes once the identity, the `eggs` list, and the four new
entitlements are removed (`ruleset-v7-revision18-showcase.test.ts`).

**Re-pinned digests.** The two all-Human parity matches of
`tests/unit/ruleset-v7-undead-faction.test.ts` (Continents 7 and
Archipelago 1234 above) keep their map and post-generation PRNG digests and
get new command, event, final-state, view, and command-list digests, because
a seat unlocks Sea Dog in each and places its Monument. Two Normal-AI
behaviour tests changed their matches for the same reason:
`ruleset-v7-revision14-ai.test.ts` uses Pangea seed 4 instead of 8 (seed 8
no longer trains a Lich), and `ruleset-v7-undead-ai.test.ts` adds Pangea
seed 8 (no other listed match reaches a Devour).

## 11. Concerns

1. **More Monuments for the leader.** Conqueror, Land Baron, and Slayer are
   earned by a player who is already ahead. Each is worth what an older
   achievement is worth (+3 population in one city), and one Monument per
   city bounds the total, but a player who earns several gains more
   population than before.
2. **Duels.** In a two-player match the first hostile capture is usually the
   last command of the match, so Conqueror's Monument is rarely placed there.
3. **Several identical "Monument" buttons.** A tile shows one Monument action
   per unlocked, unspent entitlement (the revision-5 rule). With seven
   achievements a player can hold more unspent entitlements at once than
   before.
