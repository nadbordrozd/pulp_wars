# The Battle of Polytopia: Core Reference for the Pulp Wars POC

**Research access date:** 2026-08-14
**Subject:** the current original _The Battle of Polytopia_, with emphasis on its
land-based core loop rather than a full clone
**Purpose:** an implementation reference and planning boundary for the first
Pulp Wars proof of concept (POC), not a design mandate

## 1. Scope, source policy, and confidence

This document describes rules and presentation visible in the original game,
then maps them to the much smaller POC requested for Pulp Wars. It does not copy
game code, proprietary art, or substantial prose. Naval systems, diplomacy, and
the full faction roster are intentionally out of scope except where they explain
a menu, mode, or version change.

The research baseline is the live PC/mobile game family as of the access date.
The Google Play listing reported an update on 2026-07-06, while the latest
numbered mechanics note found on the official blog was v2.16.3, dated
2026-02-16. Therefore “current” below means current public documentation and
store media, not a byte-for-byte audit of every platform build. See the
[official support page](https://polytopia.io/support/),
[official v2.16.3 note](https://polytopia.io/bug-fixes-in-version-2-16-3/),
[Google Play listing](https://play.google.com/store/apps/details?id=air.com.midjiwan.polytopia),
and [Steam listing](https://store.steampowered.com/app/874390/The_Battle_of_Polytopia/).

Evidence labels used below:

- **Official:** Midjiwan/Polytopia site, store listing, patch note, or official
  screenshot. This is preferred for current changes and product-level claims.
- **Community reference:** the collaboratively maintained Polytopia Wiki. The
  developer links to this wiki, but its pages can lag releases or contradict one
  another. Exact rules should be tested against a current build before claiming
  compatibility.
- **Observed:** visible in official screenshots or normal play, but not stated
  as a formal rule by Midjiwan.
- **Inference/recommendation:** derived for implementation. It is not a claim
  about Polytopia internals.

Where an exact numeric rule is sourced only to the wiki, confidence is
**moderate**. When an official change note agrees, confidence is **high**.

## 2. The core loop in one page

A player begins with a capital, one basic unit, limited stars, a small explored
area, and tribe-dependent starting technology. On their turn they collect stars
from controlled cities, then may spend stars on units, technology, resources,
and improvements. Units explore, fight, and stand on villages or enemy cities
to capture them. Cities convert nearby resources and buildings into population;
population thresholds raise a city's level, income, and unit capacity, and each
level presents a choice of rewards. Research becomes more expensive as the
empire gains cities. The result is a deliberate tension between expansion,
military production, city growth, and buying technology before the next capture
raises its price. These relationships are corroborated across the community
[City](https://polytopia.fandom.com/wiki/City),
[Star](https://polytopia.fandom.com/wiki/Star), and
[Technology](https://polytopia.fandom.com/wiki/Technology) references.

The public product describes automatically generated maps, turn-based play,
offline bots, and multiple victory rules. PC advertises matches with up to 16
players; availability, account requirements, controls, and lobby affordances
vary by platform. [Official Steam description](https://store.steampowered.com/app/874390/The_Battle_of_Polytopia/)

## 3. Match setup and modes

### 3.1 Current mode vocabulary

| Context         | Mode             | End condition / limit                                                                                            | Scoring consequence                                                                   |
| --------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Single player   | Perfection       | 30 turns                                                                                                         | Maximize score before the turn limit.                                                 |
| Single player   | Domination       | Eliminate all opposing tribes; no fixed turn cap                                                                 | Post-game rating weighs speed, combat, enemies personally eliminated, and difficulty. |
| Single player   | Creative         | Player configures map/opponents and chooses Perfection, Domination, or Infinity rules                            | Infinity is open-ended; Creative may run without opponents.                           |
| Tutorial        | Boot Camp        | Scripted learning sequence                                                                                       | Teaching flow, not a normal competitive match.                                        |
| Multiplayer     | Glory            | First to reach 10,000 points; if several qualify during the same turn, the highest score at that turn's end wins | Score is itself the objective.                                                        |
| Multiplayer     | Might            | Capture every opposing capital                                                                                   | Territorial/military objective.                                                       |
| Recurring event | Weekly Challenge | All players receive the same seeded settings; official launch format is 20 turns                                 | Score leaderboard; AI difficulty rises by league.                                     |

The mode definitions and Domination breakdown are documented in the community
[Game Modes reference](https://polytopia.fandom.com/wiki/Game_Modes). The seeded,
20-turn challenge format and league-based bots are official in
[Weekly Challenges Are Now Here](https://polytopia.io/weekly-challenges-are-now-here/).
The weekly event is a later addition and may not appear in older mode lists.

Domination's reported percentage comprises four equally weighted components:

- speed: full credit at roughly 10 turns per opponent;
- battle skill: `(kills + 1) / (kills + losses + 1)`;
- tribes destroyed personally divided by total opponents; and
- difficulty: Easy 25%, Normal 50%, Hard 75%, Crazy 100%.

This formula is a **community reference** and should not be used as a POC
acceptance oracle without a build check.

### 3.2 Setup dimensions

A normal setup combines mode, tribe, opponent count, bot difficulty, map size,
and water/land configuration. Multiplayer also introduces human seats, match
pace/timer, matchmaking/friend/pass-and-play choices, and possibly teams or
ranked status depending on platform and release. The stable core is the board
configuration, not the exact lobby UI.

The current community size table is:

| Name    | Tiles | Dimensions |
| ------- | ----: | ---------: |
| Tiny    |   121 |    11 × 11 |
| Small   |   196 |    14 × 14 |
| Normal  |   256 |    16 × 16 |
| Large   |   324 |    18 × 18 |
| Huge    |   400 |    20 × 20 |
| Massive |   900 |    30 × 30 |

Source: community [Map Generation](https://polytopia.fandom.com/wiki/Map_Generation).
Domination normally maps one opponent to Tiny, two to Small, three to Normal,
and four or more to Large. Tiny supports at most nine players; other listed
sizes support up to sixteen according to that source.

Current map-type vocabulary is Dryland, Lakes, Pangea, Continents, Archipelago,
and Water World. The Steam prose calls these “five map types” while listing six,
and its size prose similarly does not present the full current community table.
Treat the enumerated six types and six sizes as the better current inventory,
but treat the store-count discrepancy as unresolved editorial/version drift.
[Steam listing](https://store.steampowered.com/app/874390/The_Battle_of_Polytopia/),
[Map Generation](https://polytopia.fandom.com/wiki/Map_Generation)

The POC needs none of these water configurations. One generated square map with
grass and mountains is sufficient, provided the seed and player count are part
of match setup.

## 4. Turn and round flow

A **turn** belongs to one player. A **round** completes after all active players
have taken one turn. Turn order is set at match start; an official v2.16.3 change
randomized turn order for newly created friend games, so order must be stored in
match state rather than inferred from player IDs.
[Official v2.16.3 notes](https://polytopia.io/bug-fixes-in-version-2-16-3/)

Implementation-grade phase model:

1. **Start turn:** make the player active; award that player's per-turn city
   income; resolve start-of-turn capture eligibility and status changes; make
   ready all surviving units belonging to the player.
2. **Free ordering phase:** the player can alternate city actions, research,
   construction/harvesting, movement, combat, healing, promotions, and capture
   actions in any legal order. There is no separate global “move phase.”
3. **End turn:** the player explicitly ends. Units that neither moved nor acted
   recover automatically under the standard recovery rule; transient choices
   close; advance to the next active player.
4. **End round:** after the last active player, increment the round/turn counter
   as the mode defines it, then return to the first surviving player. Test
   victory at the rule-specific boundary; Glory, for example, resolves at the
   end of a qualifying turn rather than waiting for the round.

Steps 1–3 are a synthesis of the community
[Units](https://polytopia.fandom.com/wiki/Units),
[City](https://polytopia.fandom.com/wiki/City), and
[Game Modes](https://polytopia.fandom.com/wiki/Game_Modes) pages. The exact
internal order of simultaneous start/end hooks is not public; the POC should
make its own sequence explicit and test it headlessly.

## 5. Board, terrain, fog, and vision

### 5.1 Logical board

Polytopia's board is a square grid presented in an isometric-like camera. Each
tile has up to eight neighbors, including diagonals. Community movement rules
use Chebyshev adjacency: absent modifiers, a step to any neighboring square
costs one movement point. One unit occupies one tile.
[Movement](https://polytopia.fandom.com/wiki/Movement)

Map generation places capitals and villages, then terrain, resources, and
special discoveries. Current community observations report that harvestable
resources are generated only within two tiles of a city or village. Exact
probabilities are tribe- and version-sensitive; the community page gives a
standard-land baseline near settlements of 48% field, 38% forest, and 14%
mountain, with resources distributed within those categories. Those figures
are useful evidence about intent, not a recipe for the forest-free POC.
[Map Generation](https://polytopia.fandom.com/wiki/Map_Generation)

### 5.2 Land terrain

| Terrain/state    | Traversal                                                                   | Defense/vision                          | Core interaction                                                                             |
| ---------------- | --------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------- |
| Field (grass)    | Ordinary one-point step                                                     | No inherent defense bonus               | Supports most building/resource interactions. Empty field is the baseline tile.              |
| Forest           | Entering normally ends movement; roads are an exception                     | 1.5× defense after Archery              | Can host animals/lumber and later be cleared or burned. Excluded from this POC.              |
| Mountain         | Impassable without Climbing; once passable, entering normally ends movement | 1.5× defense; vision radius two (5 × 5) | May contain metal and supports mining. Included in POC, but unlock semantics must be chosen. |
| Cloud/unexplored | Cannot be used as a known through-path; exploration reveals it              | Hides terrain/content until explored    | Information state, not physical terrain.                                                     |

Source: community [Terrain](https://polytopia.fandom.com/wiki/Terrain) and
[Movement](https://polytopia.fandom.com/wiki/Movement). “Ends movement” is more
precise than treating forest/mountain as a very large numeric movement cost.

### 5.3 Fog and vision

Vision in the core game is primarily **persistent exploration**, not the
re-closing “live fog” common in other strategy games. A player who has never
revealed a tile sees a cloud and cannot see its terrain or contents. Normal
units reveal a Chebyshev radius of one (a 3 × 3 area); mountains and Scout-like
vision reveal radius two (5 × 5). Once uncovered, an ordinary tile remains
visible even after friendly units leave. This persistence is corroborated by
long-running community discussion, while the current
[Terrain reference](https://polytopia.fandom.com/wiki/Terrain) defines clouds
as covering unexplored tiles.

Retaliation still depends on the defender's **exploration knowledge**: it is
suppressed when the attacker's tile remains under that player's cloud, or when
the attacker is outside the defender's range. This is documented in the
community [Combat reference](https://polytopia.fandom.com/wiki/Combat). It does
not imply that ordinary enemy units disappear again when no friendly unit is
nearby. Special invisibility such as Cloaks is a separate, excluded system.

Pulp Wars should store `explored[player][tile]`. It should add a conventional
`visibleNow`/re-fog layer only as a deliberate non-original design choice.
Exact reveal timing during multi-step movement is still **version-sensitive and
not publicly specified as an engine contract**.

## 6. Villages, cities, population, and defeat

### 6.1 Capture and ownership

A village has no owner and initially produces nothing. A unit must **start its
turn** on the village before it can use Capture; taking that action consumes the
unit's turn and converts the village into a level-one city. An enemy city is
besieged when an attacker occupies it; its income becomes zero while besieged,
and ownership changes through a later Capture action rather than immediately on
entry. The village timing is explicit in the current community source. The
enemy-city timing is consistent with the siege flow but is not separately
specified there, so the POC must state and test its rule.
[City](https://polytopia.fandom.com/wiki/City)

The starting city is the capital and is marked with a crown. Capturing a
capital does not necessarily eliminate its owner immediately: the documented
elimination condition is losing all cities. Capital ownership is nevertheless
the Might objective. The capturing unit changes its home support to the new
city. Units previously produced by a captured city do **not** transfer to the
captor; current community documentation says they lose that origin association.
[City](https://polytopia.fandom.com/wiki/City),
[Population](https://polytopia.fandom.com/wiki/Population),
[Game Modes](https://polytopia.fandom.com/wiki/Game_Modes)

### 6.2 Income, capacity, population, and levels

At normal settings, a city produces stars per turn equal to its level, plus one
for a Workshop or Park. A human capital gets another +1, so a level-one human
capital ordinarily produces 2 stars per turn. Bot-capital income differs by
difficulty: Easy 1, Normal 2, Hard 3, Crazy 5 stars per turn according to the
community mode reference. A besieged city produces zero.
[City](https://polytopia.fandom.com/wiki/City),
[Game Modes](https://polytopia.fandom.com/wiki/Game_Modes)

A level-`L` city supports `L + 1` home units. Capacity is counted by home city,
not by the unit's current location. Population is a progress value for city
growth, not unit population. To advance from level `L` to `L + 1` requires
`L + 1` population: level 1→2 needs 2, 2→3 needs 3, and so on. Removing
population-producing infrastructure may make population negative; community
documentation says this can reduce city income, floored at zero, but does not
reduce unit capacity. [Population](https://polytopia.fandom.com/wiki/Population)

| City reaches | Choice A                         | Choice B                                                         | Persistent baseline gain            |
| -----------: | -------------------------------- | ---------------------------------------------------------------- | ----------------------------------- |
|      Level 2 | Workshop: +1 star per turn       | Explorer: reveal nearby territory through an automated walk      | +1 base income and +1 unit capacity |
|      Level 3 | Resources: +5 stars              | City Wall: city defense rises from 1.5× to 4× for eligible units | Same                                |
|      Level 4 | Population Growth: +3 population | Border Growth: expand workable territory                         | Same                                |
|     Level 5+ | Park: +1 star per turn and score | Super Unit                                                       | Same                                |

Source: community [City](https://polytopia.fandom.com/wiki/City) and
[Park](https://polytopia.fandom.com/wiki/Park). The official v2.16.3 note changed
Explorer movement from 15 to 12; the Explorer wiki page still exposed the older
number during research. Use **12** for current-reference purposes, but the POC
does not need Explorer.
[Official v2.16.3 notes](https://polytopia.io/bug-fixes-in-version-2-16-3/)

Default city territory is a 3 × 3 area centered on the city; Border Growth
expands it to 5 × 5. Previously claimed territory is not reassigned. This is
documented on a community translated-city reference and has lower confidence
than the level table; verify before compatibility work.
[Community city reference](https://polytopia.fandom.com/zh/wiki/%E5%9F%8E%E5%B8%82)

## 7. Stars, resources, and economic decisions

Stars are both stored currency and the visible per-turn economic score. The HUD
shows the current stock plus `(+SPT)`. Core sinks are unit training, technology,
resource harvesting, buildings, and terrain manipulation. Core sources are
city income and one-off rewards. [Star](https://polytopia.fandom.com/wiki/Star)

Land resources are map features, not a second stockpiled currency. A legal
harvest/improvement spends stars and adds population to the city controlling
that tile; the feature is consumed or replaced by its improvement. The
representative regular-tribe values are:

| Terrain feature   | Technology/action            | Cost | City population |
| ----------------- | ---------------------------- | ---: | --------------: |
| Fruit on field    | Organization / Harvest Fruit |    2 |              +1 |
| Animal in forest  | Hunting / Hunt               |    2 |              +1 |
| Crop on field     | Farming / Farm               |    5 |              +2 |
| Metal on mountain | Mining / Mine                |    5 |              +2 |

Sources: community [Population](https://polytopia.fandom.com/wiki/Population),
[Terrain](https://polytopia.fandom.com/wiki/Terrain), and
[Buildings](https://polytopia.fandom.com/wiki/Buildings). Some resources remain
hidden until the relevant branch is known. The initial POC baseline selected
only metal/Mines; the approved second-play expansion now also selects the
regular-tribe Organization/Harvest Fruit values above while continuing to omit
animals, crops, and forests.

Current one-time values relevant to understanding the loop include:

| Event                                 |                            Stars |
| ------------------------------------- | -------------------------------: |
| Level-3 Resources reward              |                               +5 |
| Common ruin treasure outcome          |                              +10 |
| Clear Forest                          |                               +1 |
| Disband a unit                        | Half training cost, rounded down |
| Harvest starfish (naval context only) |                               +8 |

These are community values from [Star](https://polytopia.fandom.com/wiki/Star)
and [Units](https://polytopia.fandom.com/wiki/Units); starfish is also stated in
an official [Path of the Ocean patch announcement](https://store.steampowered.com/news/posts/?appids=874390&enddate=1719842058&feed=steam_community_announcements).
Meeting another tribe also awards a score-scaled one-off amount in the current
wiki, but older strategy material reports different fixed brackets. Exclude
this reward from the POC unless separately verified.

Representative current land development values are Farm: 5 stars for 2
population, Lumber Hut: 3 for 1 population, Mine: 5 for 2 population, and
Forge: 5 with adjacency-based population. They demonstrate the population
investment loop but are outside a grass-and-mountain minimal build unless Mine
is selected. [Buildings](https://polytopia.fandom.com/wiki/Buildings)

There is a live documentation conflict around some improvement details. The
[official 2025 balance pass](https://polytopia.io/2025-balance-pass/) allowed
Forges to be built on forests and set Burn Forest to 3 stars, while some wiki
material still describes older placement or a 5-star burn. Prefer the official
post for the changed release, and do not use either rule in the POC without a
current-build check.

Starting stars are tribe-sensitive after the 2025 balance pass: most tribes
start with 5, while several start with 6 or 7 and Luxidoor receives a special
capital treatment. The POC's single faction should choose one fixed, explicit
starting amount rather than inherit an accidental faction exception.
[Official 2025 balance pass](https://polytopia.io/2025-balance-pass/)

## 8. Technology structure and scaling

The full technology tree has five roots and three tiers:

| Root         | Tier 2 branches    | Tier 3 descendants        |
| ------------ | ------------------ | ------------------------- |
| Climbing     | Mining; Meditation | Smithery; Philosophy      |
| Fishing      | Sailing; Ramming   | Navigation; Aquatism      |
| Hunting      | Archery; Forestry  | Spiritualism; Mathematics |
| Organization | Farming; Strategy  | Construction; Diplomacy   |
| Riding       | Roads; Free Spirit | Trade; Chivalry           |

Source: community [Technology](https://polytopia.fandom.com/wiki/Technology).
This table records structure only; it intentionally omits the many unlocks.

Without a discount, the community-documented price is:

```text
technologyCost = technologyTier * ownedCityCount + 4
```

Thus one city yields costs 5, 6, and 7 for tiers 1, 2, and 3. Literacy applies a
33% discount, rounded up. Price is evaluated against the current city count,
which makes “research before capturing” strategically meaningful.
[Technology](https://polytopia.fandom.com/wiki/Technology)

Normally a prerequisite chain governs research. Since the official 2025 pass,
a tribe that starts with a higher-tier technology can research backward toward
its ancestors without first owning them. This is a faction-start exception, not
a reason for the POC's simplified tree to allow arbitrary purchases.
[Official 2025 balance pass](https://polytopia.io/2025-balance-pass/)

Target-unit unlocks are Warrior at start/no technology, Archer from Archery,
Defender from Strategy, and Rider from Riding. Disband is unlocked by Free
Spirit in the original. [Technology](https://polytopia.fandom.com/wiki/Technology),
[Free Spirit](https://polytopia.fandom.com/wiki/Free_Spirit)

## 9. Unit lifecycle and action legality

### 9.1 Training and home city

Units are trained by a city, spend stars immediately, appear on the city tile
when legal, and count against that city's capacity. The home-city relationship
persists as they move. Training legality therefore depends on currency,
technology, city capacity, and whether the spawn tile is available. The unit
that captures a city migrates its support to that city; pre-existing units from
the captured city lose their old origin rather than changing allegiance.
[Units](https://polytopia.fandom.com/wiki/Units),
[Population](https://polytopia.fandom.com/wiki/Population)

### 9.2 Movement and zones of control

- A unit normally moves once and attacks/acts once per turn. Skill flags alter
  the order: **Dash** permits attack after moving; **Escape** permits another
  move after attacking, not a second attack.
- Movement range is a budget over eight-direction neighboring tiles. A move may
  not finish on another unit.
- Entering forest or mountain normally stops remaining movement. Entering any
  of the eight tiles adjacent to an enemy also stops remaining movement: this
  is zone of control (ZOC). Roads do not bypass ZOC, and an unseen enemy may
  stop a move.
- A unit beginning inside a ZOC may leave it and may enter another ZOC; the rule
  is a stop-on-entry rule, not a permanent pin.
- Roads ordinarily cost 0.5 movement between connected friendly/neutral road
  or city tiles; enemy roads do not grant the benefit. Community rules allow a
  final legal step even when the remaining fraction would otherwise be
  insufficient.
- A Rider has movement 2 but may reveal only one new tile when advancing into
  unexplored clouds, preventing its full range from becoming a blind two-tile
  leap.

Sources: community [Movement](https://polytopia.fandom.com/wiki/Movement),
[Unit Skills](https://polytopia.fandom.com/wiki/Unit_Skills), and
[Rider](https://polytopia.fandom.com/wiki/Rider). The POC excludes roads, so its
movement kernel can omit fractional cost while retaining ZOC and terminal
mountain entry if desired.

### 9.3 Combat, retaliation, and advance

The player attacks a visible enemy within range. Both attack and retaliation
damage are computed from pre-exchange health. Retaliation does not occur if the
defender is killed by the initial hit, cannot reach or see the attacker, has
zero retaliation, is prevented by a Stiff-like effect, or the attacker has
Surprise. Consequently a range-2 Archer usually receives no retaliation from a
range-1 target. A successful adjacent/melee kill advances the attacker onto the
defender's tile; a ranged kill does not. [Combat](https://polytopia.fandom.com/wiki/Combat)

The UI exposes a damage preview on long-press/hover before committing. A POC
should expose the same information without requiring the same gesture.

### 9.4 Healing, promotion, and removal

- **Recover:** an eligible unit that does not otherwise act regains 4 health in
  friendly territory or 2 in neutral/enemy territory. The UI also exposes an
  explicit recovery action. Healing cannot exceed maximum health.
- **Veterancy:** after three kills, including kills by retaliation, an eligible
  unit can be promoted. Promotion adds 5 maximum health and heals it to the new
  maximum. Promotion is a player action, not an unavoidable immediate event.
- **Disband:** after researching Free Spirit, a player can remove their unit and
  recover half its training cost, rounded down.
- Death or disband frees its home city's capacity. Capturing a city changes the
  relevant ownership/home relationship as described above.

Sources: community [Units](https://polytopia.fandom.com/wiki/Units),
[Unit Skills](https://polytopia.fandom.com/wiki/Unit_Skills), and
[Free Spirit](https://polytopia.fandom.com/wiki/Free_Spirit). The exact
automatic-recovery trigger should be encoded as an explicit end-turn rule and
covered by tests, because UI wording across releases is not a formal timing
specification.

## 10. Combat formula

The current community formula is:

```text
attackForce  = attacker.attack
             * attacker.currentHealth / attacker.maxHealth

defenseForce = defender.defense
             * defender.currentHealth / defender.maxHealth
             * defenseBonus

totalForce   = attackForce + defenseForce

damageToDefender = round(attackForce / totalForce
                       * attacker.attack * 4.5)

damageToAttacker = round(defenseForce / totalForce
                       * defender.defense * 4.5)
```

Source: community [Combat](https://polytopia.fandom.com/wiki/Combat). Defense
bonus is 1 with no bonus, normally 1.5 for eligible forest/mountain/city
defense, and 4 for an eligible unit in a walled city. Only units with Fortify
receive city defense. All four POC target types have Fortify in current
community data.

Important implementation details:

- Compute both forces from health **before** applying the exchange.
- Use the game's integer rounding behavior only at the final damage steps. The
  community formula writes `round`, but language-specific half rounding can
  differ. Pulp Wars must choose and test one deterministic rule rather than use
  the host language's default implicitly.
- Clamp damage/health and resolve death before retaliation or melee advance.
- Apply defense bonus to `defenseForce`, while the final retaliation term still
  contains the defender's base defense as shown above.
- The formula is well supported by community testing but not published as an
  official API contract. Label exact compatibility tests accordingly.

## 11. Exact target unit reference

| Unit     | Cost | Max HP | Attack | Defense | Move | Range | Skills                | Unlock                              |
| -------- | ---: | -----: | -----: | ------: | ---: | ----: | --------------------- | ----------------------------------- |
| Warrior  |    2 |     10 |      2 |       2 |    1 |     1 | Dash, Fortify         | None / starting unit                |
| Archer   |    3 |     10 |      2 |       1 |    1 |     2 | Dash, Fortify         | Archery (tier 2 from Hunting)       |
| Defender |    3 |     15 |      1 |       3 |    1 |     1 | Fortify               | Strategy (tier 2 from Organization) |
| Rider    |    3 |     10 |      2 |       1 |    2 |     1 | Dash, Escape, Fortify | Riding (tier 1 root)                |

Sources: community [Warrior](https://polytopia.fandom.com/wiki/Warrior),
[Archer](https://polytopia.fandom.com/wiki/Archer),
[Defender](https://polytopia.fandom.com/wiki/Defender), and
[Rider](https://polytopia.fandom.com/wiki/Rider). Values are **moderate
confidence** until checked in the target current build. “Fortify” matters only
for city defense; Defender's lack of Dash means it cannot move and attack in the
same turn. Rider's Escape occurs after attacking and never grants a second
attack.

## 12. Victory and score

The mode, not the renderer, owns victory evaluation. Relevant rules are:

- Perfection ends after 30 turns and compares accumulated score.
- Domination ends after all rivals are eliminated, then reports the percentage
  breakdown in section 3.
- Glory resolves the 10,000-point threshold at the end of a qualifying turn;
  if multiple players qualify during that turn, the highest score wins.
- Might is based on ownership of all enemy capitals, which is distinct from the
  “no cities” elimination state.

Source: community [Game Modes](https://polytopia.fandom.com/wiki/Game_Modes).

Current community score values include:

| Owned/revealed item  |                                            Score |
| -------------------- | -----------------------------------------------: |
| Unit                 |                       5 × its star training cost |
| Super unit           |                                               50 |
| Controlled territory |                                      20 per tile |
| Explored tile        |                                       5 per tile |
| City                 |                  100 + 50 for each level above 1 |
| Park                 |                                              250 |
| Monument             |                                              400 |
| Temple               | 100 initially, then +100 per growth, maximum 500 |
| Technology           |                                       100 × tier |

Source: community [Score](https://polytopia.fandom.com/wiki/Score). Losing an
owned item removes its contribution. The official
[2025 balance pass](https://polytopia.io/2025-balance-pass/) confirms temples
now grow by 100 per growth; older tables showing 50 are stale. The POC does not
need Polytopia-compatible score unless it selects a score victory.

## 13. What can safely be said about the AI

Published evidence supports an observable behavior contract, not an internal AI
specification:

- Bots take legal turns on the same board and pursue expansion, city
  improvement, production, combat, and mode objectives.
- Difficulty changes the starting capital income to 1/2/3/5 stars per turn for
  Easy/Normal/Hard/Crazy and is associated with greater aggression in the
  community mode reference. Higher difficulty therefore is not a clean measure
  of planning intelligence.
- Midjiwan's support page explicitly acknowledges that AI can make irrational
  decisions and says it is continuously improved.
- A Path of the Ocean-era official patch announcement describes more selective
  unit spawning and better city improvements, showing that heuristics change
  across releases.
- A historical forum answer by Midjiwan says bots must explore to gain vision.
  It supports information parity as design intent, but its age makes it
  insufficient proof of every current bot's information access.

Sources: [Game Modes](https://polytopia.fandom.com/wiki/Game_Modes),
[official support](https://polytopia.io/support/),
[official patch announcement](https://store.steampowered.com/news/posts/?appids=874390&enddate=1719842058&feed=steam_community_announcements),
and the [archived developer reply](https://polytopia.fandom.com/f/p/2875947262935208178/r/2902449165697192450).

No reliable public source found specifies the live bot's search algorithm,
evaluation weights, random tie-breaking, complete information access, or exact
per-difficulty decision logic. Claims that difficulty “only cheats” or that all
bots use an identical policy conflict with later official AI-improvement notes.
Pulp Wars should implement a documented deterministic policy suitable to its
own rules, not emulate visible mistakes or assume undocumented fog knowledge.

## 14. Core menus, screens, and interaction flow

Exact placement changes between touch/desktop, portrait/landscape, account
state, and releases. This inventory describes functions that planning must
account for; it does not prescribe pixel-identical layouts. Official current
store captures visibly corroborate the tribe picker, full-screen technology
tree, map HUD, and map overlays.
[Steam listing and screenshots](https://store.steampowered.com/app/874390/The_Battle_of_Polytopia/),
[Google Play listing](https://play.google.com/store/apps/details?id=air.com.midjiwan.polytopia)

### 14.1 Front-of-game flow

1. **Boot/splash and profile state:** load game/account/local save, then expose
   current identity/customization where supported.
2. **Main hub:** entry points for Single Player, Multiplayer, profile or throne
   room/customization, settings, and scores/leaderboards. Platform/account
   availability varies.
3. **Single-player mode chooser:** Perfection, Domination, Creative, Boot Camp,
   and current recurring challenge entry.
4. **Creative/match setup:** ruleset, opponent count and difficulty, map size,
   map type, and tribe availability; Creative can permit zero opponents.
5. **Tribe picker:** illustrated tribe cards/heads, locked/available state,
   selection details, and confirmation. Official PC screenshots show this as a
   horizontally browsable, presentation-heavy screen.
6. **Multiplayer browser/lobby:** create/join or invitations, friend/random/
   local-pass-and-play paths, human/bot seats, Glory/Might, map and pace options,
   tribe choice, and ready/start state. Teams, ranking, timers, and monetized
   tribe ownership are platform/version sensitive.
7. **Loading/generation:** seed the board, assign seats/turn order/capitals, and
   enter the first turn.

### 14.2 In-game map screen

The central surface is a pannable/zoomable board. A current official 1920 × 1080
PC capture shows top-line **Score**, **Stars** with per-turn income, and **Turn**.
Bottom/right shortcuts expose **Settings**, **Game Stats**, **Tech Tree**, and
**End Turn**. Touch builds reflow controls and support portrait and landscape.

Map-level feedback includes:

- tile ownership/border marks and roads/connections;
- city label, level/population progress, capacity/unit indicators, and a crown
  for a capital;
- unit identity, health/status, and action-ready feedback;
- selection/hover highlight, legal movement destinations, hostile targets, and
  contextual action bubbles;
- unexplored clouds and persistent exploration treatment;
- projected damage before an attack; and
- transient rewards, level-ups, capture, combat, and turn notifications.

### 14.3 Selection and action panels

**Unit selection** needs name/type, current/max health, attack/defense/movement/
range, home city where relevant, skills/status, kills/veteran eligibility, and
the legal actions Move, Attack, Recover, Capture, Promote, and Disband as
applicable. Hover on PC and long-press on touch can reveal combat preview, but a
POC should also support an explicit accessible preview.

**City selection** needs owner/name, level, income, population progress, unit
capacity, siege/capital state, trainable unit list with costs and availability,
and its workable territory. Selecting a resource or terrain tile exposes only
the currently legal harvest/build action and its cost/effect.

### 14.4 Full-screen and modal surfaces

- **Technology tree:** branch layout, researched/available/locked states,
  current price, unlock detail, purchase confirmation, and return to map.
- **Game Stats:** player/tribe leaderboard, score and mode-relevant city,
  capital, or elimination information. Relationship/diplomacy details exist in
  the full game but are outside POC scope.
- **Settings/pause:** resume, audio/display/animation/accessibility options as
  supported, restart/resign/exit confirmations.
- **Choice/reward dialogs:** city-level two-choice reward, ruin outcome, tribe
  encounter, monument/task, warnings, and destructive confirmations. Only the
  city-level choice is core to the requested slice.
- **End screen:** victory/defeat, final score or Domination percentage
  breakdown, progression/rank where applicable, and continue/replay/share/exit
  actions. Online/account affordances vary by platform.

For the POC, the minimum coherent flow is: setup → board → unit/city/tile
selection → tech view → turn handoff/AI progress → victory/defeat → restart.

## 15. Isometric geometry and asset measurement

### 15.1 What is and is not publicly verifiable

The current original presents a low-poly three-dimensional world through an
orthographic/isometric-like camera in Unity. Its units and terrain are not a
public 2D sprite sheet with a stable native tile canvas. The engine lineage is
documented in the community [Update History](https://polytopia.fandom.com/wiki/Update_History),
and the three-dimensional presentation is directly observable in current
official screenshots. The official
[Game Graphics page](https://polytopia.io/game-graphics/) offers promotional
creative assets, and the [brand asset guidelines](https://polytopia.io/brand-assets-guide-lines/)
describe permitted branding use; neither publishes runtime tile dimensions,
model bounds, pivots, camera parameters, or draw-order code. Promotional assets
must not be mistaken for runtime metadata or copied into Pulp Wars.

Accordingly, no exact Polytopia sprite canvas width/height, feet anchor, or
native display size is asserted here. Zoom, camera framing, animation pose,
perspective-like height, and screenshot resampling make a single pixel count
non-authoritative.

### 15.2 Reproducible screenshot measurement

For implementation guidance, the following official Steam screenshot files
were downloaded temporarily at their published 1920 × 1080 resolution and
inspected at native scale on 2026-08-14. No source image was added to this
repository. The hashes make this evidence repeatable even if Steam later
changes its gallery.

| Evidence                                                                                                                                                                   | SHA-256                                                            | Measurement use                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| [Wide board/HUD capture](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/874390/ss_ee24e2157cbf45d55c304bbdd7802b915e0c378b.1920x1080.jpg?t=1784567441) | `43cb3764f0bde7c7a057647dbc0ca771eaf053e7c8cffa6ab8992ae898f49d64` | Repeated tile centers, top HUD, map-scale overhang |
| [Close board capture](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/874390/ss_b833263c0a145a13b34f2f2a8a3fdf1180c5fbe7.1920x1080.jpg?t=1784567441)    | `4a6e68274e9973319bf26d515917659fabb83022cc4e9bd6dfde67c9f2325e7b` | Unit contact points and visible bounds             |
| [Board/HUD/fog capture](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/874390/ss_7c8459064cf765cfb2d3f3e94cab161fc4ca1249.1920x1080.jpg?t=1784567441)  | `a884811df20e0cb2ebbefca2261a888f92c53aeebf0059c051247ec34dd9e3f2` | Cloud edge, controls, units and tall objects       |
| [Full water-world board](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/874390/ss_246e639d53ff12c13f6532beb157b4aab17f727e.1920x1080.jpg?t=1784567441) | `9b0041c8a2f0e490ae0a9e6c640a673e32a2c208bd0049a205e5ee7aae9b7625` | Projection ratio at a distant zoom only            |

Repeat the measurement as follows:

1. Download the current full-resolution official store screenshots and record
   their URLs, dates, and decoded pixel dimensions. Do not measure a browser
   thumbnail.
2. In a clear board region, mark the screen centers of at least ten pairs of
   adjacent tile ground centers along each logical grid axis. Repeat on at least
   three screenshots/zoom levels.
3. For a neighbor vector `(dx, dy)`, calculate projected footprint estimates
   `W = 2 * abs(dx)` and `H = 2 * abs(dy)`. Record mean, spread, and `W/H` per
   screenshot; do not average absolute pixel sizes across zoom levels.
4. For units, measure ground-contact/feet position relative to the tile center
   and the visible bounding box in tile-footprint units. Repeat by pose/type.
   Screenshot backgrounds cannot reveal transparent canvas extents, so report
   visible bounds only.
5. For mountains/cities, record upward and lateral overhang beyond the ground
   diamond. Verify overlap cases against both grid axes.
6. Repeat with a current mobile portrait capture before freezing touch-scale
   targets. Store the measurements and source hashes in a future design record.

Ruler sampling of the 1920 × 1080 official captures found the projected ground
diamond roughly **1.65–1.75 times as wide as high** across usable samples. This
is **observed, medium confidence**, and compatible with an isometric-like
projection; it is not proof of a fixed camera ratio. Basic units occupy roughly
**0.3–0.6 tile widths** and extend roughly **0.8–1.5 projected tile heights**
above their contact point depending on pose and zoom. Mountains and cities can
overhang several projected tile heights. Those visible-box ranges are
**low-to-medium confidence** and are composition guidance only.

The apparent unit contact point is near the projected tile center, with the
body extending upward. This anchor is an **observational inference, medium
confidence**. In the original 3D renderer, depth testing can resolve overlap;
the exact render queue is not public.

### 15.3 Implementation-safe 2D contract for Pulp Wars

Pulp Wars should use logical grid coordinates independent of art and project
them only in the renderer:

```text
screenX = originX + (gridX - gridY) * tileWidth  / 2
screenY = originY + (gridX + gridY) * tileHeight / 2
```

Safe provisional recommendations, **not original-game measurements**:

- Use a configurable footprint near a 1.7:1 ratio; `128 × 74` CSS pixels at
  nominal 1× is a practical starting point, never a simulation constant.
- Give each unit class a common transparent source canvas as required by
  `art_direction.md`; describe its foot/contact anchor in normalized
  coordinates rather than relying on trimmed-file edges. Start with
  `anchorX = 0.5` and test `anchorY` in the `0.72–0.82` range.
- Permit `overflow: visible`. Declare visible bounds/overhang metadata per
  terrain/object class; never clip a tall unit or mountain to the tile diamond.
- Hit-test the logical tile and explicit UI affordances, not opaque sprite
  pixels. Keep selection rings and health/status UI in separate layers.
- Render ground first, then low ground features, then objects/units ordered by
  their **ground anchor**, then effects/selection/status/UI. A stable starting
  sort key is `(gridX + gridY, gridY, layer, stableEntityId)`. Test both axes,
  tall overhang, and ties; adjust the secondary coordinate to the chosen camera
  convention.
- Keep device-pixel ratio and camera zoom in rendering state. Produce art at
  integer scale multiples of the agreed nominal canvas, but display it from
  logical dimensions.

Unity's general isometric Tilemap example uses a 256 × 128 sprite and a
`(1, 0.5, 1)` cell, but that is an engine tutorial example—not evidence about
Polytopia and not a required Pulp Wars ratio.
[Unity isometric sprite-import documentation](https://docs.unity3d.com/es/2020.2/Manual/Tilemap-Isometric-SpritesImport.html)

## 16. POC mapping

The goal is inspiration-level fidelity to the core decisions, not feature
parity. The proposed mapping below is intentionally explicit so planning can
accept or change each cut.

| Original concept                       | POC implementation boundary                                                                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Multiple tribes with asymmetric starts | One playable faction and the same rules/content for 1–3 AI opponents; colors/IDs distinguish players.                                                                                            |
| Many setup combinations                | Local setup with seed, 1–3 AI count, one board-size choice initially, and difficulty only if its behavior is specified. Serve at `http://localhost:6173`.                                        |
| Six map/water types, varied terrain    | Seeded square land map containing only grass and mountains. Guarantee connected/reachable starts under the chosen mountain rule.                                                                 |
| Capital, villages, cities              | One capital per player plus capturable neutral villages. Minimal city income, population, levels, capacity, and a reduced reward table.                                                          |
| Full star/resource/building economy    | Stars and per-turn city income. Include Organization fruit and explicit-ore Mines as the two population sources; omit forests, water, trade networks, temples, monuments, and diplomacy.         |
| Fifteen-technology structure           | Small explicit prerequisite graph containing only unlocks/economic actions required by the slice. Preserve city-count cost scaling only if intentionally accepted.                               |
| Large unit roster                      | Warrior, Archer, Defender, Rider with the table in section 11 unless planning deliberately balances them differently.                                                                            |
| Full movement/combat skill system      | Eight-neighbor grid, occupancy, terrain passability/terminal entry, ZOC, Dash/Escape/Fortify, healing, retaliation, melee advance, and deterministic combat rounding. Omit roads and transports. |
| Fog and Scout interactions             | Per-player persistent explored bitsets; normal radius-one reveal, optional mountain radius-two reveal. Add re-fog/current-visibility only as an intentional departure. No naval Scout.           |
| Perfection/Domination/Glory/Might      | Select one land conquest victory. A clean POC choice is eliminate all rivals by taking all cities, but capital-only is smaller; do not implement score victory by accident.                      |
| Live game's evolving bots              | Deterministic, documented heuristic AI using only legal observable state. Same seed and actions must yield the same outcome.                                                                     |
| Unity visual scene                     | 2D illustrated isometric renderer following `art_direction.md`, with renderer-independent logical coordinates and no proprietary source assets.                                                  |

### 16.1 Deterministic renderer-independent simulation

The simulation should be a pure state transition system. A serializable state
must include at least ruleset version, seed/PRNG state, map cells, player/turn
order, stars and technology, cities and population/capacity, units and their
home/status/kills, exploration, objective state, and monotonically assigned
entity IDs. Commands such as `Research`, `Train`, `Move`, `Attack`, `Recover`,
`Promote`, `Capture`, `ChooseCityReward`, and `EndTurn` should validate and emit
the next state plus domain events. The renderer consumes state/events but must
never decide legality, damage, random outcomes, AI choices, or victory.

For replay/headless validation:

- use one specified integer PRNG algorithm and serialize its state;
- define iteration and tie-break order explicitly, normally by stable IDs and
  logical coordinates;
- use integers/rationals or explicitly specified rounding for combat;
- never read wall-clock time, frame time, DOM order, locale, or object/hash-map
  iteration inside rules or AI;
- expose a headless match runner that accepts setup + command log and produces
  a canonical final-state hash/event log; and
- run the browser renderer and headless runner against the same simulation API.

Client-only means all authoritative state lives locally; it does not relax the
determinism requirement. Persistence can start as a versioned local save or
command log. The development server must bind/configure port **6173** and serve
the playable entry point at `http://localhost:6173`.

## 17. Decisions planning must settle

1. **Victory:** all enemy cities, all enemy capitals, or a turn/score limit?
2. **Board:** dimensions, village density, start-distance constraints, and the
   precise guarantee that mountains do not make a start unwinnable.
3. **Mountains:** impassable forever, passable from start, or unlocked by a
   simplified Climbing technology; terminal movement and 1.5× defense?
4. **Economy:** starting stars, capital bonus, AI income parity, technology
   cost formula, and whether one Mine-like population action is in scope.
5. **Cities:** exact capture timing, level ceiling, which two-choice rewards
   survive, territory size, capacity, siege income, the capturer's home-city
   reassignment, and orphaning of units from a captured city.
6. **Fog:** persistent explored space, whether to add non-original live re-fog,
   mountain reveal, AI information parity, and when exploration updates during
   movement/combat.
7. **Combat fidelity:** use the formula unchanged or rebalance; define half
   rounding, attack preview, retaliation visibility, and melee advance.
8. **Lifecycle:** include automatic recovery, promotion, and disband now or
   stage them; decide Defender's no-Dash interaction in UX.
9. **AI:** difficulty knobs, action budget, objective weights, deterministic
   tie-breaking, and acceptable turn-time budget. Do not use bonus income unless
   visibly described to the player.
10. **Turn UX:** whether AI turns animate or fast-forward while producing the
    same event log, and whether undo is allowed before hidden information or RNG
    is revealed.
11. **Art geometry:** nominal tile footprint, common unit canvas, normalized foot
    anchor, maximum overhang, zoom range, portrait behavior, and accessibility
    alternatives to color/status icons.
12. **Scope terminology:** whether names such as Warrior/Archer/Defender/Rider
    are temporary research labels or Pulp Wars' own final unit names.

Until these are decided, the safest architecture is a data-driven ruleset over
a deterministic simulation, with the visual measurements in section 15 treated
as replaceable renderer configuration.

## 18. Source limitations and verification checklist

- Midjiwan does not publish a complete current rules specification or runtime
  rendering metadata. Store text can be editorially inconsistent.
- The Polytopia Wiki is unusually detailed but collaborative and sometimes
  stale. Known conflicts in this research include Explorer's 15→12 movement,
  post-2025 terrain/improvement rules, encounter rewards, and older temple score
  growth. Official dated notes take precedence for their releases.
- Platform builds and UI differ. PC screenshots prove surfaces and general
  layout, not mobile gesture details or exact latest-build coordinates.
- Screenshot measurement establishes visible proportions only. It cannot
  reveal model bounds, transparent source canvas, pivots, camera settings, or
  internal sorting.
- Before any “faithful to current Polytopia” test is made contractual, manually
  verify the four target units, capture timing, healing trigger, fog/retaliation,
  city-transfer behavior, and rounding on the exact chosen platform/build.

For independent rules testing, the old academic _Tribes_ environment may help
illustrate how to separate a Polytopia-like state/action model from presentation,
but it is simplified and historical and is **not** evidence of current rules.
[AAAI paper: _Towards a Video Game Description Language for Mobile Games_](https://cdn.aaai.org/ojs/7438/7438-52-10764-1-2-20200923.pdf)
