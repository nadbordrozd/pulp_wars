# Ruleset 7: the Cult of the Ancient Ones (proposal)

**Status:** proposal for the user's decision (bead `pulp_wars-2yc.25`,
2026-10-06). Nothing in this document is a rule of the game, and nothing in
it is canon until the user approves it. Every number is a first guess and
is marked as such where it matters. No engine, AI, UI, or art work has been
done. The rules in force are
[Ruleset 7: current rules](RULESET_7_CURRENT.md).

**What to read:** the [one-page summary](#one-page-summary), then the
[decisions](#8-risks-and-open-questions) (section 8) and the
[two alternative shapes](#9-two-alternative-shapes-and-the-recommended-blend)
(section 9). Sections 1 to 7 are the detail behind them.

## One-page summary

**The faction.** The ninth and last faction is a secret lodge of robed
amateurs who borrow power they cannot quite hold. Proposed name: **the Cult
of the Ancient Ones**, shown as "Cult" (faction ID `CULT`). They are pulp
magazine cultists: pointed hoods, candles, bad Latin, and rubbery tentacled
things with googly eyes. Never grim, never gory.

**Three pillars.**

1. **Power on a leash.** A Summoner turns one of its own Initiates into a
   strong **Horror** and holds it on a leash three tiles long. Hurt the
   Summoner and the Horror runs wild for a turn. Kill the Summoner and it
   runs wild for good, biting the nearest unit, friend or foe, cultists
   first. The enemy's best answer is to **kill the cultist, not the demon**.
2. **Rituals everyone can see.** Several cultists stand together and chant
   for one or two turns. A countdown ring shows on the board, to the enemy
   too. Move, shove, or kill one chanter too many and the ritual fizzles.
   Three rituals with different pay-offs: **Rain of Fish** (a city grows),
   **Star-fall** (an announced explosion that ignores Walls), and **the
   Great Summoning** (a huge monster that obeys nobody).
3. **A price and a wink.** Big effects cost an Initiate, who "volunteers"
   in a puff of green smoke and leaves a slipper behind. Small effects are
   one-button hexes: turn a unit into a **frog** for a turn, **swap places**
   with a unit, call up a **Tentacle** that slaps whoever stands next to it.

**How it covers the user's ideas.**

| The user's idea                            | In this proposal                                                                        | When                     |
| ------------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------ |
| Demon summoning                            | The Summoner's Horror; the Caller's Tentacle; the Great Summoning's Visitor             | first version            |
| Blood sacrifices                           | **Volunteer**: an Initiate is the price of a Horror, of feeding it, and of the Visitor  | first version            |
| Rituals that need more than one unit       | Rain of Fish (3 units), Star-fall (2 to 4), the Great Summoning (4)                     | first version            |
| Spells with wacky effects                  | Ribbit, Switcheroo, Tentacle, Snack Time; four more held back, one rejected             | four first, four later   |
| Uncontrollable summons, friend and foe     | Tentacles and the Visitor follow one public rule: go for the nearest unit               | first version            |
| Summons that break loose from the summoner | The leash: hurt the Summoner (wild for a turn), kill it or outrun it (wild for good)    | first version; the heart |
| A resource of its own                      | **No.** Cooldowns and Initiates are the price. A small "Favour" counter is the fallback | not now                  |
| Sacrifice for Coins or population          | **No.** It would copy Disband and Harvest and invite a train-and-offer loop             | not at all               |

**The roster** (first-guess numbers in [section 3](#3-roster)): Initiate
(line, chants, volunteers), Familiar (fast, swaps places), Hexer (ranged,
frogs), Idol Bearer (defender, wards its neighbours against wild things),
Summoner (leader, holds a leash), Stargazer (siege, Star-fall), Caller
(breakthrough, Tentacles), and the reward heavy, the Thing in the Cellar.
Three more pieces are summoned, never trained: the Horror, the Tentacle,
and the Visitor.

**The technology tree** keeps the shared graph, prices, and every Human-pass
improvement. Administration gives the Summoner. Fortification becomes
**Warding Chalk** (chanters are fortified). Explosives becomes **The Stars
Are Right** (the Great Summoning, beside Blast Mountain and Breach). Raiding
gives Switcheroo in place of Charge. The rest reads as for everyone.

**Who beats it.** Fast units and long shots that reach the Summoners;
anything that hits an area, because circles are four fragile units in a
clump (a Human Knight's Overrun, a Kaboom, a Wail, a bomb); anything that
shoves a unit one tile. **What it beats.** Turtles: Star-fall ignores Walls,
Switcheroo lifts a defender off its center, a frog cannot strike back.

**The honest flags.**

- **Size: large.** About one and a half Candy factions of engine work. The
  largest piece is a unit that changes from owned to wild; today the engine
  knows one wild unit, the Giant Spider, and its rules are written for it
  alone.
- **The AI will play the leash and the hexes well and the rituals badly.**
  The heuristic AI has no memory between turns. The proposal keeps the
  AI-playable core (Summoner and Horror, frogs, Tentacles) strong enough to
  carry an AI Cult, and accepts that the Great Summoning is mostly the
  human player's toy.
- **It is over the "about 25% unique" budget.** [Section 8](#8-risks-and-open-questions)
  gives the order in which to cut.
- **The colour.** Almost nothing still passes the faction-colour test
  beside the eight taken colours. The one clear pass is a neon **eldritch
  green**, `#00ff78` ([section 7.2](#72-colour)).

**Recommended shape:** the blend described here, built in three engine
steps so that the leash can be played by hand before the rituals exist
([section 8.3](#83-size-and-order-of-work)).

## The brief

The user's direction (2026-10-06), verbatim:

> For the ninth faction I want to do a cult of the ancient ones. i want
> their mechanics to be demon summoning and maybe magic use? blood
> sacrifices? rituals that require more than one unit to complete? spells
> with wacky effects? uncontrollable summons that wreak havoc among friend
> and foe alike? controllable summons that get out of control if the
> summoner gets killed / distracted? IDK. something among those lines.

The standing guidance this proposal was checked against, as the bead relays
it (the quoted words are the user's):

- "units are differentiated from other factions by more than stats"; every
  technology branch is useful; the faction is "not crazy op or crazy weak";
  very fine-tuned balance is not the goal.
- Situationally overpowered events and combos are wanted, when they happen
  occasionally and can be countered. The user's examples: a Human Knight
  chaining kills through dozens of fragile units; a few Undead Zombies
  converting a horde of basic infantry, countered by ranged units. The two
  things to avoid are a faction that always wins and a faction with one
  obviously best unit. An ability that is too strong too early is moved
  behind a later technology, not weakened.
- The game should be bloody, with constant unit turnover ("more units, more
  deaths, more turnover",
  [the Human tuning, round 5](RULESET_7_TUNING_HUMAN.md#12-round-5)); Coins
  are drained by replacing dead units with expensive ones.
- Other factions were asked for roughly 25% unique mechanics over the
  shared base.
- Interface: no tile coordinates anywhere the player reads; minimal text;
  every action that targets a unit, tile, or building is picked on the
  board with the move, attack, help, and place marks
  ([board targeting](../ui/BOARD_TARGETING.md)), never from a list of
  buttons.
- Tone: bright, pulpy, tongue-in-cheek. The Undead are "spooky-fun". The
  Cult is lurid 1930s pulp covers played for fun.
- Standing lessons recorded for earlier factions
  ([Candy overlay, section 1](RULESET_7_CANDY.md#1-sources-and-decided-direction)):
  every rule fits in one sentence and is visible on the board; no hard
  locks and no attack from hiding; the identity works in the first 20
  rounds; the Normal AI can play it with simple rules.

## 1. Identity

### 1.1 In a paragraph

Humans are sustain, the Undead are attrition, the Goblins are a reckless
horde, the Dinosaurs are few, big, and growing, the Martians are a small
mobile invasion force, the Ice Folk are the things from the peaks, the
Dwarves are heavy and built to last, the Candy are a sugar rush. The Cult
is **a bad idea that mostly works**. Its people are cheap and frail. Its
strength is borrowed: a monster on a leash, a star called down by four
people humming, a hex read from a book held upside down. Playing the Cult
feels like stage-managing a magic show with a real tiger: every turn you
decide how close to stand to your own best piece. Playing against the Cult
feels like a heist: find the person holding the leash, the candle, or the
telescope, and get to them.

### 1.2 Three pillars

1. **Power on a leash** ([section 2.1](#21-summoning-and-the-leash)).
2. **Rituals everyone can see** ([section 2.3](#23-rituals)).
3. **A price and a wink** ([sections 2.2](#22-volunteering) and
   [2.5](#25-spells)).

### 1.3 How it differs from each faction

| Faction  | Its signature                                          | Why the Cult is not that                                                                                                                                   |
| -------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Human    | Sustain, Field Defense, the Knight's Overrun           | The Cult has no healer, no Rally, no Field Defense, and no Overrun. Its monsters cannot be healed except by eating an Initiate.                            |
| Undead   | Converts your dead into its units (Graves, Infect)     | The Cult never takes an enemy unit and never brings anything back. It spends its **own** living units, and what it summons is temporary or dangerous.      |
| Goblin   | Kaboom and WAAAGH!: instant area damage, a cheap horde | A volunteer does no damage; it buys a monster. The Cult's one explosion (Star-fall) is announced a turn ahead on a tile the enemy may leave.               |
| Dinosaur | Eggs and growth: a delayed unit that is then yours     | A ritual is made of live units and stops when one walks away. The Great Summoning's monster is never yours. Nothing of the Cult grows.                     |
| Martian  | Mind Control and the Tractor Beam; Shields             | Mind Control takes **your** unit and gives it back. The leash holds the Cult's **own** monster, and when it snaps the monster belongs to nobody.           |
| Ice Folk | Chill, Shatter, Snow: slow an area, then break it      | The frog is one unit for one turn, with no follow-up kill rule. The Cult changes no terrain.                                                               |
| Dwarf    | Reliable machines that are repaired; tunnels           | Cult monsters are unreliable and cannot be repaired. Nothing of the Cult goes underground.                                                                 |
| Candy    | Sugar Rush and Crash; Re-bake from Crumbs; Splat       | Nothing of the Cult is re-made. The frog overlaps Splat and the Crash on purpose-built limits ([section 2.5](#25-spells)); the Cult has no burst of speed. |

Two overlaps are real and are kept small on purpose. **Switcheroo** can
empty a city center, as a Tractor Beam can; it differs in that the caster
takes the target's place and usually dies there. **Ribbit** stops a unit
from striking back, as Splat does; it differs in being one unit, with a
cooldown, and curable.

## 2. The core mechanics

Each mechanic is written as the rule a player would read, then its
details, then what the engine would need. The sentence in bold is the card
text.

### 2.1 Summoning and the leash

**Recommendation: first version. It is the heart of the faction.**

**Summon.** **"The Summoner turns an Initiate next to it into a Horror on a
leash."**

- A Summoner (the support unit, from Administration) that has not acted
  this turn picks one of its owner's Initiates on a tile next to it. The
  Initiate **volunteers** ([section 2.2](#22-volunteering)) and a **Horror**
  stands on its tile, with its home city and its unit slot. The Summoner
  pays **3 Coins** (first guess; 2 with a Forge in its home city, as
  Arms Industry lowers a Dwarf Assemble).
- A Summoner holds **one leash**. After a Summon it cannot Summon again for
  **2 of its owner's turns** (the Mind Control cooldown pattern), so a dead
  Horror is not replaced at once.
- The Horror arrives exhausted and acts from its owner's next turn. It is a
  strong melee monster ([section 3](#3-roster)). It cannot capture, cannot
  be promoted, and **cannot be healed** by Recover, a Windmill, a Fountain,
  or anything else except Snack Time ([section 2.5](#25-spells)).

**The leash.** **"A Horror must end your turn within 3 tiles of its
Summoner."**

- The leash is public. Every player who sees the Horror sees who holds it:
  a chain link is drawn between the two when either is selected, and the
  Summoner carries a leash badge at all times.
- The leash is checked **at the end of the Cult player's turn**, not during
  it. A Move that would end beyond the leash is offered with a
  broken-chain mark, so letting go is a choice and never an accident.

**Three ways it goes wrong.**

| What happens                                                                                      | Result                                                                                                      | Card text                                             |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| The Summoner **loses HP** (an attack, a retaliation it drew by attacking, a bomb, a blast)        | **Unruly:** at the start of the Cult's next turn the Horror rampages once by itself, then sits the turn out | "Hurt the Summoner: its Horror runs wild for a turn." |
| The Summoner **leaves the board or changes sides** (killed, infected, mind-controlled, disbanded) | **Loose** at once, for good                                                                                 | "Kill the Summoner: its Horror runs wild for good."   |
| The Horror ends the Cult's turn **more than 3 tiles** from its Summoner                           | **Loose**, for good                                                                                         | "Off the leash: it runs wild for good."               |

"Distracted" in the user's words is the first row: a Summoner that gets
into a fight, its own included, is distracted. A Summoner that attacks and
is struck back has shaken its own Horror.

**The rampage rule** (one rule for an Unruly Horror, a Loose Horror, and
the Visitor of [section 2.4](#24-uncontrolled-things)). **"A wild thing
goes for the nearest unit, friend or foe."**

1. It looks at every unit on the board within 6 tiles, of any side, except
   other summoned things, **warded** units
   ([the Idol Bearer](#3-roster)), and, for an Unruly Horror, its own
   Summoner.
2. It picks the **nearest** by tile count. Ties go to a unit of the Cult
   seat that summoned it (it holds a grudge), then to the unit with the
   fewest HP, then to the oldest unit.
3. It walks toward that unit, up to its Move, and attacks it if it ends
   next to it: an ordinary attack, with retaliation. It never advances,
   pushes, captures, or stands on a settlement center.
4. With no unit within 6 tiles it does nothing (an Unruly Horror sulks; a
   Loose one fades away).

Nothing in the rule is random, and every input is on the board. The
interface marks the unit a wild thing will go for **as the board stands
now** with an eye icon, as the Giant Spider's likely target is marked
today, so both players can step in or out of the way.

**Loose.** A Loose Horror belongs to nobody. It keeps its HP, takes its
rampage **after every round**, in the neutral turn the Giant Spider
already has ([current rules, section 2.7](RULESET_7_CURRENT.md#27-map-curiosities)),
and fades after its fourth rampage (first guess). Anyone may kill it; the
kill is an ordinary kill and its own kills are credited to nobody.

**Bind.** **"A Summoner with a free leash takes a Loose Horror next to it
back."** It is the Summoner's action for the turn and costs nothing. So
control can be re-established, at the price of a second Summoner standing
by with an empty hand.

**Why this is a real decision.** A Horror has Move 2 and its Summoner Move 1. A Horror kept beside its Summoner is safe and slow. A Horror sent ahead
drags a 10-HP cultist toward the front. The Cult player chooses, every
turn, between reach and safety, and decides who stands nearest to the
Horror in case it turns: the standing answer is to keep a spare Initiate
between the monster and anything that matters, which is also the next
volunteer.

**What the opponent does about it.**

- **Kill the Summoner.** The Horror then attacks the nearest unit after
  every round, and the nearest units are usually the Cult's.
- **Hurt the Summoner.** One point of damage is enough. The Horror loses
  its next turn at least, and mauls a cultist if one is nearer than any
  enemy. The opponent can hit and then step back so that a cultist is the
  nearest.
- **Shove either unit** more than 3 tiles apart (a Push, a Knockback, a
  Tractor Beam, a Charge!). The Cult has its own turn to close the gap.
- **Kill the Horror.** It has no healing and no cover from a leash. This is
  the expensive way.

**Engine feasibility.** The leash is a side list
`{ demonUnitId, holderUnitId }` with a cooldown list, the shape of
`mindControlled` and `mindControlCooldowns`
([current rules, section 20.9](RULESET_7_CURRENT.md#209-mind-controlled-units)),
and its release hook belongs where a Brain's controlled unit is released.
"Lost HP since its owner's last turn" needs a flag on the holder set by
every damage path; the Spider's `provokedBy` list already collects "who
damaged this unit" across every source. The Unruly rampage is a Start Turn
step, like Plague and a Mole's eruption. **The hard part is Loose.** A unit
must change owner to the reserved neutral owner and keep its Cult kind,
and the neutral turn must run a second kind of unit. Today the neutral
registration has exactly one role, `unitFactionV7` returns `"NEUTRAL"` for
every neutral-owned unit, and state parsing rejects any neutral unit that
is not a full-HP Spider with a lair. All of that is written for the Spider
and must be generalised. The Horror, the Tentacle, and the Visitor need
three new role IDs appended after `SWORDSMAN`, the way the Swordsman was
added: present in every faction's registration, unlocked by none but the
Cult.

### 2.2 Volunteering

**Recommendation: first version, as a price only. Never for Coins or
population.**

**"An Initiate volunteers: it is gone, and something better takes its
place."**

- **What can volunteer.** An Initiate of the acting player, in land form,
  next to the unit that asks. Only Initiates (first version): the board
  then reads at a glance, "an Initiate beside a Summoner is fuel". A
  Plagued or Bitten Initiate cannot volunteer, exactly as it cannot
  Disband, so volunteering is never a way to dodge a Zombie's bite.
- **What it buys.** Three things, none of which Coins can buy another way:
  a Horror (Summon), a full heal of a Horror (Snack Time), and the Visitor
  (the Initiate at the center of the Great Summoning).
- **What it is in the rules.** A removal, like Disband: no kill credit for
  anyone, no Plunder, no Grave, no growth for a Dinosaur. Its slot frees or
  passes to the Horror.

**How it is shown and named.** The word on the button is **Volunteer**,
with a raised-hand icon. The Initiate raises its hand, there is a puff of
green smoke, and a pointed slipper and a rolling candle are left on the
tile for a moment. The log says "An Initiate volunteered." No blood, no
knife, no altar, and the word "sacrifice" appears nowhere the player
reads. The joke is that it is always the junior member.

**How it sits with turnover and the economy.** It is a Coin sink by
another name, and a welcome one: every Horror that dies is replaced by a
new Initiate (2 Coins and a city's action for the turn) plus the 3-Coin
fee. It feeds the user's wish for constant turnover, because the Cult's
strongest pieces eat its weakest.

- **What stops it being useless:** the three pay-offs cannot be had any
  other way, and one of them (the Horror) is the faction's best unit for
  its price.
- **What stops it being an exploit:**
  - No volunteer ever pays Coins or population, so there is no loop that
    turns Initiates into money or city levels. An economy offering was
    considered and rejected: at 2 Coins for a population point with no
    limit of land it out-grows every Harvest, and at any worse rate it is
    a Disband with extra steps.
  - Each pay-off has its own limit: one leash per Summoner and a cooldown;
    Snack Time needs a wounded Horror; the Great Summoning needs four
    units for two turns.
  - Initiates are limited by the city action (one unit a city a turn) and
    by unit slots. The one way round the city action is **Hire** at a
    Market, at 3 Coins an Initiate, which is exactly the late Coin sink
    Commerce was given.
- **A lawful trick that stays in:** volunteering an Initiate that was
  about to die denies the enemy the kill (a Dinosaur's growth, a Knight's
  Overrun step, a Goblin's Plunder). It costs a Summoner's action and needs
  a use for the volunteer that turn, so it is a play, not a loop.

**Engine feasibility.** Small. A new `UNIT_DIED` cause that every "what a
death leaves" list (Graves, Crumbs, risings, death blasts, kill credit)
excludes, as they exclude Disband. No state.

### 2.3 Rituals

**Recommendation: the frame, Rain of Fish, and Star-fall in the first
version; the Great Summoning as its last engine step, free to slip.**

**The frame.** **"A leader and the cultists next to it chant. Everyone
sees the countdown. Break the circle and nothing happens."**

- **Taking part.** A ritual has a **leader**, named by the ritual, and
  **chanters**: the leader's own robed units on the tiles next to it
  (Initiates, Idol Bearers, Hexers, Summoners, Stargazers, Callers; never a
  Familiar or a summoned thing). When the leader begins, every such unit
  that has not yet acted this turn joins; a player who wants a unit left
  out moves or uses it first. Beginning is the action of the leader and of
  every chanter for that turn.
- **How long.** One or two turns. The count drops at the start of each of
  the Cult player's turns and the ritual completes when it reaches zero, at
  the start of that turn, before the Cult moves. A one-turn ritual gives
  the enemy exactly one turn to answer; a two-turn ritual, two.
- **What breaks it.** A participant **leaves** when it moves, is moved (a
  Push, a Knockback, a Tractor Beam, a Bounce, a Charge!, a Switcheroo),
  uses an action, dies, or changes sides. Damage alone does not make it
  leave, and neither does a Chill. If the leader leaves, or fewer chanters
  remain than the ritual needs, the ritual **fizzles** at once: the ring
  goes dark, nothing happens, nothing is refunded. Extra chanters are
  therefore insurance: a circle of five that needs three survives two
  losses.
- **What the enemy sees.** Everything, on every tile it has explored: a
  chalk ring under the leader, a candle at each chanter, the ritual's icon,
  and a countdown ring in the Cult's colour, the way an Egg's countdown is
  shown today. Star-fall also shows its mark on the target tile. Nothing
  about a ritual is hidden except by ordinary fog (a tile the enemy has
  never explored).
- **What the enemy can do.** Kill or shove a participant; for Star-fall,
  walk out of the marked area; for the Great Summoning, also get ready to
  lead the monster back toward the Cult.

**The three rituals** (numbers are first guesses).

| Ritual                  | Technology                                | Leader                                        | Chanters needed | Turns | Pay-off                                                                                                             |
| ----------------------- | ----------------------------------------- | --------------------------------------------- | --------------: | ----: | ------------------------------------------------------------------------------------------------------------------- |
| **Rain of Fish**        | Farming                                   | an Initiate in the territory of an own city   |               2 |     1 | That city gains **+2 population** for good. Once per city level.                                                    |
| **Star-fall**           | Sawmilling (the Stargazer)                | a Stargazer that has not moved this turn      |     1 (up to 3) |     1 | An **explosion of 5** on a marked tile and the eight around it, friend and foe; **+1 for each chanter beyond one**. |
| **The Great Summoning** | The Stars Are Right (the Explosives node) | an Initiate, who volunteers when it completes |               3 |     2 | **The Visitor** appears where the leader stood ([section 2.4](#24-uncontrolled-things)).                            |

- **Rain of Fish** is the economy ritual and the gentle one: fish fall on
  the city, flop about, and the city grows. It is bounded (once a level),
  costs no Coins, and takes three units out of the war for a turn. It lets
  a Cult city on poor land keep pace; it does not let one run away. Card:
  "Three cultists chant in your city's land for a turn: +2 population.
  Once per city level."
- **Star-fall** is the siege ritual and the Cult's answer to a turtle. The
  Stargazer marks a tile 2 to 4 tiles away that its owner has explored. At
  the start of the Cult's next turn a star lands there: every unit on the
  nine tiles takes 5 (6 or 7 with a second and third chanter), whatever its
  Defense, Walls, fortification, or cover, and Field Defense in the area is
  destroyed. It has the shape and the rules of a Blast Mountain, which
  already exists for every faction. Its real effect is the choice it forces:
  **leave your fortification or stand under a star.** A Stargazer that
  still has not moved may begin again at once, so a line that will not
  move is hit every turn. Card: "Marks a tile. Next turn a star lands on it
  and on everything around it."
- **The Great Summoning** is the capstone: four cultists, two turns, two
  enemy turns of warning, and a monster nobody controls at the end.

**Engine feasibility.** Medium. One state list
(`{ leaderUnitId, ritual, target, turnsLeft, chanterUnitIds }`), one
command, a Start Turn step that counts down and completes, and one check
at the end of every command that drops a ritual whose participants no
longer qualify (the place where the Spider's entry is pruned today). The
check reads positions, owners, and activation flags, so no other rule has
to know about rituals. The pay-offs reuse what exists: a permanent
population contribution (Blast Mountain's), the explosion chain with a new
cause (Blast Mountain's again), and the creation of a neutral unit.

### 2.4 Uncontrolled things

**Recommendation: first version. The Tentacle with the Caller; the Visitor
with the Great Summoning.**

Two things are uncontrolled from birth, and a Loose Horror joins them. All
three act in the neutral turn after every round and are told by their look:
no owner colour, red eyes.

**The Tentacle.** **"It slaps the weakest unit next to it, whoever that
is, when it comes up and after every round."**

- A Caller ([section 3](#3-roster)) puts a Tentacle on a free tile within 3
  tiles of it, land or water. One Tentacle per Caller at a time.
- It never moves. When it appears and in every neutral turn it attacks the
  unit next to it with the **fewest HP**, of any side (ties to the oldest
  unit), unless that unit is warded. It lasts 3 rounds (first guess), then
  sinks. It has few HP and anyone may kill it.
- It is the Cult's small, everyday piece of havoc: it kills a Catapult that
  stands still, makes a siege line move, eats an Egg, and bites the
  Cult's own units if they stand next to it.

**The Visitor.** **"It goes for the nearest unit, friend or foe, and
nobody holds its leash."**

- It follows the rampage rule of [section 2.1](#21-summoning-and-the-leash)
  after every round, for 4 rounds (first guess), then leaves. It **spares
  the circle that called it**: the chanters of its Great Summoning are
  never its target. Every other Cult unit is fair game.
- It cannot be bound. It never captures and never stands on a settlement
  center. One Visitor per Cult seat at a time.
- **How the Cult uses it:** summon it where the enemy is nearer than
  anything the Cult owns, then keep everything else back, or beside an Idol
  Bearer.
- **How the enemy uses it:** break the circle before it completes; or
  retreat so that Cult units are the nearest; or kill it, since it has no
  healing.

**Engine feasibility.** Small once Loose exists
([section 2.1](#21-summoning-and-the-leash)): the same neutral units with a
Move of 0 or 2 and a lifetime counter. The Spider's rule that no status
sticks to a neutral unit and nothing moves it should cover all three.

### 2.5 Spells

A spell is one button on one unit: arm it, pick the target on the board,
read the result in the label at the target. Each spell belongs to one unit
type, so no unit has a spell book and no dock grows a list.

**How spells are paid for.** With the caster's action for the turn and a
cooldown, or with a volunteer. No Coins (the Summon fee is the one
exception) and no new resource; [section 2.6](#26-a-resource-of-its-own)
argues it.

| #   | Spell                                                                                                                     | Caster, target, and how it is picked                                                                                                                            | Cost                           | How the AI would use it                                                                                                                                               | Verdict           |
| --- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 1   | **Ribbit.** "Turns an enemy into a frog until the end of its next turn. A frog can hop but cannot attack or strike back." | Hexer. One visible enemy unit within 2 tiles. Arm, then the attack mark on each legal unit; the label says "Frog".                                              | action; cooldown 2 turns       | On a unit about to capture an own city; else on the unit own melee will attack this turn (frog first, then the attacks); else on the most dangerous unit in range.    | **first version** |
| 2   | **Switcheroo.** "The Familiar and a unit within 2 tiles swap places."                                                     | Familiar. One visible unit within 2 tiles, own or enemy. Arm, then the attack mark on enemies and the help mark on own units; a ghost shows the two new places. | action; cooldown 2 turns       | Scored like a Tractor Beam: a defender lifted off a center beside an own capturer; a siege or support unit dropped among two or more own attackers; a Summoner saved. | **first version** |
| 3   | **Tentacle.** "Calls a Tentacle up on a tile within 3."                                                                   | Caller. A free tile within 3 tiles. Arm, then the place mark; the label names the unit it would slap on arrival.                                                | action; one at a time          | The free tile next to the most enemy units and no own unit, preferring a siege unit, a fortified unit, or an Egg.                                                     | **first version** |
| 4   | **Snack Time.** "An Initiate next to the Summoner volunteers. The Summoner's Horror is healed in full."                   | Summoner with a wounded Horror on its leash. An own Initiate next to the Summoner. Arm, then the help mark on each legal Initiate.                              | action; a volunteer            | When the Horror is at half HP or less, a spare Initiate is beside the Summoner, and no enemy is in reach to finish the Horror anyway.                                 | **first version** |
| 5   | **Embiggen.** "An own unit grows huge until your next turn: more HP and Attack. A huge unit cannot enter a city."         | A robed caster. One own unit within 2 tiles.                                                                                                                    | action; cooldown               | On the front unit that will be attacked most.                                                                                                                         | later             |
| 6   | **The Doors.** "Opens two doors. Any unit, of any side, that ends its move on one may step out of the other."             | Two free tiles within range, picked one after the other with the place mark.                                                                                    | action; the doors last 3 turns | Poorly: route planning through doors is beyond a simple rule.                                                                                                         | later             |
| 7   | **Open the Eye.** "Reveals everything around a far tile."                                                                 | Stargazer. Any tile within 6 tiles.                                                                                                                             | action                         | Toward the nearest unexplored land between it and a known enemy city.                                                                                                 | later             |
| 8   | **Hiccup.** "Everything around a tile shifts one place clockwise."                                                        | A tile within 2 tiles; the units on the eight tiles around it move one step round.                                                                              | action; cooldown               | Poorly.                                                                                                                                                               | later, if at all  |
| 9   | **Mad Laughter.** "An enemy unit attacks the unit nearest to it."                                                         | One enemy unit within 2 tiles.                                                                                                                                  | action; cooldown               | Easily.                                                                                                                                                               | **not at all**    |

Notes on the four recommended spells:

- **Ribbit.** The frog keeps its HP, Defense, fortification, cover, Move,
  and zone of control. It loses every action (no attack, no capture, no
  ability, no Kaboom) and does not strike back. It lasts until the end of
  its owner's next turn. A unit cannot be frogged again until it has had a
  full turn as itself, so no unit is ever locked for good. A Tend Wounded, a
  Repair, or a Frosting cures it at once (a kiss from the Captain). Immune:
  the heavy reward units, two-slot units, Eggs, and wild things, close to
  the list Mind Control uses. Stories it creates: the Knight that was going
  to run through the circle is a frog; the unit that stood on your center
  ready to capture is a frog; a Goblin frog cannot Kaboom.
- **Switcheroo.** It needs **Raiding** (it takes the place of the Charge
  bonus, as the Dwarves' Dive does). Each unit must be able to stand where
  the other stood, by the rule every shove already uses. The Familiar is
  frail and ends where its target was, so the trade is "my 3-Coin Familiar
  for your Catapult's good position". It may put the Familiar on an enemy
  center, and a Familiar can capture: a city with one defender and nothing
  near it can be stolen if the Familiar lives a turn. That is the kind of
  occasional, counterable upset the user asked for, and the first lever to
  pull if it is too much ([section 8](#8-risks-and-open-questions),
  question 7).
- **Tentacle.** A Tentacle on a water tile slaps ships and embarked units
  too. The user's "tentacle that drags a unit into water" is held back: a
  land unit in water with no dock has no rule today, and a kill by drowning
  is too strong for a button. A later variant could pull an embarked unit
  under.
- **Mad Laughter** is rejected because it is Mind Control for a turn, the
  Martians' own thing.

**Engine feasibility.** Ribbit is small to medium: a status list with two
phases (frog, then immune), which is the shape of Rushed and Crashed
([current rules, section 23.2](RULESET_7_CURRENT.md#232-sugar-rush-and-the-crash)),
a "this unit cannot act" error like the Crash's, and a no-retaliation
reason like Splat's. Switcheroo is small: one command and the shared
displacement rule applied to two units. The Tentacle and Snack Time are
small once the leash and the wild things exist.

### 2.6 A resource of its own

**Recommendation: no. The Cult runs on Coins, cooldowns, and Initiates.**

The alternative is a counter, call it **Favour**, earned by volunteers and
completed rituals and spent on spells.

**For Favour:**

- It separates earning from spending: a volunteer at home could pay for a
  hex at the front, with no need to walk an Initiate to the caster.
- It gives every volunteer the same simple pay-off, which is easy to teach
  and easy for the AI ("offer a doomed unit when Favour is low").
- It is one dial for tuning every spell.
- It is flavour: "the Ancient Ones are pleased".

**Against Favour:**

- The design principles say to avoid new stockpiles and hidden counters
  ([principles, sections 13 and 17](PULP_WARS_TECH_TREE_DESIGN_PRINCIPLES.md#13-avoid-unnecessary-new-resource-systems)).
  Favour would be a second purse beside Coins, in a game whose problem is
  already that Coins pile up.
- A stockpile is off the board. The opponent could not read "a Horror can
  appear here" from the units it sees; with an Initiate as the price it
  can.
- Income from deaths invites farming: train, offer, repeat. It would need
  a cap, a rate, and rules for free reward units.
- The AI would have to budget one pool across several spells. A cooldown
  asks it only "is this ready?".

**Why the price in Initiates is enough.** It is paid where the effect
happens, it uses the starting unit, and it makes the cheapest unit matter
for the whole game. **The fallback, if hand play finds the adjacency too
fiddly:** Favour from 0 to 5, public, shown as candles beside the Coins,
+1 for each volunteer, spent 1 for a hex and 3 for a Summon.

## 3. Roster

Attack and Defense are in whole units, in the scale of the
[Human roster](RULESET_7_CURRENT.md#11-unit-roster). **Every number is a
first guess**; none was run through the engine's combat preview. The
contract step must do that for each unit before any number is coded, as
the Candy contract did.

### 3.1 Trained units

| Unit                    | Role (label)            | Technology     | Cost |  HP | Attack | Defense | Move | Range | Capture | What makes it not a reskin                                                               |
| ----------------------- | ----------------------- | -------------- | ---: | --: | -----: | ------: | ---: | ----: | ------- | ---------------------------------------------------------------------------------------- |
| **Initiate**            | `FIGHTER` (line)        | start          |    2 |  10 |      2 |     1.5 |    1 |     1 | yes     | Chants in rituals; the only unit that volunteers. No Field Defense.                      |
| **Familiar**            | `RAIDER` (skirmisher)   | Scouting       |    3 |   8 |    1.5 |       1 |    2 |     1 | yes     | **Switcheroo** (Raiding). Sight 2. No Charge, no Escape.                                 |
| **Hexer**               | `MARKSMAN` (ranged)     | Marksmanship   |    4 |   8 |      2 |       1 |    1 |   1–2 | yes     | **Ribbit.** Chants.                                                                      |
| **Idol Bearer**         | `GUARD` (defender)      | Drill          |    4 |  16 |    1.5 |     2.5 |    1 |     1 | yes     | **Ward:** it and the own units next to it are never chosen by a wild thing. Chants.      |
| **Summoner**            | `CAPTAIN` (support)     | Administration |    5 |  10 |      1 |       1 |    1 |     1 | no      | **Summon, Snack Time, Bind**; holds one leash. Chants. No Rally, no Tend Wounded.        |
| **Stargazer**           | `CATAPULT` (siege)      | Sawmilling     |    8 |  10 |      — |     0.5 |    1 |     — | no      | No attack of its own. Leads **Star-fall** at 2 to 4 tiles. Chants.                       |
| **Caller**              | `KNIGHT` (breakthrough) | Chivalry       |    8 |  12 |      2 |       1 |    2 |     1 | no      | **Tentacle** within 3 tiles. Chants. No Overrun.                                         |
| **Thing in the Cellar** | `JUGGERNAUT` (heavy)    | reward only    |    — |  40 |      4 |     3.5 |    1 |     1 | yes     | Push. **Cellar-bound:** if its owner loses the city it came from, it breaks Loose.       |
| Patrol Boat and others  | the three ships         | Naval branch   |    — |   — |      — |       — |    — |     — | —       | The shared ships, drawn in the Cult's style (a black gondola with a lantern, and so on). |

- **Initiate.** A hooded junior with a candle and a wavy dagger it holds
  the wrong way round. A little softer than a Skeleton (Defense 1.5, not 2) because it has two other jobs. It is the start unit, the Militia
  reward, and the volunteer.
- **Familiar.** A bat-winged toad-cat that scurries, hops, and blinks. The
  weakest fast unit in the game in a fight, and the only one that can
  rearrange the board. The treasure-chest unit, like the other newer
  factions' fast units.
- **Hexer.** A cultist flinging glowing squiggles from a book held upside
  down. An ordinary ranged unit with 8 HP that, every third turn, removes
  one enemy unit from the next turn.
- **Idol Bearer.** Two cultists lugging a grinning stone idol on poles.
  The Cult's only solid body. Like the Human Guard it cannot attack after
  moving. Its Ward is why the Cult can fight beside its own wild things at
  all, and it is the second cultist worth killing. The Ward is a passive
  effect around a unit, which the
  [design principles](PULP_WARS_TECH_TREE_DESIGN_PRINCIPLES.md#8-active-support-actions-not-passive-auras)
  discourage; it is proposed anyway because it is yes-or-no, never stacks,
  can be drawn as one chalk ring, and matters only when a wild thing is
  about.
- **Summoner.** A senior cultist with a tall hat and a chain. Useless in a
  fight; everything it does needs another unit beside it.
- **Stargazer.** An astrologer with a brass telescope on a tripod and a
  star chart. It has no attack at all, as the Banshee and the Gyrocopter
  have none. It is the Cult's siege unit by another road: the Catapult
  hits now for certain; the Stargazer hits next turn if you are still
  there.
- **Caller.** A cultist in a diving helmet with a conch horn. It does the
  breakthrough unit's job, reaching and destroying fragile backline units,
  without going there: its Tentacle comes up beside the Catapult. A
  first-guess Tentacle kills a full-HP Catapult on arrival and leaves a
  Marksman at 2 HP.
- **Thing in the Cellar.** The level-5 reward of the first capital: a
  heavy, friendly-looking mass of eyes and tentacles that the lodge has
  kept under the floor for years. It is controlled like any unit and has
  the reward heavy's numbers (Defense 3.5, as the Gingerbread Giant). It
  is bound to the city, not to a Summoner: an enemy who captures that city
  opens the cellar door, and the Thing is Loose beside the captor.

### 3.2 Summoned units

They are never trained, hired, or found in a chest. None is living (so no
Plague, bite, Infect, or Wail touches them, and they leave no Grave), none
is healed or promoted, none captures, none embarks, and none is a Mind
Control target (recommended; [question 4](#8-risks-and-open-questions)).
Like the Martian walkers they are never stopped by terrain.

| Unit         | Comes from          | Price                   |  HP | Attack | Defense | Move | Controlled by                            | Lasts                             |
| ------------ | ------------------- | ----------------------- | --: | -----: | ------: | ---: | ---------------------------------------- | --------------------------------- |
| **Horror**   | a Summoner's Summon | 3 Coins and an Initiate |  18 |      4 |       2 |    2 | its owner, on a leash; nobody when Loose | until killed; 4 rounds once Loose |
| **Tentacle** | a Caller's spell    | the Caller's action     |   8 |      3 |       1 |    0 | nobody                                   | 3 rounds                          |
| **Visitor**  | the Great Summoning | an Initiate, four units |  30 |      5 |       3 |    2 | nobody; spares the circle that called it | 4 rounds                          |

- **Horror.** A rubbery, round, many-armed thing with googly eyes and a
  spiked collar. In a fight it is a Knight that cannot chain (Attack 4,
  first guess: it kills a full-HP Fighter in the open in one attack and
  deals about 10 of 17 to a Guard), with 18 HP and Defense 2, for about 5
  Coins and a Summoner. That is cheap, and it is meant to be: the price is
  the leash.
- **Tentacle.** One fat tentacle out of a hole, with a surprised eye at the
  tip.
- **Visitor.** The lodge's life's work: one enormous finger of an Ancient
  One, poked through a hole in the sky, feeling about.

### 3.3 The user's two failure checks

**Is there one unit that makes the rest pointless?** The candidate is the
Summoner with its Horror, the best fighting value in the roster. It is
bounded four ways: one Horror per Summoner; a Horror needs an Initiate to
exist and another to be healed; neither the Horror nor the Summoner
captures, so cities are taken by Initiates, Idol Bearers, Hexers, and
Familiars; and an army of nothing but Summoners and Horrors loses a Horror
to every arrow that scratches a Summoner. The second candidate is a row of
Hexers frogging everything: four Hexers (16 Coins, 8 HP each) frog a little
more than one unit a turn, and a frog still blocks, still has its Defense,
and comes back. The Stargazer is dodged by walking. No unit does another
unit's job.

**Could it always win, or never win?**

- **Never, in the AI's hands,** is the larger risk. An AI that neglects
  the rituals has frail Initiates and little else. The proposal therefore
  puts the faction's strength in pieces an AI plays well: Summon is one
  obviously good command, a frog and a Tentacle have simple targets. The
  rituals are extras on top.
- **Always, in a player's hands,** would come from the Horror's price or
  from frog and Switcheroo used together on a city's last defender. Each
  has a named lever: the Summon fee and cooldown, the Horror's Attack, the
  frog's cooldown, and the Familiar's capture.

**Its counters to each faction's signature, and theirs to it.**

| Against  | The Cult's answer to their trick                                                                                                              | Their answer to the Cult                                                                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Human    | A frog on the Knight before it charges; Star-fall and Switcheroo against Guards on Field Defense and walled centers.                          | **A Knight's Overrun through a circle** of four frail units; a Raider or a Knight reaches the Stargazer before its star lands; the Captain's Tend Wounded cures a frog. |
| Undead   | Summoned things are not living: no Infect, bite, Plague, or Wail. A frogged Zombie does not strike back, so it bites nobody.                  | A Wail and a Lich's splash and Plague on a circle; Zombies eat Initiates; a Vampire reaches the Summoner.                                                               |
| Goblin   | Wild things thrive in a horde (the nearest, the weakest); a frogged Goblin cannot Kaboom; Star-fall on a clump.                               | A Kaboom beside a circle; Gang Up kills a Summoner in one turn.                                                                                                         |
| Dinosaur | A Tentacle or a Star-fall on Eggs, which cannot walk away; volunteering a doomed Initiate denies growth.                                      | A T-Rex's Rampage through a circle; a Charge! shoves a chanter out; the two-slot dinosaurs are immune to the frog and to Switcheroo.                                    |
| Martian  | A frog on a Brain or a Saucer; Switcheroo pulls a Shield Projector away from the units it shields; summoned things cannot be mind-controlled. | A Saucer or a ray reaches the Summoner; a Tractor Beam pulls a chanter out or a Summoner off its leash; **a mind-controlled Summoner drops its Horror**.                |
| Ice Folk | A frog on the Ice Witch stops her Cold Snap; Star-fall ignores Snow cover and the Blizzard.                                                   | A Cold Snap and Shatter on a circle of 10-HP units; a Sabretooth walks past the line to the Summoner.                                                                   |
| Dwarf    | A frog grounds a Gyrocopter or silences a Steam Cannon; Switcheroo lifts a dug-in Hammerer off its center; Star-fall ignores Dig In.          | A bomb from three tiles away hurts a Summoner (Unruly); a Mole comes up under a circle; a Knockback shoves a chanter out.                                               |
| Candy    | A frog on a Chocolate Bunny or a Confectioner; Cult units walk onto Crumbs.                                                                   | A Rushed Donut Racer reaches the Summoner and escapes; a Splat on a Horror, then a safe kill.                                                                           |

**What counters the Cult in general:** reach (fast units and long shots at
the cultists who matter), area damage (a circle is a clump), any shove,
and patience against wild things, which follow a rule the enemy can read.
**The Cult's situationally overpowered events:** a Star-fall that lands
with three chanters on a garrison that could not leave; a Switcheroo that
steals a city; a Visitor walked into a turtle; a Horror set loose on
purpose in the middle of a horde. **Its disasters:** a Knight in a circle;
a Summoner shot beside its own army; a Great Summoning broken one turn
from the end.

## 4. Technology tree

The Cult keeps the shared graph: the same 25 technologies, tiers,
prerequisites, and free opener, and every shared rule of the Human pass:
the research price by technologies owned
([section 6.1](RULESET_7_CURRENT.md#61-research-cost)), Forest cover only
with Forestry, the reward ladder with Barracks
([section 4.8](RULESET_7_CURRENT.md#48-city-rewards)), Hire at a Market and
land trade ([sections 9.3 and 9.4](RULESET_7_CURRENT.md#94-market)), and
Blast Mountain as an explosion
([section 8.4](RULESET_7_CURRENT.md#84-terrain-and-infrastructure-actions)).
It has **five unlock differences**, in the pattern of the other factions
([section 6.2](RULESET_7_CURRENT.md#62-technology-tree)): Farming adds Rain
of Fish; Administration gives Summoner support in place of Captain support;
Raiding gives Switcheroo in place of the Charge bonus; Chivalry gives no
Overrun; Fortification and Explosives are renamed and re-filled.

| Technology     | Cult name               | Cult unlocks (differences in bold)                                                               | Why a Cult player buys it                                                          |
| -------------- | ----------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Gathering      | same                    | reveal Fertile Ground; Harvest Fruit                                                             | The usual opener; the road to the Summoner.                                        |
| Farming        | same                    | Farm; **Rain of Fish**                                                                           | The first ritual, and growth on poor land.                                         |
| Milling        | same                    | Windmill and its healing                                                                         | The Cult has no healer; a Windmill is the only cure for its frail people.          |
| Administration | same                    | **Summoner (Summon, Snack Time, Bind)**; Market; Disband                                         | The faction's heart. Cheap and early: it can be the second technology.             |
| Planning       | same                    | +1 unit slot in every city; Land Grant                                                           | More Initiates: more chanters, more volunteers.                                    |
| Hunting        | same                    | Hunt Game                                                                                        | Growth.                                                                            |
| Forestry       | same                    | Lumber Camp; Clear Forest; Forest cover                                                          | Cover for circles and Summoners, who need it more than anyone.                     |
| Sawmilling     | same                    | Sawmill; **Stargazer (Star-fall)**                                                               | The answer to a turtle.                                                            |
| Marksmanship   | same                    | **Hexer (Ribbit)**                                                                               | The frog.                                                                          |
| Fieldcraft     | same                    | Replant Forest; Forest march; Familiars and Hexers ignore Forest stops; Hexer Sight 2            | A Horror and its Summoner cross Forest together; replanted Forest hides a circle.  |
| Scouting       | same                    | **Familiar**; Familiar Sight 2                                                                   | Villages, and the unit Switcheroo needs.                                           |
| Roads          | same                    | Build Road; Road movement; Road population                                                       | A Move-1 Summoner keeps up with a Move-2 Horror on a Road.                         |
| Commerce       | same                    | land trade; **Hire** at a Market                                                                 | An Initiate without a city's action: volunteers on demand, and the late Coin sink. |
| Raiding        | same                    | Pillage; **Switcheroo** (no Charge bonus)                                                        | Gated here because it is strong: two technologies deep.                            |
| Chivalry       | same                    | **Caller (Tentacle)**; Cultivate Forest; no Overrun                                              | The backline killer.                                                               |
| Drill          | same                    | reveal Ore; **Idol Bearer (Ward)**; Spoils                                                       | The only solid body, and safety from one's own monsters.                           |
| Engineering    | same                    | Mountain entry and Sight; Mine; Workshop; Redevelop                                              | A circle on a Mountain has cover without any technology.                           |
| Metallurgy     | same                    | Forge; Arms Industry (−1 Coin for trained units **and for a Summon**)                            | Initiates at 1 Coin: the cheapest volunteers.                                      |
| Fortification  | **Warding Chalk**       | **chanters and their leader are fortified by one level, wherever they stand** (no Field Defense) | Circles that survive a raid.                                                       |
| Explosives     | **The Stars Are Right** | Blast Mountain; Breach; **the Great Summoning**                                                  | The capstone, behind the technology that protects it.                              |
| Naval (five)   | same                    | the shared ships and docks                                                                       | As for every seafaring faction. A Tentacle may be called on water.                 |

**Where the strong effects sit.** The Summoner is early by design: the
identity must work in the first 20 rounds, and the leash is its own
drawback. The frog is at tier 2 with a cooldown. Switcheroo is at tier 2
behind Scouting. Star-fall and the Tentacle are at tier 3. The Great
Summoning is at tier 3 behind a tier 2 that exists to protect it.

**Every branch has a Cult reason:** Settlement holds the Summoner and Rain
of Fish; Wilds holds the frog and Star-fall; Mobility holds Switcheroo, the
Tentacle, and Hire; Industry holds the Ward, Warding Chalk, and the Great
Summoning; Naval is the shared branch.

## 5. Economy and city flavour

- **Economy.** The shared economy, unchanged: the same harvests, buildings,
  prices, Market, Roads, trade, and income cap. The one addition is Rain of
  Fish (+2 population, once per city level). No capacity bonus.
- **Buildings.** The names stay the shared ones, as for every faction
  (Farm, Windmill, Market); the looks are the Cult's. Suggested looks: the
  **Farm** is a mushroom patch under lanterns; the **Windmill** a
  prayer-wheel mill hung with wind chimes; the **Lumber Camp** a candle
  works; the **Sawmill** a carpenter's shed full of half-built idols; the
  **Mine** a dig with a rope going down into green light; the **Forge** a
  bell foundry; the **Workshop** a printing shed (pamphlets); the
  **Market** a "perfectly ordinary antique shop" with a tentacle under the
  awning.
- **No ritual site building.** A ritual needs no building: the circle is
  drawn by the units that make it. A "Standing Stones" building that makes
  rituals near it cheaper is a natural later addition and is not proposed
  now.
- **Cities.** A lodge: a domed hall with a crooked observatory tower and a
  green lamp, tall narrow houses with pointed roofs pressed round it. The
  hall grows with the level; at level 5 the cellar doors are open.
- **Level rewards.** The shared ladder. The Militia is one Initiate. The
  level-5 reward unit of the first capital is the Thing in the Cellar. The
  treasure unit is a Familiar.
- **Start.** One Initiate on the capital, as every faction starts with its
  line unit.
- **Growth.** Nothing different except Rain of Fish.

## 6. How the AI plays it

The Normal AI is deterministic, reads only the public view and the public
previews, and has **no memory between turns**
([current rules, section 16](RULESET_7_CURRENT.md#16-normal-ai-summary);
[Normal AI](../architecture/NORMAL_AI.md)). A mechanic it can play is one
whose state is on the board and whose value is one preview. Each faction
has its own gated module; the Cult would have one too.

| Mechanic                | The AI's rule as the Cult                                                                                                                                                                  | Honest flag                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Summon                  | Whenever a Summoner has a free leash, no cooldown, the fee, and an Initiate beside it (the most wounded one first). Trains one Summoner per four units and keeps one spare Initiate each.  | **Plays it well.**                                                                                                                      |
| The leash               | Never takes a Move marked with the broken chain. The Summoner follows its Horror to within 2 tiles and stays out of every visible enemy's reach, as a Lich does.                           | It will lose Summoners to raids. That is the faction's drama and the human's reward for a good raid. Accept.                            |
| Unruly and Loose        | Before ending its turn, steps units out from between a Horror and the enemy when its Summoner is in reach of a visible enemy. A free Summoner Binds a Loose Horror it can reach.           | Partly. It will not think a turn ahead about who is nearest.                                                                            |
| Snack Time              | The Horror at half HP or less, a spare Initiate beside the Summoner.                                                                                                                       | Plays it well.                                                                                                                          |
| Ribbit                  | The targets of [section 2.5](#25-spells), in that order; the frog before the attacks.                                                                                                      | Plays it well.                                                                                                                          |
| Switcheroo              | The three scored cases of [section 2.5](#25-spells); never where the Familiar would die for a target worth less than twice its price.                                                      | Plays the plain cases; misses the clever ones.                                                                                          |
| Tentacle                | The free tile beside the most enemy units and no own unit.                                                                                                                                 | Plays it well.                                                                                                                          |
| Star-fall               | Marks the tile with the most enemy value on the nine tiles among units on a center, on Field Defense, or Eggs, with no own unit in the area; own units never end a Move under an own mark. | Plays it adequately. It cannot guess who will walk away.                                                                                |
| Rain of Fish            | Begins when three robed units already stand together in a city's land, no enemy is within 6 tiles, and the city is due. Idle units at home prefer to end a Move beside another idle unit.  | **Underuses it.** It gathers by accident, not by plan. Accept.                                                                          |
| The Great Summoning     | Begins only when four robed units already stand together within 5 tiles of a visible enemy position while the army is waiting for the rest to arrive.                                      | **Likely beyond it.** Four units, two turns, then a retreat. Accept an AI that rarely does it; it is the last technology of the branch. |
| Research and production | Administration first after the free opener, then Drill and Marksmanship, then Scouting and Raiding; one Idol Bearer per Summoner once it has lost a Horror to its own side.                | Fixed order, as for the other factions.                                                                                                 |

**The AI against the Cult** (every other faction's seat):

- **Hunt the leash holders.** The existing hunt for a visible support unit
  (a Witch, a Brain, a Necromancer, a Confectioner) gains the Summoner, the
  Stargazer, and the Idol Bearer. A hit that cannot kill a Summoner is
  still worth taking when a Cult unit is the Horror's nearest.
- **Wild things as the Spider.** Never end a routine Move as a wild thing's
  marked target when another tile is as good; kill one only with a combined
  kill. The AI will not lure a wild thing toward the Cult on purpose, as it
  does not lure the Spider today.
- **Step out from under a star.** A unit under a visible Star-fall mark
  steps out when it can, as a unit steps out of a Dwarf mound's ring today.
- **Break circles.** A visible ritual's participants are kill targets, the
  cheapest first.

The AI's army play of rounds 5 to 7 runs for Human, Undead, and Goblin
seats only. A Cult seat would use the older policy with its own module, as
the other five factions do.

## 7. Presentation

### 7.1 Names

Nothing here uses a name from the published mythos or its games (no named
Old One, no named book, no named creature), and nothing reads as a real
religion: the Cult is drawn as a **lodge**, a secret society with silly
titles, so there are no priests, altars, temples, prayers, crosses,
pentagrams, or "sacrifice" in what the player reads. "The Ancient Ones" is
the user's phrase and is kept. The sign of the lodge is an eye in a
spiral.

- **Faction name options:** the Cult of the Ancient Ones, shown as "Cult"
  (recommended); the Tentacle Lodge; the Order of the Open Eye; the Starry
  Lodge.
- **Units:** Initiate, Familiar, Hexer, Idol Bearer, Summoner, Stargazer,
  Caller, the Thing in the Cellar; the Horror, the Tentacle, the Visitor.
- **Words:** Volunteer, Summon, Snack Time, Bind, leash, Unruly, Loose,
  wild, Ward, chant, circle, Rain of Fish, Star-fall, the Great Summoning,
  Ribbit, Switcheroo, Warding Chalk, The Stars Are Right.
- **Bad Latin** belongs in the Help text and the log, one line each
  ("Tentaculum maximum!"), never in a rule.

### 7.2 Colour

**Proposed: eldritch green, `#00ff78`**, the green of the lodge's candle
flames.

The eight faction colours and the grounds leave little room
([faction colours](../art/FACTION_COLOURS.md)). The candidates were scored
with the formulas of the faction-colour test (CIE76, and the same
simulation of deuteranopia and protanopia) against its four thresholds:
45 from every other faction, 20 under each deficiency, more than 25 from
every ground, and L\* above 42. Of 5,832 colours on a coarse grid, 26
pass: neon spring greens, a few pale yellows, and one ochre.

| Candidate                | L\* | Nearest faction | Weakest under a deficiency  | Nearest ground | Verdict                 |
| ------------------------ | --: | --------------- | --------------------------- | -------------- | ----------------------- |
| eldritch green `#00ff78` |  88 | Dwarf, 50.2     | Goblin (protanopia), 23.2   | Grass, 51.3    | **passes**; recommended |
| old parchment `#c3a55a`  |  69 | Goblin, 45.3    | Human (deuteranopia), 20.4  | Snow, 30.9     | passes by a hair        |
| indigo `#5b5bff`         |  48 | Undead, 30.6    | Undead (protanopia), 9.1    | Deep Water, 73 | fails                   |
| teal `#00b3b3`           |  66 | Dwarf, 28.9     | Martian (deuteranopia), 4.4 | Shallow, 22.9  | fails                   |
| bone white `#f2ead0`     |  93 | Candy, 38.8     | Candy (deuteranopia), 19.2  | Snow, 22.4     | fails                   |

Two cautions. The Dwarf jade is the nearest neighbour; the two are told
apart by lightness (L\* 67 against 88). And the board's **help** mark is a
yellow-green (`#b6f36a`); a neon green border beside it needs a look in a
capture before the colour is fixed.

**Sprites.** Following the converted factions, the pieces wear fixed
colours and no owner mask: **midnight-indigo robes** with pointed hoods,
pale wax candles, small brass trim, and exactly one accent, the green
flame. The summoned things are rubbery **deep-sea teal** with pale bellies
and big yellow eyes. Kept away from: the Undead's near-black cloth, bone,
and violet; the Goblins' olive skin; the Martians' magenta.

### 7.3 Looks, for the art brief

- **Initiate.** A small round figure lost in an indigo robe too big for
  it, pointed hood over its eyes, a lit green candle in one hand and a
  wavy dagger held wrong in the other. Slippers.
- **Familiar.** A fat toad-cat with stubby bat wings, one big eye and one
  small, mid-hop. No robe: the one Cult piece with no hood.
- **Hexer.** A robed figure with round spectacles over the hood, an open
  book held upside down, the free hand throwing a green squiggle.
- **Idol Bearer.** Two short robed figures under one pole, carrying a
  squat grinning stone idol with green eyes. The widest piece in the
  roster.
- **Summoner.** A tall thin robe with a very tall pointed hat, a brass
  chain looped in one hand and a small bell in the other.
- **Stargazer.** A robed figure bent to a brass telescope on a tripod,
  star chart trailing, a nightcap with stars in place of the hood's point.
- **Caller.** A robe with a brass diving helmet in place of the hood,
  blowing a huge conch horn; wet footprints.
- **Thing in the Cellar.** A heap of teal tentacles and many friendly
  eyes, a broken trapdoor round its middle like a collar, a party hat.
- **Horror.** A round rubbery body on four thick tentacles, a wide toothy
  grin, googly eyes, a spiked collar with a trailing chain. Loose: no
  chain, red eyes.
- **Tentacle.** One thick tentacle from a ragged hole, curled to slap, an
  eye at the tip.
- **Visitor.** A colossal finger with a single ring, coming down out of a
  small round hole in the sky drawn above the tile.
- **City.** As in [section 5](#5-economy-and-city-flavour).

The faction fragment and subject lines would follow the
[faction art layer](../art/factions/README.md) and its
[template](../art/factions/FACTION_TEMPLATE.md) once the roster is
approved.

### 7.4 How it reads on the board without text

| Thing                 | Shown as                                                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A ritual              | A chalk ring under the leader, a candle at each chanter joined by a thin green line, the ritual's icon, and a countdown ring of pips in the Cult colour, as an Egg's |
| Star-fall's target    | A star-shaped mark on the tile and a faint outline of the nine tiles, with the same countdown; visible to everyone who has explored the tile                         |
| A ritual breaking     | The ring goes dark, the candles blow out together, a small puff                                                                                                      |
| Beginning a ritual    | One button per ritual on the leader. Arming it rings the units that would join and, for Star-fall, shows the place mark on legal tiles                               |
| A unit in a ritual    | Skipped when cycling through units that need orders; its move tiles carry a broken-ring mark, so leaving is a choice                                                 |
| Volunteering          | The help mark on each legal Initiate with the label "Volunteer"; then the raised hand, the green puff, the slipper                                                   |
| The leash             | A collar on the Horror and a badge on the Summoner at all times; a chain link and the three-tile limit when either is selected, like Mind Control's link today       |
| A Move that snaps it  | The move mark with a broken chain                                                                                                                                    |
| Unruly                | The collar rattles, spiral eyes; the dock shows a badge and no commands                                                                                              |
| Loose and wild things | No owner colour, red eyes, pips for the rounds left; an **eye mark on the unit it will go for** as the board stands                                                  |
| Ward                  | A chalk ring on the ground round the Idol Bearer's neighbours while a wild thing is on the board                                                                     |
| A frog                | The unit's piece is a small frog on the unit's own base, with a pip for the turn left; the dock keeps the unit's portrait with a frog badge                          |
| Switcheroo            | Ghosts of the two units in each other's places before the click; two puffs and a swap                                                                                |

Each has a one-sentence tooltip (the card texts of section 2) and a Help
entry. No rule is explained on the board in words.

### 7.5 Sounds worth having

A low hummed chant, looped quietly while a ritual runs; a match strike and
a candle catching (begin); a small gong (complete); all the candles
blowing out (fizzle); a slipper flop (volunteer); a wet pop (a summon); a
chain rattle (Unruly) and a chain snap with a falling slide whistle
(Loose); a ribbit (frog) and a kiss (cured); two corks (Switcheroo); a
rising whistle and a thump (Star-fall); fish slapping on roofs (Rain of
Fish); one very large, very distant finger-snap (the Visitor leaves).

### 7.6 Theme music

In the style of the [eight themes](../audio/THEME_MUSIC.md#comparison-table),
by the [steps for a new faction](../audio/THEME_MUSIC.md#adding-a-future-faction).

| Faction | Tempo   | Metre                                  | Lead                                       | Rhythm                                  | Mood                                           |
| ------- | ------- | -------------------------------------- | ------------------------------------------ | --------------------------------------- | ---------------------------------------------- |
| Cult    | 100 BPM | 5/4, a sneaking procession with a limp | sinuous oboe, muted trumpet with a plunger | small gong, tambourine, pizzicato cello | sneaky, pompous, mock-sinister, conspiratorial |

A mock-sinister processional for a secret lodge that takes itself far too
seriously: silent-film villain music played by people in slippers. 5/4 is
unused by the other eight, and it gives the march one beat too many, so the
procession always seems to trip on its own robe. An oboe opens at once with
the shared rising three-note call and winds a sly melody in a whole-tone
colour, answered by a muted trumpet going "wah". A small gong marks the
first beat, a tambourine shivers on the fourth, a pizzicato cello walks,
and a **hammered dulcimer** keeps the steady map pulse, like slippered
footsteps down a cellar stair. The middle section is the ritual: everything
drops out but the dulcimer and a ticking woodblock, counting down, quieter
and quieter; then one wet pop (the comic sound: a cork, or a tentacle), a
beat of silence, and the theme returns, fuller. The last bar is a gong
stroke damped at once and left open to loop. Sneaky and pompous, never
frightening. Its nearest neighbours are the Undead (a 3/4 waltz on a
harpsichord at 96) and the Martians (a straight 4/4 on a theremin at 126);
its exclusions point away from both: no harpsichord, no organ, no theremin,
no waltz.

## 8. Risks and open questions

### 8.1 Decisions for the user

Each is a real choice, with the recommendation.

1. **Which shape?** The blend of this document, or one of the two purer
   shapes of [section 9](#9-two-alternative-shapes-and-the-recommended-blend).
   **Recommended: the blend.**
2. **A resource of its own, or Coins?** **Recommended: no new resource**
   ([section 2.6](#26-a-resource-of-its-own)); Favour is the written
   fallback.
3. **Can a wild thing capture or besiege a city?** **Recommended: no.** It
   never stands on a settlement center, as a Sabretooth never does. It may
   attack the unit on one.
4. **Can a summoned thing be mind-controlled by a Martian Brain, or bitten
   or infected by a Zombie?** **Recommended: no to both.** Summoned things
   are not living and are not Mind Control targets, as Dwarf constructs are
   not. The other answer makes a fine story (a Brain steals the Horror) and
   a hard rule (whose leash is it, and what happens when the Brain dies).
5. **How many at once?** **Recommended:** one Horror per Summoner, one
   Tentacle per Caller, one Visitor per Cult seat. No limit across the
   seat beyond those.
6. **Who may volunteer, and may the last unit?** **Recommended: Initiates
   only**, never Plagued or Bitten. A volunteer always stands beside the
   unit that asked, so it is never the seat's last unit; the last defender
   of a city may volunteer, at the player's risk.
7. **May a Familiar capture after a Switcheroo onto an enemy center?**
   **Recommended: yes, and watch it in hand play.** It is the upset the
   faction is for. The levers, in order: the Familiar cannot capture;
   Switcheroo never moves a unit onto or off a settlement center.
8. **How easily is a Summoner "distracted"?** **Recommended: any lost HP**
   makes its Horror Unruly for one turn, and the Unruly Horror never bites
   its own Summoner. The levers: a threshold (3 HP or more in a round); or
   the Summoner is fair game too, which is funnier and much harsher.
9. **May a player let a Horror off the leash on purpose?** **Recommended:
   yes**, by walking it beyond three tiles; the Move is marked, and the AI
   never does it.
10. **Does the Great Summoning give a monster nobody controls?**
    **Recommended: yes.** It is the user's "havoc among friend and foe",
    it spares only its own circle, and it is the one thing in the game
    that both sides must steer. The safe alternative is a second, bigger
    leashed monster, which is more of the same.
11. **Is Rain of Fish wanted at all?** It is the only ritual with a
    peaceful pay-off and the only Cult change to the economy.
    **Recommended: keep it**, bounded at once per city level, and cut it
    first if the faction must shrink.
12. **Does the Cult build Field Defense?** **Recommended: no**, like the
    five newer factions; Warding Chalk takes its place.
13. **The colour:** eldritch green `#00ff78`, or the parchment yellow that
    barely passes? **Recommended: the green**, after a capture beside the
    Dwarf border and the help mark.
14. **The name and the words:** "Cult", "Volunteer", the lodge framing,
    and the unit names of [section 7.1](#71-names).
15. **Nine players.** A ninth faction makes a nine-player match legal
    automatically (the seat count follows the faction count, and nine seat
    colours already exist). **Recommended: allow it**; the map-scale tables
    need a nine-seat row.

### 8.2 Risks

- **Readability when it is not your turn.** Every Cult state is public on
  an explored tile, so nothing is hidden from the player watching an AI
  Cult turn. The risk is the opposite: too many marks. A ritual, a leash,
  a star mark, and a wild thing's eye mark may all be on one screen. The
  UI step should stage a worst-case scene before the art is final.
- **The neutral turn gets busier.** Today it exists only on a board with a
  Spider. With the Cult it runs whenever a wild thing is about, and its
  playback ("The wilds stir") will be seen often.
- **Wild things and fog.** A wild thing reads the whole board, as the
  Spider does, so it may go for a unit a player cannot see. The eye mark is
  then missing for that player. The Spider's preview already reports "not
  exact" in that case.
- **Circles are clumps.** A Knight's Overrun, a Kaboom, or a Wail on a
  circle is a disaster for the Cult. That is intended, and it may make
  rituals near an enemy simply not worth it. Warding Chalk and the
  one-turn rituals are the answers; hand play decides.
- **Star-fall every turn.** A Stargazer that never moves marks a tile every
  turn. Against an opponent that must hold a tile, that is 5 or more a
  turn, through Walls. The levers are the damage, a cooldown, and a
  chanter count of two.
- **The AI Cult may be weak.** See [section 6](#6-how-the-ai-plays-it).
- **Over budget.** The Cult has more unique rules than any faction: the
  leash with two failure states, a ritual frame with three rituals, four
  spells, the Ward, and three summoned pieces. **The order in which to
  cut:** Rain of Fish; then the Great Summoning and the Visitor; then
  Switcheroo (the Familiar keeps Charge); then Snack Time. What must stay:
  Summon and the leash, Volunteer, Ribbit, Star-fall, the Tentacle, the
  Ward.

### 8.3 Size and order of work

A typical faction (the Candy) was three commands, four state lists, seven
events, one AI module, eight unit sprites, and six beads after its
contract. The Cult, by mechanic:

| Mechanic                                                    | Engine                                                                                          | AI     | UI and art |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------ | ---------- |
| Registration, roster, tree, rewards, a ninth seat           | medium (the ordinary cost of a faction, plus three appended role IDs in all nine registrations) | small  | large      |
| Volunteer                                                   | small                                                                                           | small  | small      |
| Summon, the leash, Snack Time, Bind                         | medium                                                                                          | medium | medium     |
| Unruly (a Start Turn rampage)                               | medium                                                                                          | small  | small      |
| Loose: an owned unit turns wild; the neutral turn for all   | **large**                                                                                       | medium | medium     |
| Tentacle, Visitor, Ward, Cellar-bound                       | small each, once Loose exists                                                                   | small  | medium     |
| Ribbit                                                      | small to medium                                                                                 | small  | medium     |
| Switcheroo                                                  | small                                                                                           | medium | small      |
| The ritual frame                                            | medium                                                                                          | medium | medium     |
| Rain of Fish, Star-fall, the Great Summoning, Warding Chalk | small each, once the frame exists                                                               | medium | small      |

**Overall: large.** About one and a half times the Candy faction in the
engine (roughly seven commands, five state lists, a dozen events), about
the same again in the AI (it must be taught both sides of the leash, the
star mark, and the wild things), and about a third more art (eleven unit
pieces, a frog, and the ritual, leash, and mark effects).

**Suggested beads, in order:**

1. **Contract.** The exact rules after the user's decisions, with every
   number run through the engine's combat preview, as the Candy contract
   was.
2. **Engine I: the leash.** Registration, the roster with plain numbers,
   the tree, Volunteer, Summon, Snack Time, Unruly, Loose, Bind, and the
   generalised neutral turn. After this step the faction can be played by
   hand in the text harness, and the heart of it can be judged.
3. **Engine II: hexes and havoc.** Ribbit, Switcheroo, the Tentacle, the
   Ward, Cellar-bound.
4. **Engine III: rituals.** The frame, Rain of Fish, Star-fall, Warding
   Chalk, then the Great Summoning and the Visitor.
5. **Normal AI I:** as the Cult (Summon, the leash, frogs, Tentacles) and
   against it (the hunt, wild things, the star mark). **Normal AI II:**
   rituals and Switcheroo.
6. **Art:** the fragment and a three-piece sample for approval, then the
   batches; the theme prompt.
7. **UI:** the buttons, the leash, the circle, the marks, the frog, Help,
   the sounds.
8. **Hand-play tuning** against the Humans, a few games, by the user's
   method for every faction.
9. **Fold** into the current rules.

## 9. Two alternative shapes and the recommended blend

### 9.1 Shape A: "Summoners"

The faction is frail cultists and strong monsters on leashes, and nothing
else. The Cult trains only two kinds of unit in its cities, Initiates and
Summoners. Every other role (the fast one, the ranged one, the defender,
the siege piece, the breakthrough piece) is **a monster summoned in the
field**: an Initiate volunteers, the player pays the monster's price in
Coins, and the monster stands on a leash held by a cultist. The technology
tree unlocks kinds of monster where it unlocks units for everyone else,
much as the Dinosaurs lay their five big roles as Eggs. There are no
rituals and no spells.

- **For it.** It is the purest form of the user's most distinctive idea:
  every fight is about the handlers. It is one system, so the engine is
  smaller (no ritual frame, no frog, no swap) and the AI's job is close to
  ordinary production. Constant turnover is built in.
- **Against it.** It is one note. A whole army that turns on itself when a
  few cultists die swings very hard: the Cult either wins the fight for its
  handlers or loses everything at once, which is the "always wins or never
  wins" shape the user wants to avoid. It leaves out rituals, multi-unit
  actions, and wacky spells, three of the user's six ideas. And every
  Cult army would be twice the pieces on the board for the same strength.

### 9.2 Shape B: "Ritualists"

The faction is board control by slow, visible rituals and hexes. No leash
and no controllable monster. The roster is cultists with one hex each;
the tree unlocks rituals; a ritual site building in a city's land makes
rituals near it stronger. Five or six rituals instead of three: growth, a
star, a wall of fog, a door pair, a curse on a city, and the Great
Summoning, whose monster nobody controls.

- **For it.** Nothing else in the game plays like it: the Cult wins by
  where it stands and what it is counting down to, and the opponent's
  whole game is racing the countdowns. Nothing changes owner, so the
  largest engine piece of the blend is much smaller (only the Visitor is
  wild). Every user idea except the leash is in.
- **Against it.** It leaves out the leash, the idea the user dwelt on
  longest. It is the shape the heuristic AI plays worst: rituals need
  several units to hold a formation over turns, and the AI has no memory
  between turns. An AI Ritualist would be a faction of frail infantry, so
  the player would rarely meet a real one. In a player's hands it turns
  toward the slow, standing game that the Human tuning rounds worked to
  get rid of.

### 9.3 The recommended blend

**Take the leash from A as the everyday engine and the rituals from B as
the set pieces, and hang one hex on each cultist.**

- From A: one monster, the Horror, on one leash per Summoner, with both of
  its failure states. That is enough to make "kill the cultist, not the
  demon" the thing every opponent learns, without tying the whole army to
  it.
- From B: three rituals, not six, with three clearly different pay-offs,
  and the one monster nobody controls as the capstone.
- For the AI: the pieces it plays well (Summon, frogs, Tentacles) carry an
  AI Cult; the pieces it plays badly (the rituals) are extras for the
  player.
- For turnover: the strongest pieces eat the weakest, every turn.

It is the largest of the three to build. It is recommended because it is
the only one that contains all six of the user's ideas, because its
central risk is a decision the player takes every turn, and because it
gives the opponent a clear and satisfying counter. If the size is too
much, the cut order of [section 8.2](#82-risks) reduces it toward shape A
with a few hexes, which is the better of the two purer shapes to fall
back on.
