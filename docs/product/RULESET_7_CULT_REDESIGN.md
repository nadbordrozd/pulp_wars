# Ruleset 7: the Cult redesign (design)

**Status:** design, bead `pulp_wars-mch9.30` step 1 (2026-10-16). Nothing in
this document is built yet. It is an overlay over
[the Cultists spec](RULESET_7_CULTISTS.md) (the design record) and
[section 26 of the current rules](RULESET_7_CURRENT.md#26-cultist-faction-rules)
(the rules as built at `pulp-wars-poc-7r84`). Where this document and those
two differ, this document is the intended design; each implementation bead
of [section 18](#18-implementation-beads) folds its part into the current
rules as it lands, and the current rules stay the rule of what is built.
No game was played or simulated to write it (the user's standing rule):
every number is a first guess for hand-play tuning, and the combat results
quoted were computed by hand with the formula of
[section 13.2 of the current rules](RULESET_7_CURRENT.md#132-damage).

## The five decisions to look at first

The user approved the root's proposal of 2026-10-16 ("sounds about right.
schedule this") and left the rest to the design. These five decisions go
furthest beyond the proposal's words; each can be overruled without
unpicking the rest.

1. **The Caller and the Chosen leave no unit behind.** The Cult's `KNIGHT`
   and `SWORDSMAN` slots become **vacant**: registered (every faction's
   table must hold every role) but trained, rewarded, and placed by
   nothing, as the Ice Folk ship slots are today. Chivalry becomes
   **Tentacles** (the Summoner's Tentacle) and Metallurgy becomes
   **Gibbering Masses** (the new defensive summon). Martyr retires with the
   Chosen; Pick Me! lives on as part of the Idol Bearer's aura. The Horror
   stays at Leadership with the Imp, so the Cult has two summons from its
   second technology.
2. **The Imp is summoned by a Summoner alone, and three Imps run on one
   strand.** 2 Favour, no helper, Control 1; **Brood**: one holding strand
   to an Imp also holds up to two own Imps standing beside it at the check;
   **Swarm**: a unit beside two or more of a seat's Imps cannot strike back
   at those Imps. Imps never capture. Every Cult seat **starts with 2
   Favour**, so its first Summoner summons an Imp the turn it is trained.
3. **The Gibbering Mass needs no strand at home.** 5 Favour, Summoner and
   helper, 30 HP, Defense 3, Move 1, immovable, never captures; Control 1,
   but **Doorstep**: a Mass on or beside an own city center, or beside an
   own Idol Bearer whose idol stands, needs no strand at the check. **Drag**:
   a hostile unit that begins a Move beside a Mass may move only one tile in
   it. This is the Cult's defensive answer that costs no channeller's turn.
4. **Favour is capped at 30 and a bound Herald eats 2 a turn or breaks
   loose.** Gains above 30 are lost. At the check each bound Herald costs 2
   Favour (**Hunger**); a Herald whose 2 cannot be paid is Unbound like a
   Herald short of strands. Each Summoner whose strand held pays a trickle
   of +1. The Offering pays 6 for 2 population. Prices fall: Imp 2, Horror
   4, Mass 5, Herald 18. Daemon kills still pay the victim's full value (the
   cap, not a smaller payout, stops the flood). This revises variance rule 3
   (no caps), by the user's approval.
5. **The robed cultists are casters with 7 HP; the Idol Bearer stays the
   sturdy one.** Initiate, Hexer, Summoner, and Stargazer drop to 7 HP and
   Attack 1.5 (the Summoner 1, the Stargazer none); the Hexer costs 3 and the
   Stargazer 7. The Idol Bearer keeps 16 HP and Defense 2.5: it is the warden
   whose lasting **Behold!** aura halves shots on own units beside it and
   lets adjacent enemies attack only it. The old Behold! (a channeller under
   a raised idol keeps its strand when hurt) is dropped: the aura protects
   the circle's bodies, not the channel.

Every other decision is listed in [section 16](#16-decisions-made).

## Contents

1. [The brief](#1-the-brief)
2. [What changes at a glance](#2-what-changes-at-a-glance)
3. [The variance rules, revised](#3-the-variance-rules-revised)
4. [Roster](#4-roster)
5. [Technology tree](#5-technology-tree)
6. [Favour: sources, sinks, the cap](#6-favour-sources-sinks-the-cap)
7. [Summons, Control, and strands](#7-summons-control-and-strands)
8. [Changed abilities, precisely](#8-changed-abilities-precisely)
9. [The Herald, and every Unbound daemon](#9-the-herald-and-every-unbound-daemon)
10. [Resolution order, interactions, and surfaces](#10-resolution-order-interactions-and-surfaces)
11. [Existing saves](#11-existing-saves)
12. [Normal AI](#12-normal-ai)
13. [Interface](#13-interface)
14. [Art](#14-art)
15. [Campaign and labs](#15-campaign-and-labs)
16. [Decisions made](#16-decisions-made)
17. [Test plan](#17-test-plan)
18. [Implementation beads](#18-implementation-beads)

## 1. The brief

The user, 2026-10-16 (bead `pulp_wars-mch9.30`), on the Cult as built: the
faction is all about summoning but ends up fighting with its cultists;
cultists should be squishier; the Familiar is fun but Switcheroo needs more
range; the Idol Bearer is only cannon fodder with a good Defense, and
Behold! is too narrow; Star-fall's chanters are fun but +1 damage each is
meaningless: the Stargazer should cast alone and any adjacent cultist
should be able to join the chant for real damage, with a different
interface; the Cult has no good defensive option; the Caller is a fun idea
but too weak; the early game is boring and weak; once the Herald comes,
Favour piles up; the Herald is passive (it never advances after a kill) and
can be kept busy by feeding it one cheap unit a turn: it should advance on
kills and, when Unbound, go for cultists within 2 tiles first, then anyone
else, and other summons only when nobody else is near, never hunting
cultists across the map; sacrificing population is a big move and should
pay more; maybe add a summon and drop one or two regular units.

**The root's proposal, approved by the user** ("sounds about right.
schedule this"): summons are the army and cultists the casters; robed
cultists squishier (about 6 to 8 HP, less Attack) and summons cheaper; drop
the Caller (its Tentacle becomes a second Summoner spell) and the Chosen
(Pick Me! moves to the Idol Bearer); a new early summon (about 2 Favour, one
strand, fast, frail, nasty in numbers); a new defensive summon (a Gibbering
Mass: slow, very tough, guards a city or a circle, drags at adjacent
enemies); the Idol Bearer as warden (Behold! a lasting aura: less ranged
damage beside the idol, adjacent enemies may attack only the bearer);
Star-fall by the Stargazer alone, a solid hit landing next turn, with any
cultist adjacent to the casting Stargazer able to join while it is pending
(about +3 each, from an icon on the Stargazer); Switcheroo range 4; the
Offering about 6 Favour for 2 population; a small Favour trickle from each
Summoner holding a strand; a Favour cap about 30 and a Favour upkeep for a
bound Herald; the Herald advances after a kill, and Unbound goes for a
cultist within 2 first, then anyone else nearby, then other summons only
when nobody else is near.

**Coming separately** (bead `pulp_wars-2yc.60`): every targetable action
shows an icon on its tile, with a small chooser when one tile has several
actions; the action buttons stay in the bar as well. This design uses that
system for joining a chant and for choosing which summon to call.

## 2. What changes at a glance

| Area            | As built (`7r84`)                                                           | Redesign                                                                                                                                    |
| --------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity        | Robed units a little weaker than Humans; daemons on a channel               | **Summons are the army, cultists the casters**: robed bodies of 7 HP; four summons and the Tentacle                                         |
| Trained roster  | Initiate, Idol Bearer, Familiar, Hexer, Summoner, Stargazer, Caller, Chosen | The first six; the Caller and Chosen are gone (vacant slots)                                                                                |
| Summons         | Horror (5), Herald (20), the Caller's Tentacle                              | **Imp** (2), Horror (4), **Gibbering Mass** (5), Herald (18), the Summoner's Tentacle                                                       |
| Favour          | Uncapped; starts at 0; Offering 3; Martyr 6                                 | **Cap 30**; starts at **2**; Offering **6**; **+1 trickle** per Summoner whose strand held; **Hunger** 2 a turn per bound Herald; no Martyr |
| Idol Bearer     | Behold! (an action): its neighbours keep their strands when hurt            | **Behold! (a lasting aura)**: shots on own units beside it are halved; adjacent enemies may attack only an Idol Bearer                      |
| Star-fall       | Needs a chanter; 5 + 1 a chanter; every unacted neighbour joins at once     | **Alone**; 6 + **3** a chanter; neighbours **join one by one** while it is pending, each with its action                                    |
| Switcheroo      | Range 2                                                                     | Range **4**                                                                                                                                 |
| Tentacle        | The Caller's action, at Chivalry                                            | **The Summoner's action**, at Chivalry (shown as Tentacles)                                                                                 |
| Herald          | Never advances; Control 3; no upkeep                                        | **Advances after a kill**; Control 3; **Hunger** 2 Favour a turn                                                                            |
| Unbound daemons | The nearest unit, own seat first on ties; never advance                     | **A cultist within 2**, else **anyone in reach**, else **a summon in reach**, else walk to the nearest; **advance after a kill**            |
| Defense         | Behold!, Pick Me!, the Chosen's body                                        | The warden's aura, the **Mass** (no strand at home, Drag)                                                                                   |

## 3. The variance rules, revised

The seven variance rules of
[the spec, section 2](RULESET_7_CULTISTS.md#2-the-variance-rules) stay
binding with these changes, all from the user's approval of 2026-10-16:

- **Rule 3 (no caps) is revised.** Favour is capped at **30** per seat;
  any gain above it is lost. There is still no cap on daemons per seat, on
  summons per turn, or on the Favour of one Seizure up to the pool's cap.
  A Brood (three Imps on one strand), a Thing's grip, a Hexer's cooldown,
  and one Tentacle per Summoner are the shape of a spell, not caps.
- **Rule 5 (no catch-up) gains a cost.** The Herald's **Hunger** (2 Favour
  a turn) is an upkeep, paid by a Cult that is winning as by one that is
  losing; it is no catch-up and no pity rule. Favour still compounds, up to
  the cap.
- **Rule 2 (control is the price) gains one exception.** A Gibbering Mass
  on its **Doorstep** needs no strand. The Mass is a defender: its price is
  that it is slow, never captures, and stops counting as held the moment it
  leaves home
  ([section 7.4](#74-the-gibbering-mass-doorstep-and-drag)). The Horror's
  and the Herald's Control numbers are unchanged.
- **Rules 1, 4, 6, and 7 are unchanged.** The Herald is stronger than
  before (it advances); a failure still refunds nothing (a hungry Herald
  breaks loose, the Favour already paid is gone); every hold is public and
  breakable on the board; nothing is random.

The [design principles' rule against passive auras](PULP_WARS_TECH_TREE_DESIGN_PRINCIPLES.md#8-active-support-actions-not-passive-auras)
is set aside for the Idol Bearer by the user's approval: it is a defender,
not a support unit, its aura does not stack, and it is drawn as one ring.

## 4. Roster

### 4.1 Every unit and summon

Attack and Defense in whole units (the engine stores twice these). Cost is
Coins for a trained unit and Favour for a summon. **Bold** marks a number or
rule that changes. "Robed" units channel, chant, help a summoning, and hold
down a Seizure (the rule of
[section 26.1](RULESET_7_CURRENT.md#261-roles-robed-cultists-and-labels)).

| Unit                               | Role (slot)  | Unlock (Cult name)                |          Cost |     HP |  Attack | Defense |  Move | Range | Robed | Abilities                                                                                                                                 |
| ---------------------------------- | ------------ | --------------------------------- | ------------: | -----: | ------: | ------: | ----: | ----: | ----- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Initiate                           | `FIGHTER`    | start                             |       2 Coins |  **7** | **1.5** |   **1** |     1 |     1 | yes   | Pamphlets; channels, chants, helps, holds; captures                                                                                       |
| Idol Bearer                        | `GUARD`      | Fortification (Warding Circles)   |       3 Coins |     16 |     1.5 |     2.5 |     1 |     1 | yes   | **Behold! (a lasting aura)**; cannot attack after moving; channels; captures                                                              |
| Familiar                           | `RAIDER`     | Scouting (Familiars)              |       3 Coins |      8 |       2 |       1 |     2 |     1 | no    | **Switcheroo at range 4**; Charge (Raiding); Sight 2; captures                                                                            |
| Hexer                              | `MARKSMAN`   | Marksmanship (Hexers)             |   **3 Coins** |  **7** | **1.5** |       1 |     1 |   1–2 | yes   | Ribbit every second turn; never advances; channels; captures                                                                              |
| Summoner                           | `CAPTAIN`    | Administration (Leadership)       |       5 Coins |  **7** |       1 |       1 |     1 |     1 | yes   | Sacrifice; Seize; **Summon an Imp, a Horror, a Gibbering Mass**; **Tentacle**; leads the Great Summoning; channels; **trickle**; captures |
| Stargazer                          | `CATAPULT`   | Sawmilling (Stargazers)           |   **7 Coins** |  **7** |       — |     0.5 |     1 |     — | yes   | **Star-fall alone**, 2 to 4 tiles; no attack; channels; captures                                                                          |
| (vacant)                           | `KNIGHT`     | nothing                           |             — |      — |       — |       — |     — |     — | —     | **The Caller is retired**; its Tentacle is the Summoner's                                                                                 |
| (vacant)                           | `SWORDSMAN`  | nothing                           |             — |      — |       — |       — |     — |     — | —     | **The Chosen is retired**; Pick Me! is in Behold!; Martyr is gone                                                                         |
| Thing in the Cellar                | `JUGGERNAUT` | reward only (levels 5 and up)     |             — |     40 |       4 |     3.5 |     1 |     1 | no    | Anchor; captures                                                                                                                          |
| Patrol Boat, Battleship, Submarine | the ships    | the Naval branch                  |        shared |      — |       — |       — |     — |     — | no    | The Human boats in the Cult's style                                                                                                       |
| **Imp**                            | summoned     | Administration (Leadership)       |  **2 Favour** |  **6** |   **2** |   **1** | **3** |     1 | no    | **Control 1; Brood; Swarm**; advances; never captures                                                                                     |
| Horror                             | summoned     | Administration (Leadership)       |  **4 Favour** |     18 |       4 |       2 |     2 |     1 | no    | Control 1; Boo!; advances; captures while bound                                                                                           |
| **Gibbering Mass**                 | summoned     | Metallurgy (**Gibbering Masses**) |  **5 Favour** | **30** |   **2** |   **3** | **1** |     1 | no    | **Control 1, Doorstep; Drag**; immovable; never advances; never captures                                                                  |
| Herald                             | summoned     | Explosives (The Stars Are Right)  | **18 Favour** |     60 |       7 |       4 |     2 |     1 | no    | Control 3; Ravage; Unstoppable; Proclaim; **advances**; **Hunger**; captures while bound                                                  |
| Tentacle                           | wild         | Chivalry (**Tentacles**)          |             — |      8 |       3 |       1 |     0 |     1 | no    | Nobody's from birth; slaps the weakest beside it; Grab; sinks after 3 rounds                                                              |

Every summon is a daemon in the sense of
[section 26.4](RULESET_7_CURRENT.md#264-daemons-and-summon) (not living,
never heals, no home city, no slot, strides, never fortified, no cover)
except the Tentacle, which keeps its own rules. Values (the Score's, and
what a kill of it is worth): Imp **2**, Horror 6, Gibbering Mass **6**,
Herald 24, Tentacle 0. Sight 1 for every summon.

Starting unit, rewards, and treasure are unchanged: one Initiate; the
Militia reward two Initiates; the Scouts reward a Familiar; the Thing at
every level from 5; the treasure unit a Familiar.

### 4.2 The vacant slots

The registry requires every faction's role table to hold every unit role
(`assertRuleset7Registry`), so the Cult's `KNIGHT` and `SWORDSMAN` entries
stay, as **vacant** registrations:

- No technology, reward, chest, Market hire, Showcase, mission, or lab
  places a unit of a vacant role for a Cult seat. Chivalry and Metallurgy
  drop their `UNIT_ROLE` unlocks in the Cult tree (the precedent: the Ice
  Folk tree drops the ship roles, and before `7r55` every tree but the
  Human dropped `SWORDSMAN`). The role rule has no cost and no technology
  (the reward giant's shape), no ability, and the tactical role the
  registry requires (`BREAKTHROUGH`, `LINE`).
- One helper answers "does this faction field this role" for every reader
  that lists roles (the Gallery, the Showcase, the art manifests, the AI's
  training and research lists, the training offers, the glossary). The
  Gallery's existing rule for a role a tree never unlocks
  (`factionUnlocksRoleV7`) shows an **empty cell** in the Cult's Knight and
  Swordsman rows.
- Mission validation refuses a mission or lab that places a vacant role
  (a new check, so a later mission cannot bring a Caller back by accident).
- The text, the card, and the art of the Caller and the Chosen are retired
  ([section 14](#14-art)).

### 4.3 Head to head (hand computed)

Full HP, open ground, the formula of
[section 13.2](RULESET_7_CURRENT.md#132-damage); the retaliation uses the
defender's pre-combat HP (computed with a throwaway script of the formula,
not committed; the engine beads re-run them through the combat preview).

| Fight                                           | Result                                   | Reading                                                |
| ----------------------------------------------- | ---------------------------------------- | ------------------------------------------------------ |
| Fighter attacks an Initiate                     | deals 6 (1 left), takes 2                | A robed body loses every brawl                         |
| Initiate attacks a Fighter                      | deals 3, takes 5                         | (was 5 and 5): the cultist does not fight              |
| Marksman shoots an Initiate                     | 6 (1 left); **3 beside a standing idol** | The warden halves the shot                             |
| Knight attacks an Initiate, a Hexer, a Summoner | kills each (7 of 7)                      | The back row needs the warden and the summons in front |
| Fighter attacks the Idol Bearer                 | deals 4, takes 6                         | The warden is the only robed unit that wants to be hit |
| Knight attacks the Idol Bearer                  | deals 11 (5 left), takes 4               |                                                        |
| Imp attacks a Fighter                           | deals 5, takes 5; **takes 0 with Swarm** | One Imp is fodder; two are a pack                      |
| Imp attacks a Catapult                          | deals 7 (3 left), takes 0                | Move 3 to the siege line                               |
| Fighter, Knight, Marksman attack an Imp         | each kills it (6 of 6)                   | Frail                                                  |
| Horror attacks a Fighter, a Knight              | kills each                               | Unchanged                                              |
| Fighter attacks a Gibbering Mass                | deals 4 (26 left), takes 8               | A wall                                                 |
| Knight attacks a Gibbering Mass                 | deals 10 (20 left), takes 6              | Three charges to kill one                              |
| Catapult shoots a Gibbering Mass                | deals 7 (23 left)                        | Siege is the answer                                    |
| Herald attacks a Gibbering Mass                 | deals 22 (8 left), takes 4               | The Herald kills one in a turn                         |
| Star-fall (6 + 3 a chanter) on a Fighter        | alone 6; 2 chanters 12 (kills)           | Real damage from the second joiner on                  |

Star-fall by chanters: 0 → 6, 1 → 9, 2 → 12, 3 → 15, 4 → 18, 8 → 30. It
kills a Fighter (12) with two, a Knight (13) or a Champion (15) with three,
a Guard (17) with four, and most other one-slot units with five (21).

## 5. Technology tree

The shared graph (five branches of five, tiers, prerequisites, prices, the
free opener, the Dry Land rule) is unchanged; the registry requires it.
Display names in **bold** are new or changed; the IDs never change.

| Branch     | Tier | ID                 | Cult name            | Cult unlocks                                                                                               | Change             |
| ---------- | ---: | ------------------ | -------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------ |
| Settlement |    1 | `GATHERING`        | Gathering            | reveal Fertile Ground; Harvest Fruit                                                                       | none               |
| Settlement |    2 | `FARMING`          | Harvest Rites        | Farm; Offering (**6 Favour** for 2 population)                                                             | number             |
| Settlement |    3 | `MILLING`          | Milling              | Windmill (it heals no summon)                                                                              | none               |
| Settlement |    2 | `ADMINISTRATION`   | Leadership           | Summoner (Sacrifice, Seize, **Summon an Imp**, Summon a Horror, Channel, the **trickle**); Market; Disband | the Imp            |
| Settlement |    3 | `PLANNING`         | Land Grants          | +1 capacity; Land Grant                                                                                    | none               |
| Wilds      |    1 | `HUNTING`          | Hunting              | Hunt Game                                                                                                  | none               |
| Wilds      |    2 | `FORESTRY`         | Forestry             | Lumber Camp; Clear Forest; Forest cover                                                                    | none               |
| Wilds      |    3 | `SAWMILLING`       | Stargazers           | Sawmill; Stargazer (**Star-fall alone; join the chant**)                                                   | rule               |
| Wilds      |    2 | `MARKSMANSHIP`     | Hexers               | Hexer (Ribbit)                                                                                             | numbers            |
| Wilds      |    3 | `FIELDCRAFT`       | Pathfinding          | Replant Forest; Forest march; Hexer Sight 2                                                                | none               |
| Mobility   |    1 | `SCOUTING`         | Familiars            | Familiar (Switcheroo, **range 4**); Familiar Sight 2                                                       | number             |
| Mobility   |    2 | `ROADS`            | Roads                | Build Road; Road movement; link population                                                                 | none               |
| Mobility   |    3 | `COMMERCE`         | Commerce             | trade; Hire                                                                                                | none               |
| Mobility   |    2 | `RAIDING`          | Raiding              | Pillage; Familiar Charge                                                                                   | none               |
| Mobility   |    3 | `CHIVALRY`         | **Tentacles**        | **the Summoner's Tentacle**; Cultivate Forest; no Overrun (**no Caller**)                                  | the Caller's place |
| Industry   |    1 | `DRILL`            | Crafting             | reveal Ore; Workshop; Spoils                                                                               | none               |
| Industry   |    2 | `ENGINEERING`      | Engineering          | land units enter Mountain; Mine; Redevelop                                                                 | none               |
| Industry   |    3 | `METALLURGY`       | **Gibbering Masses** | Forge; Arms Industry (never a Favour price); **Summon a Gibbering Mass** (**no Chosen**)                   | the Chosen's place |
| Industry   |    2 | `FORTIFICATION`    | Warding Circles      | Idol Bearer (**Behold!, a lasting aura**); no Field Defense                                                | rule               |
| Industry   |    3 | `EXPLOSIVES`       | The Stars Are Right  | Blast Mountain; Breach; the Great Summoning (**18 Favour**)                                                | number             |
| Naval      |  1–3 | the five Naval IDs | Sailing and the rest | the seafaring factions' Naval branch                                                                       | none               |

**Nothing is orphaned.** Every node still has a live Cult unlock: Raiding
keeps Pillage and the Familiar's Charge, and leads to Tentacles; Chivalry
and Metallurgy each gain a spell in place of their unit; Engineering leads
to Gibbering Masses. Capabilities (never a raw technology test):
`offering`, `switcheroo`, `greatSummoning` as today, and two new ones,
**`tentacles`** (Chivalry: the Summoner's `TENTACLE` is offered) and
**`summonMass`** (Metallurgy: `SUMMON` may name a Mass). The ability
literals `PICK_ME` and `MARTYR` are removed; `BEHOLD` stays on the Idol
Bearer with its new meaning; `TENTACLE` moves from the Caller to the
Summoner; new literals `JOIN_CHANT` (every robed role), `SWARM` and `BROOD`
(the Imp), `DRAG` and `DOORSTEP` (the Mass).

**Where the strength sits.** Tier 2 Leadership gives the Summoner, the Imp,
and the Horror: the faction summons from its second technology. Tier 2
Warding Circles is the first defense (the warden); tier 3 Gibbering Masses
the lasting one. Tier 3 Stargazers, Tentacles, and The Stars Are Right are
the late tricks and the capstone.

## 6. Favour: sources, sinks, the cap

**Card text:** "The Ancient Ones pay in Favour, up to 30. Feed them, and
summon."

| Rule            | Value                                                              |
| --------------- | ------------------------------------------------------------------ |
| Starting Favour | **2** for every Cult seat (a mission's `favour` replaces it)       |
| Cap             | **30** per seat; any gain above it is lost (shown, never banked)   |
| Public          | Every player sees every Cult seat's Favour and its cap ("12 / 30") |
| Not scored      | Favour is no Score factor; an eliminated seat's Favour is gone     |

| Source                | What happens                                                                     | Favour                         |
| --------------------- | -------------------------------------------------------------------------------- | ------------------------------ |
| Sacrifice             | A Summoner removes an own unit beside it                                         | the unit's value (unchanged)   |
| Seize                 | A Summoner removes a broken living enemy beside it, held by a second cultist     | twice its value (unchanged)    |
| Offering              | A city gives up 2 population (level 2 or more, population 2 or more)             | **6** (was 3)                  |
| A bound summon's kill | An own Imp, Horror, Mass, or Herald kills a hostile unit that is not a summon    | the victim's value (unchanged) |
| Consumed              | The unit on the Great Summoning's mark is eaten when the Herald arrives          | as a Sacrifice or a Seizure    |
| **Trickle**           | At the check, each own Summoner whose strand held, for a daemon that stays bound | **+1** each                    |
| ~~Martyr~~            | **Retired** with the Chosen                                                      | —                              |

| Sink                      | Favour                                                                            |
| ------------------------- | --------------------------------------------------------------------------------- |
| Summon an Imp             | **2**                                                                             |
| Summon a Horror           | **4** (was 5)                                                                     |
| Summon a Gibbering Mass   | **5**                                                                             |
| Begin the Great Summoning | **18** (was 20), never refunded                                                   |
| **Hunger**                | **2 per bound Herald** at each check; unpaid, the Herald is Unbound (section 7.6) |

**The trickle.** A Summoner's strand "held" when, at the check, it counted
toward a daemon that stayed bound by its strands (a Brood counts: the
strand held its Imp). One Summoner pays at most 1 a turn, whatever it held.
The trickle is credited after every daemon is checked and before Hunger is
paid. It is the reward for keeping the Summoner, the frailest robed unit
and the faction's heart, at work on the channel.

**Why the cap and Hunger.** In the built game a bound Herald killing two
units a turn paid 10 to 18 Favour a turn, and Favour piled up past any use
(the user's report). With the cap the Cult can bank at most one more Herald
and a few summons; Hunger means the Herald's turns cost Favour even when it
kills nothing, and a Herald left without Favour breaks loose, which is the
faction's own kind of failure. Kills still pay full value: the army is now
summons, and a summon that kills pays for the next one, which is the
snowball the variance rules want, up to 30.

**An illustrative opening** (one city, no enemy; the research prices of
[section 6.1](RULESET_7_CURRENT.md#61-research-cost)): Gathering free on turn
1 with an Initiate; Leadership (6 Coins) about turn 2 or 3, and a Summoner
(5 Coins) a turn later. That turn the Summoner summons an Imp with the 2
starting Favour (Favour 0); next Start Turn its strand held: +1. A spare
Initiate Sacrificed (+2) makes a second Imp beside the first, and the
Summoner's one strand now holds both (Brood). By about turn 6 the Cult has
two or three Imps on one strand, a Summoner paying +1 a turn, and Initiates
free to take villages (Pamphlets). Harvest Rites makes every Offering a
Horror and change.

## 7. Summons, Control, and strands

### 7.1 Summon

**"The Summoner calls a thing from beyond for Favour. It channels it this
turn."** One command, `SUMMON { unitId, daemon, helperUnitId?, at }`, a
primary action of a Summoner in land form with a Cult seat, that may follow
its Move. `daemon` is `IMP`, `HORROR`, or `MASS`.

| Summon         | Favour | Helper                                                                      | Needs                               | Tile                  |
| -------------- | -----: | --------------------------------------------------------------------------- | ----------------------------------- | --------------------- |
| Imp            |      2 | **none**                                                                    | Leadership (the Summoner)           | as a Horror's (below) |
| Horror         |      4 | another own robed cultist beside the Summoner that has not acted (as built) | Leadership                          | as built              |
| Gibbering Mass |      5 | as the Horror's                                                             | **Gibbering Masses** (`summonMass`) | as a Horror's         |

The tile is as built for the Horror
([section 26.4](RULESET_7_CURRENT.md#264-daemons-and-summon)): next to the
Summoner, explored, land, never water, ice, or a settlement center, empty
of units, mounds, Barricades, chests, and curiosities, not in an ally's
territory. The summon stands at full HP and cannot act until the next turn.
The Summoner (and the helper, if any) each hold a strand to it and have used
their actions. Nothing limits summoning but Favour, the Summoner's one
action a turn, and a free tile beside it.

### 7.2 Channel and the check, what stays

Channel, the strand, the 3-tile reach, the disruption rule, Candlelit, the
check at the Cult's Start Turn, Anchor, Furious, and Bind again are as
built ([sections 26.5 and 26.6](RULESET_7_CURRENT.md#265-the-channel-strands-and-the-check)).
Control: Imp **1**, Horror 1, Gibbering Mass **1** (0 on its Doorstep),
Herald 3. What is new is how an Imp and a Mass are held, the Herald's
Hunger, and the trickle.

### 7.3 The Imp: Brood and Swarm

**Brood.** "One strand holds an Imp and the Imps beside it, three at most."
At the check, a **holding strand to an Imp** holds that Imp and up to **two
other own bound Imps** that stand on one of the eight tiles around it at
that moment; each Imp so held counts as having its Control. Among several
candidates beside it, the lowest unit IDs are taken. An Imp that is held
by a strand of its own counts that strand first; a held Imp never lends its
Brood on (a Brood is one Imp and its neighbours, not a chain). Order: the
Imps are checked in unit-ID order like every daemon, each by "a holding
strand to me, or a holding strand to an own Imp beside me that has not
already held two others". An Imp not held is Unbound like any daemon short
of its Control.

- Bind again takes one Imp per Channel (no Brood for a bind).
- A grip on a channeller of an Imp changes nothing (its Control is 1).
- The interface draws the strand to the channelled Imp and a short link to
  each Imp it holds; the eye mark of an Imp that would break is shown as for
  every daemon.

**Swarm.** "A unit beside two or more of your Imps cannot strike back at
them." When a bound Imp attacks a unit that has, at the moment of the
attack, **two or more bound Imps of the attacker's seat** on the eight tiles
around it (the attacker counted), the defender does not retaliate (reason
`SWARMED` in the combat preview). Only the Imp's attack is unanswered;
every other attacker meets retaliation as usual. Unbound Imps have no
Swarm.

**The rest of the Imp.** It attacks and advances after a kill like any
unit, never captures (on a hostile center it besieges, as any unit does),
strides like every daemon, and its kills pay Favour. **Why no capture:** a
2-Favour unit with Move 3 that takes villages would replace the Initiate's
Pamphlets and turn the opening into an Imp race.

### 7.4 The Gibbering Mass: Doorstep and Drag

**Doorstep.** "On your doorstep it needs no strand." At the check, a bound
Gibbering Mass stays bound with no strand when it stands **on or beside an
own city center** (a city, not a village), or **beside an own Idol Bearer
whose idol stands** (section 8.1). Elsewhere it needs Control 1, like a
Horror. A strand to a Mass on its Doorstep is legal and simply unneeded.

**Drag.** "Enemies beside it can move only one tile." A unit of a player
hostile to the Mass's owner (in land form, flyers included) that **begins
a Move** on one of the eight tiles around a bound Gibbering Mass may move
**only one tile** in that Move (the movement refusal `DRAGGED`). It is no
status: it disrupts no cultist, cannot be cured, and ends the moment the
unit no longer begins a Move beside a Mass. It limits every Move the unit
begins there, an Escape or an Overrun step included. The advance after a
kill, shoves, swaps, pulls, and Boo! are not Moves and are not limited. An
Unbound Mass drags every player's units.

**The rest of the Mass.** Immovable: nothing shoves, swaps, pulls,
bounces, Boos, or knocks it back (a Crushing Shove crushes it, as damage);
statuses stick to it (it can be Frozen or Stuck) and it is no frog target
(no summon is). It never advances after a kill and never captures; standing
on a hostile center it besieges like any unit. It may stand on an own
center (a daemon fills no slot), which is its natural post.

**Why.** The user found no good defensive option. A Mass on a city is a
wall of 30 HP that costs no channeller's turn and keeps attackers in place,
so the Idol Bearer and the Hexers behind it can work, and a Star-fall
marked on the attackers lands on units that cannot step out in time. Its
counterplay is siege and ranged fire (a Catapult deals it 7), or simply
walking past: it is Move 1 and captures nothing.

### 7.5 The Horror

Unchanged but its price (4 Favour): Control 1, Boo!, advances, captures
while bound, 18 / 4 / 2, Move 2.

### 7.6 The Herald's Hunger

**"The Herald hungers: 2 Favour each turn, or it breaks loose."** At the
check, after every daemon's strands are counted and the trickle is
credited, the seat pays **2 Favour for each of its bound Heralds**, in unit-ID
order. A Herald whose 2 cannot be paid (the seat has fewer than 2 left) is
**Unbound** at once, as a Herald short of strands is: it rampages at once
and is Furious for the turn (event `DAEMON_UNBOUND` with reason `HUNGER`).
Nothing is refunded. A Herald that arrives this turn first pays at the next
check. The End Turn confirmation warns when the seat's Favour is below its
Heralds' Hunger, as it warns for a daemon short of strands.

## 8. Changed abilities, precisely

### 8.1 Behold! (the Idol Bearer, the warden)

**Card text:** "The idol is always raised. Your units beside it take half
from shots, and enemies beside it can attack only the Idol Bearer."

- **The idol stands** while the Idol Bearer is on the board in land form,
  is its seat's own, and has none of the statuses of the disruption rule
  (Frozen, Stuck, Toothache, Splatted, Plagued, Bitten, a frog, Terror, the
  hunted or bombed mark, Cracked). It needs no action and no technology
  beyond Warding Circles (the unit itself). A hit does not drop it; a status
  does, for as long as the status lasts.
- **Shield wall.** A hit from **two or more tiles away** (an attack, ranged)
  on an own unit of the Idol Bearer's seat that stands on one of the eight
  tiles around a standing idol is **first halved, rounded up** (the
  Blizzard's precedent, then Armoured, Plated, and Shields as usual). The
  Idol Bearer itself is not covered by its own idol (another bearer beside
  it covers it). Two idols halve once. Fixed damage (Star-fall, bombs,
  blasts, Plague, eruptions) and area hits are not attacks and are not
  halved.
- **Awestruck.** A unit of a player hostile to the Idol Bearer's seat that
  stands on one of the eight tiles around a standing idol may make a
  targeted `ATTACK` **only on an Idol Bearer** it stands beside (any of them
  when several). The old Pick Me! rule, unchanged in its reach: ranged
  units beside it are bound too, units two or more tiles away are free;
  area effects, statuses, Mind Control, the Tractor Beam, and neutral units
  are free. It is passive and lasting: no shout, no state.
- **What is dropped.** The idol no longer keeps a hurt channeller's strand,
  and there is no `BEHOLD` command, no `idols` state, and no
  `IDOL_RAISED` or `IDOL_DROPPED` event.
- A mind-controlled Idol Bearer's idol stands for its controller (a unit
  trick, as Behold! and Pick Me! were).

### 8.2 Star-fall, alone, and joining the chant

**Card text:** "Next turn a star lands 2 to 4 tiles away: 6 to everything
around it, and 3 more for every cultist who joins the chant."

- **Begin:** `BEGIN_RITUAL { ritual: "STARFALL", unitId, at }`, as built,
  except that it needs **no chanter**: a Stargazer that has not moved this
  turn marks an explored tile 2 to 4 tiles away. **Nobody joins at once**;
  the old rule that every unacted robed neighbour joins the begin is
  removed for Star-fall (it stays for the Great Summoning).
- **Join the chant:** `JOIN_CHANT { unitId, leaderUnitId }`, a primary
  action of an own robed cultist in land form with a Cult seat, standing on
  one of the eight tiles around a Stargazer that leads a **pending
  Star-fall of the same seat**. The joiner has not used its primary action
  (it may have moved this turn, and cannot move after joining), is not
  Frozen and not a frog, and is in no ritual already. It becomes a chanter
  of that star: Candlelit, public, and +3 to the star.
- **Timing.** A star is pending from its begin until it completes at the
  start of its seat's next turn. The only Cult turn inside that span is the
  rest of the turn it was begun in, so **joining happens in the casting
  turn**, after the begin, in any order with the seat's other commands.
  A cultist may move up beside the Stargazer and join in the same turn.
- **What joining costs the joiner:** its primary action for the turn (it
  channels nothing, attacks nothing, helps no summoning), the Move it has
  not made yet, and its safety: as a chanter it is Candlelit and any
  disruption takes it out. It pays no Favour.
- **Disruption, as built:** a disrupted chanter leaves the ritual (the
  star loses 3); a disrupted Stargazer fizzles the star (nothing lands,
  nothing is refunded). A star never fizzles for want of chanters (it needs
  none).
- **Damage:** **6 + 3 for each chanter still in the ritual** when it
  completes, to every unit on the marked tile and the eight around it,
  fixed damage, as built in every other respect (no Defense, cover, or
  fortification; Armoured, Plated, and Shields apply; Field Defenses and
  Barricades destroyed; credit to the Stargazer). No cap on chanters beyond
  the eight tiles around the Stargazer.
- **A chanter beside two pending stars** of its seat chooses one (the
  `leaderUnitId`).

### 8.3 Switcheroo

As built ([section 26.12](RULESET_7_CURRENT.md#2612-hexes-and-tricks)) with
**range 4** (Chebyshev; was 2). Every other condition stays: a visible
land-form unit of any player, never a reward giant, a two-slot unit, an
Egg, a neutral unit, a summoned unit, or an immovable unit; neither tile a
settlement center; both tiles legal by the Push conditions; every second
turn. Decided here: **no other change** (own summons stay out of reach of a
swap), so the range is the whole of the buff and the cheese review of the
spec (no swaps on centers) still holds.

### 8.4 The Summoner's Tentacle

As built for the Caller ([section 26.12](RULESET_7_CURRENT.md#2612-hexes-and-tricks)),
now a primary action of a **Summoner** with the capability `tentacles`
(Chivalry, shown as **Tentacles**): a Tentacle on a free explored tile 1 to
3 tiles away, one per Summoner at a time, free of Favour, outliving its
Summoner; 8 / 3 / 1, Move 0; slaps the weakest unit beside it at once and in
every neutral turn; Grab; sinks after the third neutral turn. A
mind-controlled Summoner has none. The command keeps its shape
`TENTACLE { unitId, at }`.

### 8.5 Unchanged abilities

Sacrifice, Seize, the Offering's conditions (only its Favour changes),
Channel, Anchor, Boo!, Proclaim and Cowed, Ribbit and the frog, Pamphlets,
Grab, the Great Summoning's begin, block, and consumption (only its price
changes), Candlelit, Furious, Bind again, and every interaction of
[section 26.14](RULESET_7_CURRENT.md#2614-interactions-with-other-rules)
not named in [section 10](#10-resolution-order-interactions-and-surfaces).

## 9. The Herald, and every Unbound daemon

### 9.1 Every daemon advances after a kill

**Ravage, revised:** the Herald makes two attacks a turn, after its Move or
without one; **after a kill it advances onto the victim's tile** (the
forced advance every unit makes, which the design rulings keep), and its
second attack, if it has one left, is made from there. It still cannot Move
after an attack (the advance is no Move). A Proclaim still takes one
attack's place. The Horror and the Imp already advance; the Mass never
does. An advance can carry a bound daemon more than 3 tiles from its
channellers, which breaks it at the next check: the player chooses the kill
knowing it.

**Unbound daemons advance too.** After a rampage attack kills, the daemon
steps onto the victim's tile unless that tile is one the rampage walk never
enters (water, ice, a Rift, a settlement center, a curiosity tile, a chest
tile); then it stays. The Unbound Mass never advances. **Why:** a Herald fed
one cheap unit a turn kills it and stands on its tile, closer to the rest;
the feeding trick now costs ground as well as a unit.

### 9.2 Whom an Unbound daemon goes for

One rule for every Unbound daemon (Imp, Horror, Mass, Herald), replacing
rule 1 of the rampage
([section 26.6](RULESET_7_CURRENT.md#266-unbound-the-rampage-furious-and-bind-again)).
Distances are Chebyshev (tiles in any direction, as the crow flies). Its
**reach** is its Move + 1 (Imp 4, Horror 3, Mass 2, Herald 3). The
candidates are units of any player, never a neutral unit, a unit afloat, or
a burrowed unit, as built.

1. **A cultist within 2.** The nearest **robed cultist** of any Cult seat
   within 2 tiles.
2. **Anyone in reach.** Otherwise the nearest unit within its reach that is
   **not a summon** (not a daemon of any seat, not a Tentacle).
3. **A summon in reach.** Otherwise the nearest summoned unit of a player
   (a bound daemon) within its reach.
4. **Walk on.** Otherwise the nearest unit on the board that is not a
   summon (a summon only when there is no other unit), at any distance: it
   walks toward it and attacks nobody unless it ends beside it.

**Ties inside a step:** a unit of the seat that summoned it, then the
fewest HP, then the lowest unit ID (as built). The walk and the attack are
as built (it walks toward a tile beside the target and attacks it if it
ends beside it). **The Herald's second attack** goes to a unit beside it,
chosen by steps 1 to 3 among the units on its eight tiles (so a cultist
beside it first, then any non-summon, then a summon), by the same ties.

**Why these numbers:** "within 2" is the user's own; "near" is read as
"could be struck this rampage" (its reach), so a daemon never walks past a
soldier at 3 tiles to bite a summon beside it, and never hunts a cultist
across the map: beyond 2 tiles a cultist is just "anyone". The eye mark
(`previewRampageV7`) follows the same rule, so the target stays public.

## 10. Resolution order, interactions, and surfaces

### 10.1 A Cult seat's Start Turn

As built ([section 26.13](RULESET_7_CURRENT.md#2613-resolution-order)) with
these steps in the check:

1. Cooldowns count down (Ribbit, Switcheroo). (No taunt state to clear.)
2. Plague and its chains; the watched units are judged.
3. **The channel check**, each bound daemon in unit-ID order: holding
   strands (each 1, or 3 under a grip), a Brood's strand for an Imp,
   Doorstep for a Mass; short of Control, Unbound at once (rampage,
   Furious), and what that rampage hurts is judged before the next daemon.
4. **The trickle**: +1 for each own Summoner whose strand held for a
   daemon still bound (capped at 30).
5. **Hunger**: 2 Favour for each still bound Herald, in unit-ID order; a
   Herald that cannot be paid is Unbound at once (rampage, Furious).
6. Strands and grips cleared.
7. The rituals, in leader unit-ID order (Star-fall's damage of 6 + 3 a
   chanter; the Great Summoning).
8. The existing steps from Egg hatching on.

### 10.2 Interactions that change

| Other rule                                  | Ruling                                                                                                                                                                                        |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Freeze, Candy statuses, a frog              | A Frozen, Stuck, Splatted, frogged (or otherwise statused) Idol Bearer's idol is down while the status lasts: no halving, no Awestruck, no Doorstep beside it. A Mass may be Frozen or Stuck. |
| Mind Control                                | A mind-controlled Summoner has no Summon and no Tentacle (as built); a mind-controlled Idol Bearer's idol stands for its controller; no summon is mind-controlled.                            |
| Knight Overrun, Escape, Charge!, Sugar Rush | Each is a Move or part of one: beginning beside a Mass, it is one tile. The advance after a kill is not a Move.                                                                               |
| Burrowing                                   | A burrowed unit is not beside a Mass (not on the board); surfacing beside one is no Move.                                                                                                     |
| Blizzard                                    | Never meets the shield wall (one halves Ice Folk units, the other Cult units).                                                                                                                |
| Giants' signatures                          | A Crushing Shove crushes a Mass (it does not yield); no summon is Swallowed or tossed.                                                                                                        |
| Score                                       | Martyr is gone; an Imp counts 2 and a Mass 6 in the Army while commanded; Favour lost to the cap or to Hunger is no Score factor.                                                             |
| Achievements                                | Slayer counts every bound summon's kills; Muster counts trainable roles only, and the Cult still has six land roles and three ships to field the six it needs.                                |
| Capture                                     | The Horror and the Herald capture while bound; the Imp and the Mass never do.                                                                                                                 |
| Elimination                                 | As built: every bound summon is Unbound at once (not Furious).                                                                                                                                |
| Missions                                    | A mission's `favour` is clamped to 30; a mission placing a vacant role is refused.                                                                                                            |

### 10.3 Commands, events, errors, previews, state

- **Commands.** `SUMMON` gains `daemon` (`IMP`, `HORROR`, `MASS`) and its
  `helperUnitId` becomes optional (absent for an Imp, required otherwise).
  New `JOIN_CHANT { unitId, leaderUnitId }`. `TENTACLE` is a Summoner's.
  **Removed:** `BEHOLD`, `PICK_ME`.
- **State.** The `cult` block loses `idols` and `taunts`. A summoned unit's
  `summoned` may be `IMP` or `MASS`; their mechanical roles (a role no rule
  reads, for the raw readers) are decided by the engine bead (proposed:
  the Imp `RAIDER`, the Mass `GUARD`), with neutral breeds `IMP` and `MASS`
  for their Unbound forms. Rituals already list their chanters; a join
  appends one. No state is needed for the aura, Brood, Doorstep, Drag,
  Hunger, or the trickle: each is read from the board at its moment.
- **Events.** `CHANT_JOINED { playerId, unitId, leaderUnitId, damage }`
  (the star's damage after the join); `FAVOUR_GAINED` gains the source
  `TRICKLE` and a field `forfeited` (the part above the cap; `MARTYR` is
  removed as a source); `FAVOUR_SPENT` gains the reason `HUNGER`;
  `DAEMON_UNBOUND` gains `reason` (`STRANDS` or `HUNGER`) and the summoned
  kinds `IMP` and `MASS`. **Removed:** `IDOL_RAISED`, `IDOL_DROPPED`,
  `PICK_ME_SHOUTED`.
- **Errors.** `JOIN_CHANT_NOT_LEGAL` (`EMBARKED`, `RITUAL`, `ADJACENT`,
  `ACTED`, `STATUS`, `CHANTING`); `SUMMON_NOT_LEGAL` gains `TECHNOLOGY` (a
  Mass without Gibbering Masses) and keeps `HELPER` for a Horror or Mass
  without one; `TENTACLE_NOT_LEGAL` gains `TECHNOLOGY`; `ATTACK_TAUNTED`
  names the Idol Bearer (renamed `ATTACK_AWESTRUCK`); the movement refusal
  `DRAGGED`. **Removed:** `BEHOLD_NOT_LEGAL`, `PICK_ME_NOT_LEGAL`.
- **Previews.** `previewSummonV7` takes the summon kind; new
  `previewJoinChantV7` (the star's damage before and after, and the units
  it newly kills); `previewRitualV7` reflects the current chanters;
  the combat preview gains `idolHalved` (true when the shield wall halved
  the hit) and the retaliation reason `SWARMED`; `publicBindingTauntsV7`
  becomes the Idol Bearers that bind a unit; `previewRampageV7` returns
  the step (1 to 4) that chose the target; the movement query honours
  Drag; a channel preview of an Imp names the Imps its Brood holds; a
  Mass's Control preview says `DOORSTEP` when it needs no strand.
- **Text harness.** `.imp.<x>,<y>`, `.summon.u<helper>.<x>,<y>` (the
  Horror, as built), `.mass.u<helper>.<x>,<y>`, `.join.u<stargazer>`;
  `.behold` and `.pickme` removed; the Favour line reads `12/30` with the
  Hunger due; Brood and Doorstep shown in the strands lines.

## 11. Existing saves

Every engine bead below changes rules, so each bumps the ruleset identity
once, by the established pattern: the previous identity joins the prior
list (rejected, never migrated), the autosave key is renamed
(`pulpWars.save.v7rNN.current`, the old key into
`OBSOLETE_SAVE_STORAGE_KEYS_V7`), the headless CLI accepts only the new
identity, and [section 1 of the current rules](RULESET_7_CURRENT.md#1-identity-and-compatibility)
records it. **Every in-progress skirmish and mission save is refused** at
each bump, Cult or not (the save-recovery screen offers Delete, as for any
identity change); **campaign progress survives** under its own key
([campaign, section 2.4](CAMPAIGN.md#24-identity-saves-and-replays)).
Replays of an older identity are refused. Mission revisions of
`FRONTIER_10` and `LAB_CULT_MID` bump where their units change. No
migration is written: the Cult has had no long-lived saves worth carrying,
and every earlier identity bump reset saves the same way. Simulation pins
(`*.sim.test.ts`) that the bumps move are not re-run or re-pinned (the
standing rule; tracked by `pulp_wars-b5pd`); expected to move:
`ruleset-v7-missions.sim.test.ts` (`FRONTIER_10`, `LAB_CULT_MID`),
`ruleset-v7-many-seats-play.sim.test.ts` (nine seats with a Cult seat), and
any pin of the ruleset identity.

## 12. Normal AI

The Cult AI is the four built areas of
[the spec, sections 15.6 to 15.10](RULESET_7_CULTISTS.md#156-as-built-a1-the-cult-seat-on-the-army-policy-pulp_wars-mch99)
(`src/ai/v7-cult.ts`, `v7-cult-channel.ts`, `v7-cult-rituals.ts`,
`v7-cult-against.ts`). Every revision below is a decision on hand-built
states, gated on a Cult viewer or a visible Cult unit as today, reads only
the public view and previews, and is not tuned by simulation. **The aim
changes:** the Cult seat fights with summons and keeps its cultists behind
them, channelling and chanting.

### 12.1 A1 area: the seat on the army rules (`src/ai/v7-cult.ts`)

- **Research order.** Roles: Summoner, Idol Bearer, Hexer, Familiar,
  Stargazer (the Chosen and the Caller removed). From a Gathering opener:
  Leadership, Crafting, Warding Circles, Hunting, Hexers, Familiars,
  Harvest Rites, Engineering, **Gibbering Masses**, Forestry, Stargazers,
  Raiding, **Tentacles**; The Stars Are Right first among the late
  technologies once Favour reaches **9** (half the Herald's 18;
  `CULT_STARS_FAVOUR_V7`). With a hostile unit within 6 of an own city and
  no Mass on offer, Gibbering Masses moves up after Warding Circles (the
  pattern of the Hexers-wanted rule, which stays).
- **The army.** Robed bodies: enough for every daemon's strands plus two
  spare (Initiates first, 2 Coins); Hexers 20%, Stargazers 10%, Idol
  Bearers no more than cities nor a third of the army, Summoners 1 for every
  5 units (at least 1, at most 3), Familiars 1 for 5 units (2 at most).
  `cultChosenCappedV7` and the Caller share are removed. Spare Coins become
  Favour: an Initiate is trained to be Sacrificed when a summon is wanted
  and Favour is short.
- **Cultists do not brawl.** A robed cultist other than the Idol Bearer
  makes an attack only when it kills, when it brings a living enemy to
  broken with a Summoner and a holder ready (a Seizure this turn), or on a
  frog; it makes no Move into a visible enemy's reach unless an own summon
  or Idol Bearer stands nearer that enemy. Every robed cultist but the Idol
  Bearer is a weak link (`cultWeakLinkV7` at any HP); the Idol Bearer is the
  only escort (`cultEscortV7`).
- **Bodies first** and the rewards stay (Militia, the Familiar at level 3,
  the Thing at every level from 5).

### 12.2 A2 area: channel, summon, Favour (`src/ai/v7-cult-channel.ts`)

- **Brood planning.** The channel plan treats each group of own Imps that
  stand together as one daemon of Control 1 per three Imps: one channeller
  for a Brood, with one spare for a Brood of three. Imps' Moves end beside
  another Imp of their Brood and within 3 of its channeller when the
  ordinary scoring offers such a tile; a kill may break that.
- **Doorstep.** A Mass on its Doorstep is given no channeller. A Mass makes
  no Move off its Doorstep unless a channeller can follow it the same turn.
  An Idol Bearer that holds a forward Mass by its Doorstep is held beside it
  (it may attack, not leave).
- **What to summon** (one summon a turn per Summoner, the old priority
  1910):
  1. **A Mass** when an own city center is watched (the garrison rule of
     section 15.10) and no own Mass stands on or beside it, Favour is 5 or
     more, and a helper stands by: on the tile beside the center nearest
     the enemy (or on the center when the Summoner can step off it first).
  2. **A Horror** when Favour is 4 or more beyond the Herald's savings (A3
     area) and a helper stands by, with an enemy unit or center within 6
     (as built).
  3. **An Imp** when Favour is 2 or more and an enemy unit or center is
     within 8: beside an own Imp that has fewer than two Imps beside it
     when one can be reached, so the Brood holds it.
  4. **The cap.** At 26 Favour or more the seat summons the best it can
     even with no enemy near (Favour above 30 is lost).
- **Herald Hunger.** The seat never spends below 2 Favour for each bound
  Herald; at the end of its turn with less, it Sacrifices a spare Initiate
  beside a Summoner (the Sacrifice rule (b) of section 15.7, extended), and
  if it still cannot pay it treats the Herald as one that cannot be held
  (released toward the enemy, its cultists step away; rule 5 of section
  15.7).
- **The trickle.** A Summoner with no Summon, Seizure, Sacrifice, or
  Tentacle step channels (it was the last channeller chosen; it now comes
  before an Initiate that has a village or a Seizure to hold).
- **Offering** pays 6: the thresholds read the new prices (below 2 for an
  Imp, below 4 for a Horror, below 18 with The Stars Are Right); the pace of
  section 15.10 rule 3 (one a round at most, one every other round on
  average) stays; never when it would pass the cap.
- **Behold!** The Behold! step (1920) is removed. In its place, a free Idol
  Bearer ends its Move on the tile beside the most own channellers and
  summoners that a visible enemy can reach, between them and the enemy
  (the garrison rule keeps one on a watched center first).
- **The lodge's garrison** (section 15.10 rule 1): the Mass joins the
  garrison list as the best garrison by worth (a daemon was excluded); the
  Chosen leaves it.

### 12.3 A3 area: rituals and tricks (`src/ai/v7-cult-rituals.ts`)

- **Star-fall alone.** The Stargazer begins when the best mark is worth it
  at **6** damage (the mark rule of section 15.8 rule 7: two hostile units,
  or one that stays; worth counted at the damage the star will have with
  the chanters it can expect, see the next item). It no longer calls a
  chanter before beginning.
- **Join the chant.** After the begin, each free robed cultist (not
  claimed by the channel plan, unacted) that is beside the Stargazer, or can
  step beside it to a tile no visible enemy can attack, joins while each
  join turns one more hostile unit on the nine tiles into a kill, or while
  the mark holds three hostile units or more. The priority sits just below
  the begin (1860, the joins 1859).
- **Switcheroo** reaches 4: the rules of section 15.8 rule 13 read the new
  range; nothing else changes.
- **The Tentacle** is the Summoner's: a Summoner with Tentacles and no
  Summon, Seizure, or Sacrifice step calls one by the rule of section 15.8
  rule 14 (the Caller's).
- **Pick Me!** (rule 15) is removed.
- **The Herald's advance.** Its two attacks are scored with the advance:
  a kill whose advance leaves it more than 3 tiles from the channellers it
  needs is scored below every attack that does not, unless the second
  attack from the new tile is a kill too. (The Great Summoning's thresholds,
  18 and saving from 9, are read in A-R1 with the other prices.)
- **Swarm.** An Imp attacks a unit with another own Imp already beside it
  before one with none (the unanswered attack), and the second Imp's Move
  goes beside the target first.

### 12.4 A4 area: every seat against the Cult (`src/ai/v7-cult-against.ts`)

- **Hunt the strands** reads Brood (a channeller of a Brood is worth every
  Imp it holds: 2 Favour each) and Doorstep (a Mass on its Doorstep has no
  strand to break; one held beside an Idol Bearer is broken by putting a
  status on the bearer or killing it).
- **The warden.** A shot on a unit beside a standing idol is halved (the
  combat preview says so): the ordinary scoring sees it; added, the Idol
  Bearer is worth the strands and joiners it shields when the seat has
  ranged units (shoot the bearer, or put a status on it, then the rest).
  The Pick Me! Move rule (rule 11 of section 15.9) becomes **Awestruck**:
  a Move that ends beside a standing idol from a tile that is not has at
  most a routine Move's priority unless it is a Move onto a center, a
  village, or a chest, or its unit's attack on the Idol Bearer kills.
- **Drag.** No routine Move ends beside a hostile Mass (it would hold the
  unit next turn) unless the unit attacks the Mass or the center it guards.
- **Star-fall's joiners** are chanters: a hit on one is worth 3 damage off
  the star for every own unit under it; a hit on the Stargazer ends it.
- **Hunger.** A hostile Herald whose seat's public Favour is below its
  Hunger is about to break: the eye-mark avoidance of rule 7 applies to it.
- **Unbound targeting** comes from `previewRampageV7`; the policy's own
  copy of the rampage rule (rule 7's eye mark for a bound daemon short of
  its Control) follows the four steps.

### 12.5 As built: A-R1, the army rules and Favour (`pulp_wars-mch9.38`)

Built on hand-built states only (`tests/unit/ruleset-v7-cult-army-favour-ai.test.ts`
and the revised `ruleset-v7-cult-ai`, `-channel-ai`, and `-rituals-ai`
tests; each rule was seen to fail its test with the rule switched off). No
rule changed and the ruleset identity did not move. No match was played.
The code is `src/ai/v7-cult.ts`, `src/ai/v7-cult-channel.ts`, and the
hooks in `src/ai/v7.ts`; the prices, the cap, and the Hunger are read
from the engine's constants. Decided here:

1. **Research** as section 12.1. Harvest Rites and Gibbering Masses are
   bought before the Stargazer's technologies, Tentacles after the last
   unit of the order (before Roads and the late technologies). "No Mass on
   offer" is read as "without Gibbering Masses"; the Masses rule waits for
   Leadership (only a Summoner summons a Mass) and Warding Circles, counts
   any visible hostile land unit within 6 of an
   own city (a garrison at home too), and gives way to the Hexers-wanted
   rule when both apply.
2. **The army.** One Summoner for every five units; the Chosen's cap is
   gone. Bodies first wants the larger of the seat's cities and two and
   every own daemon's Control + 1 and two (`cultBodiesWantedV7`), and one
   more while an Initiate is wanted for its Favour (`cultFeedWantedV7`: an
   own Summoner has an enemy unit or center within 6, and one Initiate's
   value brings Favour to the Horror's price, or with The Stars Are Right
   the Great Summoning's, beyond the Hunger kept); that Initiate's training
   is worth 150 more. The Sacrifice itself is the rule (b) of section
   15.7, which reads the same thresholds.
3. **Cultists do not brawl.** A caster (every robed cultist but the Idol
   Bearer) attacks only for a kill, a frog, a blow that leaves a living
   enemy broken where an own Summoner beside it (or offered a Move beside
   it) can Seize it with a holder this turn (checked with `previewSeizeV7`
   on the board as it would stand), or when the visible enemy kills it
   where it stands anyway (its doomed Sacrifice follows). Its Move may not
   end in a visible player unit's reach that it was outside of, nor nearer
   such a unit inside it, unless an own summon or Idol Bearer stands
   strictly nearer that unit (so it never steps beside an enemy level with
   its screen); a plan step, a Move onto a center or village, and a Move
   from which its own attack kills are exempt. The Idol Bearer is the only
   escort; the casters are the weak links at any HP. Switcheroo's "two own
   melee units" no longer counts casters (they would not strike).
4. **Favour and the Hunger.** The seat keeps 2 Favour for each own bound
   Herald: a Horror needs its price beyond that (and, while saving, the
   Great Summoning's price beyond it too), the Great Summoning 18 beyond
   it. Saving starts at 9 and The Stars Are Right is due at 9. Short of the
   Hunger (counting the trickle of Summoners that hold a strand and an
   Offering that is due), a free Summoner Sacrifices a spare Initiate
   beside it (one the daemons' Control does not need; at the Sacrifice's
   priority, both kept for it) or else channels for the trickle; a Herald
   still unpaid, the highest unit IDs first, is let go as one that cannot
   be held (no channeller, released toward the enemy, the own units near
   it step away). Kills during the turn are not forecast: the plan is made
   again at every decision, so a Herald that kills is fed again.
5. **The cap.** From 26 Favour a Horror is summoned with no enemy near;
   an Offering is never made when its 6 would pass 30, and it is made
   short of the Hunger too; no Summoner channels for the trickle at 30.
   (With too few bodies for a Horror the seat still forfeits at the cap:
   a daemon it cannot hold would break loose on it.)
6. **The trickle's channeller.** Free cultists are asked to channel in
   this order: plain cultists, a Summoner with nothing better to do, an
   Initiate with a village to take or beside a broken enemy a Summoner
   with its action stands near, an Idol Bearer, a Summoner with a
   Seizure, a Summon the seat would make, or a Tentacle that slaps an
   enemy. A Summoner with nothing better to do also channels a held
   daemon beyond its Control + 1, from a tile no visible enemy can attack.
7. **The warden.** At 1920 (Behold!'s old place), an Idol Bearer whose
   idol stands, that holds no strand, is in no ritual, is not on an own
   center, and stands more than 2 tiles from every empty own center a
   hostile unit within 6 watches (the garrison rule first), moves to the
   offered tile beside the most casters a visible enemy can attack next
   turn (channellers on their planned tiles, ritual members, Summoners,
   Hexers, Stargazers; none another standing idol covers), only when it
   covers more than its own tile, then nearest the enemy, never where the
   visible enemy kills it. A bearer that covers some ends no Move where it
   covers fewer (an own center excepted).
8. **The Summoner's Tentacle** (12.3's ordering, in A-R1 at the root's
   request): the plan takes the rituals' Tentacle step back from a
   Summoner that has a Summon, Seizure, or Sacrifice step (the doomed
   unit's included), and a Summoner with a Tentacle to make is no trickle
   channeller.

**Left for later.** A-R2: Star-fall's mark and joins at the new numbers,
Switcheroo at 4, the Herald's advance in its scoring (the Herald's
two-attack stop-gap stands). A-R3: what to summon (the Imp, the Mass, the
Horror; today only the Horror), Brood, Doorstep, Swarm, and the Mass in the
garrison; the cap rule then summons "the best it can". A-R4: every seat
against the new Cult.

### 12.6 As built: A-R2, rituals and tricks (`pulp_wars-mch9.39`)

Built on hand-built states only (the A-R2 tests of
`tests/unit/ruleset-v7-cult-rituals-ai.test.ts`; each rule was seen to
fail its test with the rule switched off). No rule changed and the ruleset
identity did not move. No match was played. The code is
`cultRitualPlanV7` in `src/ai/v7-cult-rituals.ts`, two tools the channel
plan hands it (the danger on a tile with some units gone, and a projected
board with units gone), and one hook in `src/ai/v7.ts` (an attack the plan
vetoes is no candidate). Decided here:

1. **Star-fall alone.** The mark rule is unchanged (two hostile units, or
   one that stays; no own or friendly unit on the nine tiles), but its
   worth is counted at the damage of the chanters the star can expect
   this turn (rule 2, asked as if it were begun there), so a mark that a
   join turns into kills can win over one that only the lone star hurts.
   The hits are the public forecast's at any number of chanters (fixed
   damage; Armoured, Plated, and Shields apply). Nobody is called before
   the begin.
2. **Who joins.** A free robed cultist with Join the chant: not held by the
   plan, unacted, no frog, in no ritual, and **never a Summoner** (its
   action is kept for its Summon, Seizure, Sacrifice, and Tentacle). Those
   beside the Stargazer are asked first, then those that can step beside
   it to a tile no visible enemy can attack and under no own mark (never
   from an own center), the cheapest first, then the nearest. The step is
   a plan step at the joins' priority (1859); the join follows it in the
   same turn. One join or step a decision, so the next reads the star after
   it, and each join is checked against `previewJoinChantV7`.
3. **When it joins.** While the join turns one more hostile unit on the
   nine tiles into a kill, **counting the unexposed joins that can still
   follow it this turn** (two joins that kill together are each worth it),
   or while the mark holds three hostile units or more
   (`CULT_STARFALL_CROWD_V7`) and one of them still stands under the star
   as it is. Never when the join (or a join it counts on) kills a unit of
   the seat or of a friend. **An exposed joiner** (one a visible enemy can
   attack where it chants: it cannot move after the join, and any hit takes
   it out of the chant) joins only for a kill worth at least its own cost,
   and never where the visible enemy kills it; the crowd alone is not
   enough for it.
4. **Switcheroo at 4.** The rules of section 15.8 rule 13 read the engine's
   offered swaps at the new range. Added, since a swap now reaches deep
   into the enemy: the swap that sets up a Seizure is never made where the
   visible enemy kills the Familiar on its new tile (the drop of a shooter
   already had that rule).
5. **The Summoner's Tentacle against Seizure set-ups.** A Summoner that a
   Seizure may need this turn calls no Tentacle: the Summoner of a company
   (a Summoner and a holder that can stand beside the victim) for a
   visible hostile land unit that can be Seized now, or that the beating on
   offer leaves broken (a frog at half). The beating is the attacks offered
   now, no Summoner's and no held unit's, with A-R1's casters striking on
   A-R1's terms: every blow on a frog, else only the one blow, after the
   others, that breaks the enemy (or kills it). (A-R1 already took the
   Tentacle back from a Summoner with a Summon, Seizure, or Sacrifice step.)
6. **Ribbit's beating** reads the same beating: the target will be a frog,
   so every caster's blow counts (A-R1 lets a caster strike a frog), and no
   Summoner's blow does (it keeps its action for the Seizure).
7. **The Herald's advance.** Its attacks are scored with the advance onto
   each victim's tile, and its second attack after a kill is read from that
   tile with the victim gone. A kill whose advance takes it from a tile its
   channellers can hold it on (`daemonMayEnd`: the holders within 3, the
   free cultists within their step) to one they cannot is made only when
   the second attack from there kills too; **a lone kill off its leash is
   never made** (scored below every attack and below no attack at all: it
   would trade the bind of an 18-Favour Herald for one unit). A pair whose
   Move and advances leave it where the visible enemy, less its victims,
   kills it next turn is not made either (unless it stands in lethal reach
   already, or stays where it stands). Its attacks are now plan steps
   (3970, in the plan's order), and every other attack of the Herald, and
   every kill the plan does not make, is vetoed (`CultPlanV7.mayAttack`);
   a Proclaim takes the second attack's place when no allowed kill is on
   offer. Unchanged: the Herald still scores no wound-then-kill of one unit
   (two attacks on the same target).

**Left for later.** A-R3: what to summon, Brood, Doorstep, Swarm. A-R4:
every seat against the joiners, the warden, and the advance. Noted for
A-R3: the trickle's channeller (A-R1, rule 6) does not yet read rule 5
above, so a Summoner a beat-then-Seize needs may still be asked to channel
when no other cultist can.

### 12.7 As built: A-R3, the summons (`pulp_wars-mch9.40`)

Built on hand-built states only (`tests/unit/ruleset-v7-cult-summons-ai.test.ts`
and the revised `-channel-ai` and `-army-favour-ai` tests; each rule was
seen to fail its test with the rule switched off). No rule changed and the
ruleset identity did not move. No match was played. The code is
`cultPlanV7` in `src/ai/v7-cult-channel.ts`, the Brood helpers and the
upkeep in `src/ai/v7-cult.ts`, the Herald's scoring and the shared Seizure
company (`cultSeizureToolsV7`) in `src/ai/v7-cult-rituals.ts`, and three
hooks in `src/ai/v7.ts` (the garrison list, the advance check, the danger
with victims gone). Decided here:

1. **What to summon**, by class, then by tile (`CULT_SUMMON_CLASS_V7`;
   one summon a turn per Summoner, its price always beyond the Hunger kept
   and, while the seat saves, beyond the Great Summoning's):
   1. a **Gibbering Mass** beside an own city center that a hostile land
      unit outside its own land watches (within 6, the garrison rule) and
      that no own Mass stands on or beside, on the tile nearest the enemy
      (the summon's tile rule forbids the center itself; the Mass steps on
      later as a garrison, rule 6);
   2. a **Mass beside an own standing idol** with no Mass beside it that
      shields a caster a visible enemy can attack (the circle's guard),
      nearest the enemy;
   3. a **Horror** with an enemy unit or center within 6 of the Summoner
      and the bodies for every daemon's Control and spare plus its two;
   4. **at the cap** (26) with no front asked: a Mass by any own city no
      Mass guards, then a Horror, then a Mass beside any standing idol
      with no Mass beside it (with no enemy near, a wall its Doorstep holds
      comes before a fighter with nobody to fight);
   5. an **Imp** with an enemy unit or center within **8**
      (`CULT_IMP_FRONT_V7`): beside an own Imp that has fewer than two Imps
      beside it first (its Brood will hold it; then it needs only the
      bodies for every daemon's Control and the Summoner), else with a body
      for its strand beyond every Control and spare; out of the visible
      enemy's reach first, then nearest the enemy.
      With 2 or 3 Favour and an enemy within 8 the seat summons an Imp (the
      early game); from 4 with a helper a Horror. A Summoner a Seizure may
      need this turn summons nothing and makes no spare Sacrifice.
2. **Thresholds.** The Imp's 2 joins the Horror's 4 and the Great
   Summoning's 18 in the spare Sacrifice (rule (b)) and in the Initiate
   trained to feed (`cultFeedWantedV7`); a Summoner with a Tentacle that
   slaps an enemy calls it instead of a Sacrifice made only for an Imp's 2.
   The seat is short (Sacrifice, Offering) with the bodies for one more
   Imp (was a Horror's two).
3. **Brood planning** (`cultBroodLeadsV7`, checked against the engine's
   `impBroodV7`): each decision the own Imps are grouped as the check
   would hold them; the fewest Imps are channelled (an Imp with a strand
   of its own leads; then the Imp that covers the most, nearest the
   cultists). A lead wants one strand, and one to spare for a Brood of
   three; the others want none (`cultUpkeepV7` and the bodies wanted
   count the same). An Imp a Brood holds ends a Move beside a held lead
   with room, or where a free cultist can follow it; a lead ends no Move
   away from an Imp of its Brood that has moved already; an Imp's advance
   after a kill may break its Brood. An Imp no cultist can hold goes back
   beside a held lead whose Brood can take it (the RETURN step).
4. **Doorstep.** A Mass on its Doorstep is given no channeller and wants
   none; it ends a Move only on its Doorstep or where a channeller can
   follow it; one that needs a strand goes back onto its Doorstep when it
   cannot be held. An Idol Bearer that alone holds a forward Mass (no own
   center beside it, no strand of its own) ends no Move away from it (it
   may attack) and makes no warden's step away from it. A free Idol Bearer
   whose idol stands steps beside a Mass that needs a strand (at the
   channel's priority, reason `DOORSTEP`), so no cultist channels it.
5. **Swarm.** The second Imp's Move goes beside a hostile land unit an own
   Imp already stands beside (`CULT_SWARM_MOVE_PRIORITY_V7`, 3945), then
   each Imp's attack that the preview says is `SWARMED`
   (`CULT_SWARM_PRIORITY_V7`, 3940; kills first, then the target's
   worth); never on a unit kept for a Seizure, and a kill's advance only
   where the plan lets the Imp end it.
6. **The garrison list** takes the Mass (a wall of 30 HP its Doorstep
   holds on the center); every other daemon stays out of it.
7. **The Summoner a Seizure may need** (A-R2's company, now shared as
   `cultSeizureToolsV7`) is busy: no trickle strand, no spare strand (no
   busy Summoner gives a spare strand), no Summon, no spare Sacrifice.
8. **The Herald's wound-then-kill.** A first hit that kills nothing is
   paired with a second hit on the same unit when the second kills it (the
   target and the Herald at the Hit Points the first leaves them); the
   pair is scored and vetted like any other (the leash, lethal reach).
   Found here and fixed: the danger with victims gone (A-R2's lethal-reach
   check) counted only the enemies that strike from where they stand; it
   now counts their reach after a Move too.

**Left for later.** Every seat against the Brood, the Doorstep, Swarm,
and Drag is A-R4's (section 12.8, built alongside). C-R1: mission 10
and the lab can now field Imps and Masses on the Cult side; their starting
Favour and Gibbering Masses decide which. Not built: the Mass's tile
"on the center when the Summoner can step off it first" (a summon never
lands on a settlement center, section 7.1); the Swarm Move does not weigh
the danger to the Imp it sends.

### 12.8 As built: A-R4, every seat against the new Cult (`pulp_wars-mch9.41`)

(Numbered 12.8 so that A-R3's own notes, written at the same time, take
12.7.) Built on hand-built states only (the A-R4 tests of
`tests/unit/ruleset-v7-cult-against-ai.test.ts`; each rule was seen to fail
its test with the rule switched off, one rule at a time). No rule changed
and the ruleset identity did not move. No match was played. The code is
`src/ai/v7-cult-against.ts` and one more hook in `src/ai/v7.ts` (a Bolas or
a Ribbit on a hostile Idol Bearer is valued by the policy). It reads the
public view, the public combat and ritual previews, and the engine's public
helpers `rampageChoiceV7` (the Unbound target rule) and `standingIdolsV7`;
it imports no reducer and draws nothing from the PRNG. Every rule stays
behind `cultAgainstFactsV7`, which is null without a hostile Cult mark (now
including a hostile standing idol), so a match without a Cult seat decides
byte for byte as before (the gate test still compares the whole candidate
lists with the module on and off). Decided here:

1. **Brood.** The channelled Imp of a Brood is worth its own price and 2
   for every Imp the Brood holds (the public `broodOf`), so its channeller
   is worth every Imp on the strand (a strand of three Imps: 24, against 8
   for one); the kill of that Imp adds the Imps it frees (8 each). A strand
   to a daemon held without strands (a Brood's Imp, a Mass on its
   Doorstep) is worth nothing and never decisive.
2. **Doorstep.** A strandless Mass on its Doorstep held only by one
   standing idol (no own city center beside it, no second idol) makes that
   Idol Bearer worth the Mass (20): its kill goes first at 1286 (the old
   ward's priority, just above the strand hunt's 1285), and so does a Bolas
   or a Ribbit on it, the status that puts the idol down, even when the
   general rules see no worth in a status on that unit. A Mass two idols
   hold, or one beside a center, is left to the ordinary scoring.
3. **The warden.** For a seat with a unit that attacks from two tiles or
   more, a standing idol is worth half of the strands and chanters on its
   eight tiles (`CULT_AGAINST_SHIELD_SHARE_V7`, a judgement): its kill or a
   status adds it all, a blow on the way adds it in proportion to the Hit
   Points taken. A shot the shield wall halves (`idolHalved`) that does not
   kill is worth the damage it lost less, so a melee blow on the same unit
   ranks first. (A halved shot still breaks a strand or a chant: any damage
   does.) **Awestruck** replaces Pick Me!'s Move rule: a Move worth more
   than a routine one that ends beside a standing idol from a tile that is
   not falls to a routine Move's priority (735), unless it ends on a
   center, a village, or a chest, or the unit's attack on a bearer beside
   it kills from there (the combat preview on the board after the Move).
4. **Drag.** No routine Move ends beside a hostile bound Mass from a tile
   that is not, unless onto a site or on or beside a hostile center a Mass
   guards (on or beside it: the siege). A Move worth more than a routine
   one (an attack's approach) is not stopped. An attack on a bound Mass that
   does not kill it is no candidate from a unit that has an offered hit
   breaking a hold instead (a strand that matters, a ritual's participant,
   or the bearer holding a Mass). Multi-tile Moves from beside a Mass are
   the engine's: the movement query offers one tile. An Unbound Mass stays a
   lone monster (`src/ai/v7-curiosities.ts`: no routine Move in its reach).
5. **Swarm.** No Move ends beside two or more of one hostile seat's bound
   Imps, from a tile beside fewer, when it matters: always for a routine
   Move, and for any other when the visible enemy kills the unit there;
   unless onto a site, or when the unit's attack from there kills one of
   them (the Swarm is broken). A unit beside two steps to a tile beside
   fewer at 890 (after its attacks, as the eye mark), never off a site.
6. **The joiners.** Every chanter of a hostile star carries what one chanter
   fewer spares the seat (the public forecast at one chanter less: 3 on
   every own unit under the star, after Armoured, Plated, Shields, and its
   Hit Points). A hit on one is worth twice that and 2; when one chanter
   fewer leaves an own unit alive that the star would kill, the hit is put
   first at 1245 (the hit on a star's leader, as built). Decided: no guess
   at joiners to come: every join is made in the casting turn, so the star
   another seat sees in its own turn has its final chanters.
7. **Hunger.** A hostile bound Herald (not short of strands) is about to
   break when its seat's public Favour, with the trickle of its Summoners
   whose strands hold, cannot pay 2 for it and every lower-ID Herald of the
   seat: it is short, so its eye mark is minded (rule 7 of
   [the spec, section 15.9](RULESET_7_CULTISTS.md#159-as-built-a4-every-seat-against-the-cult-pulp_wars-mch912)) and
   its strands are not hunted (it breaks anyway).
8. **The eye mark** is the engine's own target rule (`rampageChoiceV7`
   within the daemon's reach, the board as it would stand after the Move):
   a robed cultist within 2 first, then anyone in reach who is no summon,
   then a summon. So a Human unit beside a short Horror is not marked while
   a cultist stands within 2 of it, and a Cult seat's own cultist is, which
   is the "2-tile range only matters for cultists" of the brief.

**Left for later.** The Herald's second attack after an advance is not
forecast (only its first target is the eye mark); a status other than a
Bolas or a Ribbit (a frog, Plague, a bite) put on a bearer by an attack is
valued only as the attack. No number was tuned (no simulation).

## 13. Interface

All targeting stays on the board ([board targeting](../ui/BOARD_TARGETING.md));
every number comes from the public view and previews; the Newsstand style
tokens hold; the Motion setting is respected; nothing overflows a phone.
The tile icons and the chooser are the system of bead `pulp_wars-2yc.60`.

- **Favour** reads "n / 30" in the HUD chip and the leaderboard; candles
  over the cap fly to the chip and puff out ("+3, 1 lost"). A Herald's card
  shows "Hunger 2"; at the Start Turn the chip shows the trickle (a candle
  from each Summoner that paid) and the Hunger (a candle to each Herald).
  End Turn with Favour below the Heralds' Hunger asks once: "The Herald
  will go hungry and break loose." with Back and End turn.
- **Summon.** A selected Summoner's summon tiles carry an icon for each
  summon it can call there (Imp, Horror, Mass, with its price), and the
  chooser opens when a tile offers several; the Summon button stays in the
  bar and arms a summon whose kind is chosen in the same chooser. The
  helper is picked on the board as built (when several could help); the
  Imp needs none.
- **Join the chant.** When a cultist that may join is selected, the
  pending Stargazer's tile carries a **join icon** (a candle and "+3"); a
  tap joins. The star's nine tiles update their labels ("−9", red where it
  now kills) on the preview of the focused join. The Stargazer's circle and
  the countdown are as built; a joiner gets the chanter's ring and candle.
- **Behold!** The chalk ring round a standing idol is always drawn (no
  button); it is hidden while the idol is down. A shot aimed at a unit
  inside the ring shows its halved damage with a small idol mark; enemies
  beside the idol show the awestruck tether (the old Pick Me! tether) and
  their other attack marks are grey with the reason "Awestruck: only the
  Idol Bearer".
- **The Gibbering Mass.** A dark ooze ring on its eight tiles marks Drag;
  a hostile unit that begins beside it has its one-tile reach and the
  reason "Dragged". On its Doorstep its Control pip is a small house (held
  without a strand); off it, an ordinary pip.
- **Brood.** The strand runs to the channelled Imp; a short green link
  joins it to each Imp it holds; each Imp's pip is lit when held.
- **Swarm.** The combat preview of an unanswered Imp attack reads "Swarmed:
  no strike back".
- **Unbound targeting and advance.** The eye mark is unchanged; the cursor
  sentence names the reason ("goes for the nearest cultist within 2").
  The advance after a kill plays the existing advance step for the Herald.
- **Switcheroo** outlines its reach of 4; the Tentacle's button and tiles
  move to the Summoner.
- **Removed:** the Behold! and Pick Me! buttons, the "ME!" bubble, the
  Caller's and the Chosen's cards, Martyr's line, their glossary entries,
  and their Gallery cells (empty, section 4.2).
- **Glossary** (`src/render/unit-glossary-v7.ts`, plain words, no
  formulas): Imp, Brood, Swarm, Gibbering Mass, Doorstep, Drag, Behold! (new
  text), Awestruck, Join the chant, Hunger, the trickle, the Favour cap, the
  Herald's advance, the Unbound order.
- **Sounds** reuse the Cult's own and the game's existing sounds (the
  summon sound for the Imp and the Mass, the chord for a join); any new
  clip is a later, separate bead.

## 14. Art

Through the checked-in PixelLab pipeline only, light from the south-west,
in [the Cult's direction](../art/factions/CULT.md#summoned-units) (summons
in rubbery deep-sea teal, cultists in indigo robes):

- **The Imp** `UNIT:CULT:IMP` (`chibi-direction-cult-imp`), a
  `STANDARD_UNIT` 56 x 80: a small teal imp-thing on two short legs, bat
  wings too small to fly, a long thin tail ending in a spade, one big
  yellow eye and a wide cream grin, a tiny brass ring through one ear;
  clearly smaller than the Horror and told from the Tentacle (one limb) and
  the Familiar (an indigo toad-cat) by its upright stance. **Unbound look**
  `UNIT:CULT:IMP_UNBOUND` (red eye). Portrait `PORTRAIT:CULT:IMP` (whole
  figure, `icon` class, as the other summons).
- **The Gibbering Mass** `UNIT:CULT:MASS` (`chibi-direction-cult-mass`),
  a `LARGE_UNIT` 72 x 88: a low, wide, heaving teal heap, wider than tall,
  covered in small cream mouths (some open, babbling) and a scatter of
  yellow eyes, a few short grasping tendrils at its base reaching outward
  (the Drag); no collar, no hat (told from the Thing, a mound with a
  trapdoor collar and party hat, by its mouths, its flatter outline, and its
  smaller size). **Unbound look** `UNIT:CULT:MASS_UNBOUND`; portrait
  `PORTRAIT:CULT:MASS`.
- **Icons** for the summon chooser (the three summon heads; the portraits
  may serve), the join icon (a candle with a plus), the Doorstep pip (a tiny
  house), and the Hunger chip (an empty bowl or a mouth); the Drag ring and
  the Brood links are drawn in code.
- **Retired:** the Caller (`chibi-direction-cult-caller`, its portrait) and
  the Chosen (`chibi-direction-cult-chosen`, its portrait) leave the runtime
  manifests, the Gallery, and `public/assets`; the raw generations and
  recipes under `art/pixellab/` stay as history. The art fragment's roster
  table and its "told apart" list drop them and gain the Imp and the Mass.
- **Robed cultists:** bead `pulp_wars-mch9.29` (scarier, more varied robes)
  follows the engine's roster bead, so it draws the final six.
- A first sample (the Imp, the Mass, and one Unbound look) is reviewed at
  native and enlarged size before the rest; the review command is the
  existing `npm run art:chibi-cult-direction-review` extended to the new
  subjects.

## 15. Campaign and labs

Only two missions seat the Cult: campaign **mission 10, The Stars Are
Right** (`FRONTIER_10`, revision 2) and the hidden lab **`LAB_CULT_MID`**.
No other mission places a Caller or a Chosen.

**Mission 10** ([campaign, section 11.11](CAMPAIGN.md#1111-the-stars-are-right)
and [section 11.14](CAMPAIGN.md#1114-campaign-difficulty-pass-c-missions-8-to-10-pulp_wars-v6429)):

- **Units.** The lodge places two Chosen (`SWORDSMAN` at 9,2 and 11,4) and
  a Caller (`KNIGHT` at 9,4). Proposed: the Chosen on the goat path side
  (9,2) becomes an **Idol Bearer** (the ring's warden beside the
  Summoners), the other Chosen (11,4) an **Initiate**, and the Caller a
  **Hexer**. The roster bead makes this swap so the mission still loads;
  the retune bead confirms or changes it.
- **Technologies.** Proposed: add Engineering and Metallurgy (Gibbering
  Masses) to the lodge so its AI raises Masses on the summit, the
  defensive answer the old ring got from its Chosen; keep Chivalry
  forbidden (no Tentacles).
- **Favour.** 9 → **8** with the Herald at 18 (the same share of the
  clock); the cap does not bind it.
- **Text.** The briefing's "every Chosen who dies a martyr feeds the Great
  Summoning" and the hint naming the ring's Chosen change (Martyr is gone);
  the objective line reads "at 18, the Herald"; the hints name the new trick
  (Catapults on the Masses and the Idol Bearers, then the Summoners; Imps
  in packs go for your Catapults).
- **Difficulty.** The mission's difficulty pass (an autopilot that must
  lose, two hand-played wins) was set on the old Cult. The new one is
  softer in the ring (cultists of 7 HP) and harder around it (Imps from
  round 1, Masses on the summit, Hunger that may unbind the Herald on the
  player's side). Replaying it is a hand-played game and the autopilot is a
  `play-text` run: both are **skipped under the standing no-simulation
  rule** and wait for the user's word; the retune bead records the skip and
  the changes in the campaign design's section 11.
- **Revision** 2 → 3 (the canonical hash pin moves with it; a
  revision bump does not change the ruleset identity).

**`LAB_CULT_MID`:** the Caller (3,6) becomes a Hexer and the two Chosen
(6,4 and 6,10) an Idol Bearer and an Initiate; it gains Gibbering Masses
(it owns Engineering already) and keeps Tentacles (Chivalry); Favour 12
stays; revision 1 → 2. Still never played (the hand-play check runs only if
the user asks).

## 16. Decisions made

The user's own decisions are the approved proposal (section 1). These are
the design's, each within it; the first five are at the top of this
document.

1. The Caller's and the Chosen's slots are vacant; Chivalry becomes
   Tentacles, Metallurgy Gibbering Masses; Martyr is retired.
2. The Imp: Summoner alone, 2 Favour, Brood, Swarm, no capture; every Cult
   seat starts with 2 Favour.
3. The Mass: 5 Favour, helper, Doorstep (city center or a standing idol),
   Drag (one tile), immovable, no capture, no advance.
4. Favour cap 30 (excess lost); Hunger 2 a turn per Herald, unpaid it
   breaks loose; trickle +1 per Summoner; Offering 6; prices 2 / 4 / 5 / 18;
   kills keep their full value.
5. Robed cultists at 7 HP (Attack 1.5, the Summoner 1); the Hexer 3 Coins,
   the Stargazer 7; the Idol Bearer keeps its body; Behold! no longer keeps
   strands.
6. The Horror stays at Leadership (with the Imp), Control 1, Boo!, its
   numbers; only its price falls.
7. Only a Summoner summons (the Mass included): one unit, one family of
   buttons, one AI plan.
8. The aura's idol stands while the bearer has no status; a hit does not
   drop it.
9. The shield wall halves attacks from two or more tiles, rounded up,
   before Armoured, Plated, and Shields (the Blizzard precedent); fixed
   damage is not halved; the bearer is not covered by its own idol.
10. Star-fall: 6 alone, +3 a chanter, no cap; nobody joins at the begin;
    joining is the joiner's primary action, in the casting turn only; the
    Great Summoning keeps its joining at the begin and gets no `JOIN_CHANT`.
11. Switcheroo: range 4 only; own summons stay out of reach.
12. The Tentacle: the Summoner's, free of Favour, one per Summoner, the
    Caller's numbers.
13. Every daemon advances after a kill, bound or Unbound, except the Mass;
    an Unbound one stays when the tile is one the rampage never enters.
14. One Unbound target rule for every summon: a cultist within 2, anyone
    within its reach (Move + 1), a summon within reach, else the nearest
    non-summon; ties as built; the Herald's second attack by steps 1 to 3
    among its neighbours.
15. Start Turn order: channel check, trickle, Hunger, then the rituals.
16. Mission seats' Favour is clamped to 30; placing a vacant role is a
    mission error.
17. The Summon chooser and the join icon use the tile-icon system of
    `pulp_wars-2yc.60`; the bar keeps its buttons.
18. The retired units' art leaves the runtime; the raw generations stay.
19. Mission 10 and the lab swap their Chosen and Callers for an Idol Bearer,
    an Initiate, and a Hexer; mission 10 gains Gibbering Masses and starts
    at 8 Favour; its replay waits for the user's word.

## 17. Test plan

Every rule is proved on **hand-built states** in the unit tier: a small
board, the few units the rule needs, one command or one Start Turn, and the
events, the state, and the public previews compared. No test plays a
match; nothing new goes into a `*.sim.test.ts` file. Each AI rule is shown
on its state and on the nearest state where it must not fire, and seen to
fail with the rule switched off (the A1 to A4 pattern). The bead that
builds a rule writes its tests; the files are the existing
`tests/unit/ruleset-v7-cult-*.test.ts` and their surfaces and DOM
companions, plus new ones where a rule has no home.

### 17.1 Engine

| Rule                 | Hand-built states and what they show                                                                                                                                                                                                                                                                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vacant slots         | The Cult tree unlocks no `KNIGHT` or `SWORDSMAN`; no training offer, reward, or chest gives one; the "fields this role" helper is false for both; a mission placing either is refused; the Gallery cell is empty; the registry assertion still passes.                                                                                                                                             |
| Robed numbers        | The four robed rows and the two prices match section 4.1; every head-to-head of section 4.3 matches the combat preview.                                                                                                                                                                                                                                                                            |
| Starting Favour, cap | A new Cult seat has 2; a mission's 40 is clamped to 30; a Sacrifice of an Initiate at 29 gives 30 with 1 forfeited (the event says so); a Seizure at 30 gives nothing and is still legal.                                                                                                                                                                                                          |
| Offering             | Pays 6; its conditions unchanged (level 2, population 2).                                                                                                                                                                                                                                                                                                                                          |
| Trickle              | A Summoner whose strand holds a bound Horror pays +1; one whose strand broke, or whose daemon was Unbound, pays nothing; two Summoners on one Herald pay +2; a Summoner holding an Imp's Brood pays +1.                                                                                                                                                                                            |
| Hunger               | A bound Herald with Favour 3 leaves 1; with Favour 1 and no trickle it is Unbound (`HUNGER`), rampages at once, and is Furious; with Favour 1 and a trickle of 1 it is paid; with two Heralds and Favour 3 the lower ID is paid and the other Unbound; a Herald that arrived this turn pays nothing yet.                                                                                           |
| Prices               | Horror 4, Mass 5, Imp 2, the Great Summoning 18; each refused with `INSUFFICIENT_FAVOUR` one below.                                                                                                                                                                                                                                                                                                |
| Summoner's Tentacle  | Offered with Tentacles, refused without (`TECHNOLOGY`); one per Summoner; a mind-controlled Summoner has none; the slap and Grab as built.                                                                                                                                                                                                                                                         |
| Shield wall          | A Marksman's shot on an Initiate beside a standing idol deals 3 (6 elsewhere), with `idolHalved`; the bearer's own hit is not halved; two idols halve once; a Star-fall and a bomb are not halved; a Frozen or frogged bearer halves nothing.                                                                                                                                                      |
| Awestruck            | A Fighter beside a standing idol is offered only the attack on the bearer (`ATTACK_AWESTRUCK` otherwise); beside two bearers, either; a Marksman two tiles off is free; a Whirl beside the idol is free; with the idol down every target is offered again.                                                                                                                                         |
| Star-fall alone      | A Stargazer that has not moved begins with nobody beside it; unacted neighbours are not swept in; at completion it deals 6.                                                                                                                                                                                                                                                                        |
| Join the chant       | A neighbour joins (damage 9, `CHANT_JOINED`), cannot move after; one that moved first may join; one that channelled is refused (`ACTED`), one two tiles off (`ADJACENT`), a frog (`STATUS`), one in a ritual already (`CHANTING`); two joiners give 12; a hit on a joiner leaves 9; a hit on the Stargazer fizzles it.                                                                             |
| Switcheroo           | Legal at 4 tiles, refused at 5 (`RANGE`); every other refusal as built.                                                                                                                                                                                                                                                                                                                            |
| Advance              | A bound Herald that kills stands on the victim's tile and makes its second attack from there; an advance that leaves it 4 tiles from its channellers unbinds it at the next check; an Unbound Herald advances, except onto a center or ice; a Mass never advances.                                                                                                                                 |
| Unbound target       | An Initiate at 2 and a Knight at 1: the Initiate. An Initiate at 3 and a Knight at 3: the Knight (anyone). A bound Horror at 1 and a Fighter at 5 (beyond reach): the Horror. Nothing in reach: the walk toward the nearest non-summon. Ties: own seat, fewest HP, lowest ID. The Herald's second attack takes the cultist beside it. `previewRampageV7` names the same unit and its step.         |
| The Imp              | Summoned with no helper; three Imps beside each other on one strand stay bound; a fourth beside them is Unbound; an Imp held only through a held neighbour is Unbound; a unit beside two Imps does not strike back (`SWARMED`), beside one it does; an Imp on a neutral village is offered no capture.                                                                                             |
| The Mass             | Needs Gibbering Masses and a helper; on or beside an own city center, or beside an own Idol Bearer whose idol stands, it stays bound with no strand; beside a frogged bearer, or in the open with no strand, it is Unbound; a Knight that begins beside it reaches one tile (`DRAGGED`), one that begins elsewhere its full Move; a push, a swap, and a Boo! never move it; no capture is offered. |
| Identity             | The previous identity is refused; the autosave key is renamed; a `FRONTIER_10` save of the old revision is refused as a stale mission.                                                                                                                                                                                                                                                             |

### 17.2 Normal AI, interface, art, campaign

- **AI** (one hand-built state a rule, beside the state where it must not
  fire): the research order from a Gathering opener; cultists that do not
  brawl (an Initiate beside a Fighter it cannot kill does not attack); each
  summon choice (a Mass for a watched city, a Horror at the front, an Imp
  beside a Brood, a summon at 26 Favour with no enemy near); the Brood's
  one channeller; no channeller for a Mass on its Doorstep; a seat that
  keeps 2 Favour per Herald and Sacrifices to pay Hunger; the warden's
  placement; Star-fall begun alone and the join that turns a hit into a
  kill (and no join that does not); Switcheroo at 4; the Summoner's
  Tentacle; the Herald's advance scored against its channellers' reach; the
  enemy side's shot on the bearer, its refusal to end beside a Mass, and its
  hunt of a Brood's channeller.
- **Interface:** the pure presentation functions (the Favour chip "12 /
  30", the lost candles, the join icon only for a cultist that may join and
  only on the pending Stargazer, the summon chooser's entries from the
  offered commands, the halved-shot label from the preview, the Doorstep
  pip, the Drag ring, the empty Gallery cells, every new glossary entry,
  every removed surface gone) with their DOM and Canvas companions, and the
  interface style test; still screenshots of fixture states in muted
  headless Chrome at desktop and phone width.
- **Art:** the asset tests (canvas, footprint, transparency, palette), the
  review command's contact sheet, and the native and enlarged review of the
  first sample.
- **Campaign:** both missions load; their units hold no vacant role; the
  canonical hash pins move with the revision bumps; the briefing and hints
  name no retired unit. The hand replay and the autopilot are skipped (the
  standing rule).

## 18. Implementation beads

For the root to create under epic `pulp_wars-mch9`, replacing the step-2
part of `pulp_wars-mch9.30`. **Validation for every bead** follows the
standing rule: focused unit tests of the changed code on **hand-built
states**, plus `npm run format:check`, `npm run lint`, `npm run typecheck`,
and `npm run build`; no `npm run check`, no full `npm test`, no
`npm run test:sim`, no release validator, no browser smoke that plays a
match, no `play-text` run, no `runAiMatchV7`; where a profile names one of
those gates, the bead records the skip. Every engine bead bumps the
ruleset identity once (section 11), updates
[section 26 of the current rules](RULESET_7_CURRENT.md#26-cultist-faction-rules)
(and sections 6.2 and 11 where it touches them), adds its text-harness
lines and previews, classifies new unit or faction readers in the
reader-class fixtures and the form-audit counts, and lists the
simulation pins it expects to move. Each bead is ordered so that it lands
on its own and leaves the game playable.

### 18.1 Engine

| Bead     | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Depends on | Profile                             |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------- |
| **E-R1** | **Roster.** The vacant `KNIGHT` and `SWORDSMAN` slots (no unlock, reward, mission, Showcase, or Gallery unit; the one "fields this role" helper; mission validation refuses a vacant role); robed numbers (section 4.1); Martyr and `PICK_ME` removed; `TENTACLE` moved to the Summoner behind the `tentacles` capability; Chivalry and Metallurgy display names; starting Favour 2; the minimal stop-gaps the removal forces elsewhere (the Cult research-role list and shares lose the two roles; `FRONTIER_10` and `LAB_CULT_MID` swap their units as section 15 proposes, revisions bumped; the glossary loses the two units). Tests: registration, tricks, favour, missions (hand-built). | —          | `ai/map/persistence` (sims skipped) |
| **E-R2** | **Favour economy.** Cap 30 with `forfeited`; Offering 6; prices Horror 4 and Herald 18; the trickle; the Herald's Hunger (unbinds, reason `HUNGER`); mission Favour clamped; the Start Turn order of section 10.1 (steps 3 to 5). Tests: favour, channel, unbound (hand-built Start Turns).                                                                                                                                                                                                                                                                                                                                                                                                    | E-R1       | `engine/rules`                      |
| **E-R3** | **The warden.** Behold! as the lasting aura (idol stands; shield wall halving in the combat and its preview `idolHalved`; Awestruck replacing Pick Me!, `ATTACK_AWESTRUCK`); `BEHOLD` command, `idols`, and the idol events removed; strand protection removed. Tests: tricks, channel, combat preview.                                                                                                                                                                                                                                                                                                                                                                                        | E-R1       | `engine/rules`                      |
| **E-R4** | **Star-fall and Switcheroo.** Star-fall alone (no chanter needed, no joining at the begin), `JOIN_CHANT` with its preview, error, and event, 6 + 3 a chanter; Switcheroo range 4. Tests: rituals, tricks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | E-R1       | `engine/rules`                      |
| **E-R5** | **The Herald and the Unbound.** Every daemon but the Mass advances after a kill (the Herald's Ravage revised); the four-step Unbound target rule and the Unbound advance; `previewRampageV7` returns the step. Tests: unbound, rituals (Herald), curiosities' neutral turn.                                                                                                                                                                                                                                                                                                                                                                                                                    | E-R1       | `engine/rules`                      |
| **E-R6** | **The Imp.** Summoned role `IMP` (numbers, value, neutral breed, mechanical role), `SUMMON` with `daemon` and an optional helper, Brood at the check, Swarm (`SWARMED`), no capture; previews and harness. Tests: channel (Brood), combat (Swarm), summon.                                                                                                                                                                                                                                                                                                                                                                                                                                     | E-R2, E-R5 | `ai/map/persistence` (sims skipped) |
| **E-R7** | **The Gibbering Mass.** Summoned role `MASS`, the `summonMass` capability at Metallurgy, Doorstep at the check, Drag in the movement rules and query (`DRAGGED`), immovable, no advance, no capture; neutral breed. Tests: channel (Doorstep), movement (Drag), summon.                                                                                                                                                                                                                                                                                                                                                                                                                        | E-R3, E-R6 | `ai/map/persistence` (sims skipped) |

### 18.2 Normal AI

| Bead     | Scope                                                                                                                                                                                                                                                                                                             | Depends on       | Profile                             |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------- |
| **A-R1** | Section 12.1 (research order, the army, cultists do not brawl, weak links and escorts) and the Favour side of 12.2 (the new prices and thresholds, the Great Summoning's 18 and its saving from 9, the cap, Hunger, the trickle's channeller, the Offering); the Behold! step replaced by the warden's placement. | E-R2, E-R3       | `ai/map/persistence` (sims skipped) |
| **A-R2** | Section 12.3 (Star-fall alone and the joins, Switcheroo at 4, the Summoner's Tentacle, Pick Me! removed, the Herald's advance in its scoring).                                                                                                                                                                    | A-R1, E-R4, E-R5 | `ai/map/persistence` (sims skipped) |
| **A-R3** | The summons of 12.2 and 12.3: what to summon (Mass, Horror, Imp, the cap), Brood planning, Doorstep, Swarm, the Mass in the lodge garrison.                                                                                                                                                                       | A-R2, E-R6, E-R7 | `ai/map/persistence` (sims skipped) |
| **A-R4** | Section 12.4, every seat against the new Cult (Brood and Doorstep in the strand hunt, the warden, Awestruck, Drag, joiners, Hunger, the four-step eye mark).                                                                                                                                                      | E-R3 to E-R7     | `ai/map/persistence` (sims skipped) |

### 18.3 Interface

| Bead     | Scope                                                                                                                                                                                                                                                                                                        | Depends on                     | Profile                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ | -------------------------------------------------------- |
| **U-R1** | Favour "n / 30", the lost candles, the trickle and Hunger cues and the hungry End Turn confirmation; the Tentacle on the Summoner; the Caller, Chosen, Pick Me!, Martyr, and Behold!-button surfaces removed (cards, glossary, Gallery empty cells, Showcase); the retired art out of the runtime manifests. | E-R2, E-R3                     | `ui/presentation` + the `asset-only` gate `art:validate` |
| **U-R2** | The warden's ring, the halved-shot label, the Awestruck tethers and reasons; Star-fall's join icon and live preview through the tile-icon system; Switcheroo's reach of 4.                                                                                                                                   | U-R1, E-R4, `pulp_wars-2yc.60` | `ui/presentation`                                        |
| **U-R3** | The Imp and the Mass on the board: the summon chooser through the tile icons, Brood links, Swarm's preview line, Doorstep pips, the Drag ring and "Dragged", the Unbound reason line and the Herald's advance; glossary entries of section 13.                                                               | U-R2, E-R5, E-R7, ART-R1       | `ui/presentation`                                        |

Each interface bead may take still screenshots of fixture states in muted
headless Chrome; none plays a match.

### 18.4 Art

| Bead       | Scope                                                                                                                                                                                                                                        | Depends on | Profile                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------- |
| **ART-R1** | The Imp and the Gibbering Mass (bound and Unbound looks, portraits) and the four icons of section 14, by the checked-in pipeline: a first sample reviewed, then the rest; the art fragment's roster updated (the Caller and the Chosen out). | —          | `asset-only` (`npm run art:chibi-cult-direction-review`) |

The robed-cultist refresh, `pulp_wars-mch9.29`, depends on E-R1 (the final
roster) and stays its own bead.

### 18.5 Campaign and docs

| Bead     | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Depends on       | Profile                             |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------- |
| **C-R1** | Mission 10 and `LAB_CULT_MID` retuned (section 15: technologies, Favour, units confirmed, briefing and hints, revisions); the campaign design's section 11 records it; the hand replay and the autopilot are skipped and listed for the user.                                                                                                                                                                                                                               | E-R7, A-R3       | `ai/map/persistence` (sims skipped) |
| **D-R1** | The design record: [the Cultists spec](RULESET_7_CULTISTS.md) gains a status line pointing here and a fold-notes entry; [Normal AI, the Cult seat](../architecture/NORMAL_AI.md) and [board targeting](../ui/BOARD_TARGETING.md#39-the-cultists-rituals-hexes-and-tricks-bead-pulp_wars-mch919) follow the built beads; this document gets its as-built notes; the spec's stale link to the Normal AI's Cult heading (`#the-cult-seat-pulp_wars-mch99-to-mch912`) is fixed. | every bead above | `docs/tracker`                      |

**Order.** E-R1, then E-R2 to E-R5 in any order (each needs only E-R1),
then E-R6, then E-R7; A-R1 after E-R2 and E-R3, A-R2 and A-R3 after their
engine beads, A-R4 after the engine; U-R1 after E-R2 and E-R3, U-R2 after
`pulp_wars-2yc.60`, U-R3 after the art; ART-R1 at any time; C-R1 and D-R1
last. Between E-R1 and A-R3 the Cult AI plays the reduced roster with the
old plan (no Imps, no Masses yet), which is weaker but legal; between E-R4
and U-R2 a human player can begin a star alone but joins only through the
text harness.
