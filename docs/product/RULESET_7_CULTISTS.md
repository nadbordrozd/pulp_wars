# Ruleset 7: the Cultists of the Ancient Ones (spec)

**Status:** design spec for the ninth faction (bead `pulp_wars-mch9.1`,
epic `pulp_wars-mch9`, 2026-10-09). Nothing here is implemented. It
replaces [the Cult proposal](RULESET_7_CULT_PROPOSAL.md) of 2026-10-06
(bead `pulp_wars-2yc.25`), which stays as design history; where the two
disagree, this document is the design. It is an overlay over
[Ruleset 7: current rules](RULESET_7_CURRENT.md) at `pulp-wars-poc-7r64`
plus the work in progress named in [section 13](#13-interactions); every
rule it does not mention stays in force. Every number is a first guess
for the contract step to run through the engine's combat preview, except
where a [variance rule](#2-the-variance-rules) forbids a change.

**What to read:** the [one-page summary](#one-page-summary), the
[variance rules](#2-the-variance-rules) (section 2), the
[two choices with alternatives](#12-alternatives-the-economy-and-the-upkeep)
(section 12), the [beads to file](#17-beads-to-file) (section 17), and the
[open questions](#18-open-questions-for-the-user) (section 18).

## One-page summary

**The faction.** A secret lodge of pulp-magazine cultists in pointed
hoods who bargain with things from beyond the stars. Faction ID `CULT`,
shown as **Cultists**; the full name is the Cultists of the Ancient Ones.
Their own people are cheap and frail. Their strength is borrowed, and it
is enormous.

**Five pillars** (the user's four ideas of 2026-10-09, and the fifth that
governs them):

1. **Daemons they cannot always control.** A **Horror** needs one cultist
   channelling it every turn; the **Herald**, the greater daemon, needs
   three. A daemon whose upkeep fails at the start of the Cult's turn is
   **Unbound**: it belongs to nobody and attacks the nearest unit, friend
   or foe, at once and after every round, until someone kills it or binds
   it again.
2. **Human sacrifice.** A Summoner **Sacrifices** an own unit, or
   **Seizes** a frogged or broken enemy held down by two cultists. Cities
   make an **Offering** of their own population.
3. **Rituals that need several cultists.** Summoning a Horror takes two
   cultists; **Star-fall** takes a Stargazer and its chanters; **the Great
   Summoning** of the Herald takes a Summoner and three chanters for a
   whole enemy turn.
4. **One special economic mechanic on the shared spine: Favour.** Coins,
   villages, cities, buildings, levels, and the reward ladder are
   unchanged. Sacrifices, Seizures, Offerings, and the kills of bound
   daemons give **Favour**, a public, uncapped pool that pays for every
   summoning.
5. **Bold and high variance, by rule.** The Herald is far above every
   unit in the game (60 HP, Attack 7, two attacks a turn, ignores
   fortification). Nothing caps Favour, the number of daemons, or the
   damage of a failure. The only fairness rule is that the counterplay is
   always on the board: **kill or disrupt the channellers**. Any Hit Point
   a channeller loses breaks its hold.

**The roster:** Initiate (line), Idol Bearer (defender), Familiar (fast),
Hexer (ranged), Summoner (support), Stargazer (siege), Caller
(breakthrough), the Chosen (heavy line), and the reward giant, the Thing
in the Cellar. Summoned, never trained: the Horror, the Herald, and the
wild Tentacle.

**Who beats it:** anything that reaches the channellers: Marksmen,
Catapults, Raiders, bombs, Plague, Wail, Freeze, pulls, and pushes. **What
it beats:** everything, for as long as the channel holds. **The swing:**
a Cult that keeps its Herald bound rolls an opponent over in a few turns;
a Cult whose channellers are shot watches its Herald eat its own army.

**Review axes at a glance:**

| Axis                  | The Cult's answer                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Crowd control         | Star-fall (a 3 × 3 explosion of 5 + 1 per chanter); the Herald's two attacks a turn; wild daemons and Tentacles that bite whoever is nearest       |
| Fortifications        | Star-fall ignores Walls, Field Defense, and Dig In and destroys Field Defense and Barricades; a frog has no fortification; the Herald ignores them |
| Long-range attackers  | Ribbit frogs a Catapult or Marksman at range 2; a Tentacle rises next to it within 3 of a Move-2 Caller; Switcheroo pulls it into the circle       |
| Unique abilities      | Channel and Unbound; Favour; Sacrifice, Seize, Offering; rituals; Ribbit; Switcheroo; Tentacle; Ward; Martyr; Anchor                               |
| Balance against Human | Unit for unit the cultists are a little weaker and cheaper; the daemons are deliberately far stronger, paid in Favour and upkeep (section 10)      |
| Thematic fit          | Every name and effect is lodge-and-tentacle pulp: hoods, candles, chanting circles, a star chart, a herald from the stars                          |

## The brief

The user's direction, from the comments on `pulp_wars-mch9.1` (authoritative):

- **2026-10-06** (the proposal's brief): demon summoning, magic, blood
  sacrifice, rituals that need more than one unit, wacky spells,
  uncontrollable summons that wreak havoc among friend and foe,
  controllable summons that get out of control when the summoner is
  killed or distracted.
- **2026-10-09, pillars:** daemons they cannot always control; human
  sacrifice as a resource or a cost (own units, captured or enemy units,
  population); rituals that need several cultists; idiosyncratic
  economics.
- **2026-10-09, be bold:** "A greater daemon must be truly overpowered, far
  above any other unit"; balanced by an upkeep of control ("it needs 3
  cultists casting control spells at it every turn, or it goes berserk"),
  not by stat dampeners; snowballs and spectacular failures are accepted;
  **no soft caps, pity timers, catch-up rules, or nerfs**; balance is a
  fairness check only (counterplay must exist); state these as design
  rules so later balance passes do not tune the variance away. This
  overrides the earlier "readable and manageable" softening.
- **2026-10-09, economy:** keep the shared economy spine (Coins, villages,
  cities, buildings, city levels, the reward ladder) and add **one** special
  Cult economic mechanic; offer two or three alternatives with a
  recommendation.
- **The root's brief** (2026-10-09): revise the proposal, keep what fits;
  the one-Summoner leash may become a multi-cultist channel; sacrifice is
  central; Favour is a candidate for the mechanic; answer the proposal's
  fifteen decisions.

The standing memory `cultist-faction-user-2026-10-09-high-variance`
repeats the variance rule for every later session.

### What changed from the proposal

| The proposal (2026-10-06)                                     | This spec                                                                                                    | Why                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| One Summoner holds one Horror on a three-tile leash           | **Channel:** a daemon needs as many channelling cultists every turn as its Control (Horror 1, Herald 3)      | The user's own example of upkeep          |
| Hurt Summoner: Unruly for a turn; dead Summoner: Loose        | One rule: a channeller that loses HP, is moved, frozen, or taken breaks its strand; too few strands: Unbound | One rule to learn, every faction can hit  |
| A Loose Horror fades after four rampages                      | An Unbound daemon never fades; it is killed or bound again                                                   | No pity timers                            |
| The Visitor: an uncontrolled monster from the Great Summoning | **The Herald:** the truly overpowered greater daemon, bound by three channellers                             | "Truly overpowered", "held by upkeep"     |
| Volunteer, own Initiates only, "never for value"              | **Sacrifice** any own unit, **Seize** enemies, **Offering** of population; all give Favour                   | Sacrifice is central                      |
| No resource of its own; Favour only as a fallback             | **Favour** is the faction's one economic mechanic, uncapped and public                                       | The user asked for one                    |
| Rain of Fish (+2 population, once a level)                    | Cut; the Offering goes the other way (population into Favour)                                                | Only one economic mechanic                |
| Snack Time heals a Horror                                     | Cut: no daemon ever heals                                                                                    | Daemons are spent, not kept               |
| Ribbit: a frog keeps its Defense                              | A frog has Defense 0.5 and no fortification, and may be Seized                                               | Distinct from the new Ice Folk Freeze     |
| Ward: wild things ignore the Idol Bearer's neighbours         | Ward: its neighbours keep their strand when they lose HP                                                     | Protects the upkeep, not from the failure |
| Warding Chalk (chanters fortified)                            | Warding Circles: the Idol Bearer and its Ward                                                                | Ward carries it                           |
| Thing in the Cellar: Push; breaks loose if its city falls     | Thing in the Cellar: **Anchor**, channels as two without spending its turn                                   | A giant signature, tied to the faction    |
| "Sacrifice" appears nowhere the player reads                  | The button says **Sacrifice**; the show stays bloodless                                                      | The user's word                           |

Kept from the proposal: the lodge tone, the Initiate, Familiar, Hexer,
Idol Bearer, Summoner, Stargazer, and Caller, Star-fall, Switcheroo, the
Tentacle, the public ritual frame, the colour, the looks, the sounds, the
theme music, and the per-faction counter table, all revised below.

## 1. Identity

### 1.1 In a paragraph

Humans are sustain, the Undead attrition, the Goblins a reckless horde,
the Dinosaurs few, big, and growing, the Martians a mobile invasion, the
Ice Folk the things from the peaks, the Dwarves heavy and built to last,
the Candy a sugar rush. The Cultists are **a terrible bargain**. Their
robed people are worth little in a fight; what they buy with them is
worth more than anything on the board. Playing the Cult feels like
holding a burning rope: every turn you count your channellers, guess
which of them the enemy can reach, and decide whether to feed the
Ancient Ones one more Initiate. Playing against it feels like a heist
with a tiger in the vault: never fight the tiger; find the three people
holding its chain and hit any one of them.

### 1.2 How it differs from each faction

| Faction  | Its signature                                      | Why the Cult is not that                                                                                                                                                                                |
| -------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Human    | Sustain, Field Defense, Overrun                    | No healer, no Field Defense, no Overrun. Its daemons never heal.                                                                                                                                        |
| Undead   | Turns the dead into its units (Graves, Infect)     | **Overlap: death becomes power.** The Undead get a unit from a corpse; the Cult gets a number (Favour) from a living victim it kills on purpose. Nothing the Cult summons comes from a death.           |
| Goblin   | Kaboom, death blasts, Berserk, Plunder             | **Overlap: kills pay.** Plunder pays Coins for any kill; Favour comes only from a bound daemon's kill or a Seizure, and buys only daemons. The word "berserk" is the Goblins' (the Cult says Unbound).  |
| Dinosaur | Eggs and growth                                    | A summon is instant or one turn, made of live participants, and is never a unit that grows.                                                                                                             |
| Martian  | Mind Control takes your unit while the Brain lives | **Overlap: control.** The Brain controls an **enemy** and loses it back to its owner; the Cult controls its **own** daemon and loses it to nobody. The Cult never takes an enemy unit; a Seizure kills. |
| Ice Folk | Freeze, Shatter, Snow                              | **Overlap: a disabled enemy.** A frozen unit keeps its Defense and cannot move; a frog can hop but has Defense 0.5, no fortification, and may be Seized. One unit, every second turn.                   |
| Dwarf    | Reliable machines, repair, tunnels, Barricades     | Cult power is unreliable by design and cannot be repaired. Star-fall destroys Barricades.                                                                                                               |
| Candy    | Sugar Rush and the Crash; Crumbs; Splat            | Nothing of the Cult is re-made; no burst of speed.                                                                                                                                                      |

**The Undead and the Martians, spelled out** (the bead's requirement):

- **Undead: attrition and raising the dead.** The Undead win slowly: every
  death near them, either side's, becomes an Undead unit (a Grave, Raise
  Dead, Infect, a Bitten rising), and Plague grinds. The Cult does not
  convert, raise, or grind. Its deaths are **chosen and immediate** (a
  Sacrifice, a Seizure) and their product is Favour, which becomes a
  daemon only through a ritual. A Cult death leaves a Grave in an Undead
  match exactly as any death does, except a Sacrifice or Seizure, which is
  a removal and leaves none ([section 13](#13-interactions)), so the two
  factions never feed each other's mechanic by accident. Only living units
  can be Seized, so Undead units are never Cult victims.
- **Martians: mind control.** Mind Control is a weapon against the enemy's
  units; the Channel is an upkeep on the Cult's own. When a Brain dies its
  thrall goes home; when a channel fails the daemon goes nowhere and bites
  the nearest unit. Summoned daemons are immune to Mind Control (they are
  not one-slot living units), and a Brain that takes a channeller breaks
  its strand, which is the Martians' best answer to a Herald.

## 2. The variance rules

These are **design rules of the faction**, binding on every later
balance, tuning, and AI pass (the user, 2026-10-09; memory
`cultist-faction-user-2026-10-09-high-variance`). A balance bead that
wants to break one asks the user first.

1. **The Herald is truly overpowered.** No other unit, giants included,
   comes near it in a straight fight. Its HP, Attack, Defense, Move, two
   attacks, and fortification-ignoring are never lowered to bring it
   nearer to a giant.
2. **Control is the price.** The daemons are paid for by Favour and by the
   channel upkeep, never by stat dampeners. The Control numbers (Horror 1,
   Herald 3) may be raised only by the user.
3. **No caps.** No cap on Favour, on Favour per turn, on daemons per seat,
   on summons per turn, or on the Favour of one Seizure. (A Caller's one
   Tentacle at a time is the shape of a spell, not a cap on the economy.)
4. **No failure protection.** A broken ritual refunds nothing. An Unbound
   daemon never fades, never weakens, and never spares the seat that
   summoned it (it prefers it on a tie). There is no "banish" button, no
   pity timer, and no warning period beyond what the board already shows.
5. **No catch-up.** Favour compounds: kills by bound daemons pay Favour,
   which buys more daemons. Nothing slows a Cult that is winning or helps
   one that is losing.
6. **Fairness is counterplay only.** Every bind and every ritual has a
   public weak point any faction can reach: the channellers and chanters,
   shown on the board to every player who sees them. A later pass may
   change a number **only to restore counterplay that hand play showed was
   missing** (for example, a channel range that left channellers out of
   every enemy's reach), never to make a swing smaller.
7. **No dice in control.** Whether a daemon stays bound is decided by the
   board, never by a random draw. The swings come from the opponent's play
   and the Cult's own greed.

## 3. Favour: the Cult's one economic mechanic

**Card text: "The Ancient Ones pay in Favour. Feed them, and summon."**

- **The pool.** Every Cult seat has a whole number of **Favour**, starting
  at 0, with no maximum. It is **public**: every player sees every Cult
  seat's Favour beside its name, as a row of green candles and a number.
  Favour is not Coins: it cannot be bought, traded, spent on anything but
  summoning, or lost, except by spending it.
- **What it pays for.** Summon a Horror: **5 Favour**. Begin the Great
  Summoning of the Herald: **20 Favour**, paid when the ritual begins and
  not refunded if it fizzles.

| Source                    | Rule                                                                                                                               | Favour                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **Sacrifice**             | A Summoner removes an own unit next to it ([section 5.1](#51-sacrifice))                                                           | the unit's value            |
| **Seize**                 | A Summoner removes a frogged or broken (5 HP or less) living enemy next to it, held by a second cultist ([section 5.2](#52-seize)) | **twice** the unit's value  |
| **Offering**              | A Cult city gives up 2 population, as its city action ([section 5.3](#53-offering))                                                | 3                           |
| **A bound daemon's kill** | A Horror or Herald of the seat kills a hostile unit ("the Ancient Ones feed")                                                      | the victim's value          |
| **Martyr**                | A Chosen of the seat dies to anything but a Sacrifice                                                                              | 6 (its value)               |
| **Consumed**              | A unit on the Herald's arrival tile is eaten ([section 7.3](#73-the-great-summoning-and-the-herald))                               | as a Sacrifice or a Seizure |

**Value** is the [Score](RULESET_7_SCORE_AND_STARS.md#32-exact-definitions)
unit value: the printed cost of the unit's role under its kind (an
Initiate 2, a Knight 9, a Battleship 16, an Egg its role's cost), 12 for a
reward giant, 10 for the Giant Spider. A summoned daemon has the values of
[section 4.2](#42-summoned-units). Free units (Militia, Scouts, risings,
treasure units) are worth their role, like everywhere else.

**How it sits with the shared spine.**

- **Coins** still buy every trained unit, building, technology, and Land
  Grant at the shared prices. An Initiate is the Cult's way of turning
  Coins into Favour: 2 Coins and a city action become 2 Favour. A Seizure
  is the way of turning the enemy's Coins into Favour, at double.
- **Villages and cities** are unchanged; capturing works as for everyone.
  The Offering is the one place the Cult trades city growth for Favour.
- **The reward ladder** is unchanged (section 4.8 of the current rules);
  the Cult's reward units are in [section 4.3](#43-reward-starting-and-treasure-units).
- **Score:** Favour is not a Score factor. A daemon's Army value counts
  while the seat commands it ([section 13](#13-interactions)).

**Why it is high variance and still fair.** Favour piles up fast in a war
the Cult is winning (every bound kill pays) and not at all in one it is
losing; nothing evens that out (rule 5). The opponent always sees it: a
Cult at 20 Favour with a Summoner and three robed units together is about
to begin a Great Summoning, and everyone can read that off the board.

## 4. Roster

Attack and Defense in whole units, in the scale of the
[Human roster](RULESET_7_CURRENT.md#11-unit-roster). **Every number is a
first guess**; the combat results quoted in this document were computed
with the formula of
[section 13.2 of the current rules](RULESET_7_CURRENT.md#132-damage) and
must be re-run by the contract step through the engine's combat preview.

**Robed cultists** are the Cult's trained land units except the Familiar
(an animal) and its ships: Initiate, Idol Bearer, Hexer, Summoner,
Stargazer, Caller, and Chosen. Only a robed cultist channels, chants, or
holds down a Seizure; the Thing in the Cellar channels by its own rule.

### 4.1 Trained units

| Unit                    | Role         | Technology                      | Cost |  HP | Attack | Defense | Move | Range | Captures | What makes it not a reskin                                                                                 |
| ----------------------- | ------------ | ------------------------------- | ---: | --: | -----: | ------: | ---: | ----: | -------- | ---------------------------------------------------------------------------------------------------------- |
| **Initiate**            | `FIGHTER`    | start                           |    2 |  10 |      2 |     1.5 |    1 |     1 | yes      | Channels, chants, holds a Seizure; the cheapest Sacrifice. No Field Defense.                               |
| **Idol Bearer**         | `GUARD`      | Fortification (Warding Circles) |    3 |  16 |    1.5 |     2.5 |    1 |     1 | yes      | **Ward:** own units next to it keep their strand when they lose HP. Cannot attack after moving. Channels.  |
| **Familiar**            | `RAIDER`     | Scouting (Familiars)            |    3 |   8 |      2 |       1 |    2 |     1 | yes      | **Switcheroo** (Raiding). Sight 2. No Charge, no Escape, does not ignore zones of control. Never channels. |
| **Hexer**               | `MARKSMAN`   | Marksmanship (Hexers)           |    4 |   9 |      2 |       1 |    1 |   1–2 | yes      | **Ribbit** every second turn. Never advances. Channels.                                                    |
| **Summoner**            | `CAPTAIN`    | Administration                  |    5 |  10 |      1 |       1 |    1 |     1 | yes      | **Sacrifice, Seize, Summon Horror**; leads the Great Summoning. No Rally, no Tend Wounded. Channels.       |
| **Stargazer**           | `CATAPULT`   | Sawmilling (Stargazers)         |    8 |  10 |      — |     0.5 |    1 |     — | yes      | No attack of its own. Leads **Star-fall** at 2 to 4 tiles. Channels.                                       |
| **Caller**              | `KNIGHT`     | Chivalry (Callers)              |    8 |  12 |    2.5 |       1 |    2 |     1 | yes      | **Tentacle** within 3 tiles. No Overrun. Channels.                                                         |
| **Chosen**              | `SWORDSMAN`  | Metallurgy (the Chosen)         |    6 |  15 |    3.5 |       2 |    1 |     1 | yes      | **Martyr:** its death gives 6 Favour. Channels.                                                            |
| **Thing in the Cellar** | `JUGGERNAUT` | reward only                     |    — |  40 |      4 |     3.5 |    1 |     1 | yes      | **Anchor** (its signature, [section 8.4](#84-anchor-the-thing-in-the-cellar)).                             |
| Patrol Boat and others  | the ships    | Naval branch                    |    — |   — |      — |       — |    — |     — | no       | The shared ships, drawn in the Cult's style (a black gondola with a lantern).                              |

Every land unit captures (`pulp_wars-ke95`), the Stargazer and the Thing
included. The Familiar is the only robed-less trained land unit.

### 4.2 Summoned units

Never trained, hired, found, or rewarded. None is living (no Plague,
Bitten, Infect, Wail, or Seizure), none heals by any source, none is
promoted or disbanded, none embarks, none has a home city or fills a unit
slot (the Undead rising precedent), and none is a Mind Control, Swallow,
Tractor Beam, or Switcheroo target. A daemon moves like a Martian walker:
no Forest or Mountain stop, Mountain allowed without Engineering, never
water.

| Unit         | From                | Price                            | Control |  HP | Attack | Defense | Move | Value | Rules                                                                                                                                   |
| ------------ | ------------------- | -------------------------------- | ------: | --: | -----: | ------: | ---: | ----: | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Horror**   | Summon Horror       | 5 Favour; two cultists           |       1 |  18 |      4 |       2 |    2 |     6 | Captures while bound. Can be pushed, knocked back, and Frozen (moving it away from its channellers is counterplay).                     |
| **Herald**   | the Great Summoning | 20 Favour; four cultists, a turn |       3 |  60 |      7 |       4 |    2 |    24 | **Ravage** (two attacks a turn), **Unstoppable** (ignores fortification; immune to every status and every shove). Captures while bound. |
| **Tentacle** | a Caller's Tentacle | the Caller's action              |       — |   8 |      3 |       1 |    0 |     0 | Wild from birth: owned by nobody, slaps the weakest unit next to it ([section 9.3](#93-tentacle)). Sinks after 3 rounds.                |

**Horror.** A rubbery, round, many-armed thing with googly eyes and a
spiked collar. In a fight it is a Knight that hits harder and lasts
longer: it kills a full-HP Fighter (12 of 12) or Knight (13 of 13) in one
attack, deals a Guard 10 of 17 and takes 6. A Knight deals it 12 and
takes 3.

**Herald.** The lodge's life's work: a towering herald of the Ancient
Ones, a robe of night sky with one huge eye, and a crown of tentacles.

- **Ravage.** It may attack twice in each of its owner's turns, after or
  without a Move, at the same target or two targets; it never advances
  after a kill. (When Unbound, its rampage also has two attacks.)
- **Unstoppable.** Its attacks ignore the defender's fortification levels
  (Walls, Field Defense, Dig In) and destroy a Field Defense on the
  target's tile, as Breach does; cover still counts. It is immune to
  Freeze, Ribbit, Splat and every Candy status, Plague, Bitten, Mind
  Control, Swallow, Push (so a Crushing Shove crushes it, as damage), the
  Charge! push, Knockback, every Tractor Beam, Bounce, a gate's shove, and
  Switcheroo. Damage of every kind hurts it.
- **Numbers.** At full HP it kills a full-HP Fighter, Guard (in the open
  or on a walled center with a Field Defense), Knight, Champion, or
  Summoner with one attack, taking nothing back. It deals a Juggernaut 20
  and takes 7, then kills it with its second attack: **a giant dies in one
  turn.** Against it, a Knight deals 9 and takes 9, a Champion 7 and takes
  10, a Juggernaut 9 and takes 9, a Catapult 6, a Battleship 16 at range 3.
  Killing a fresh Herald by attrition takes about ten Catapult shots or
  seven Knight charges. The cheap answer is the channel (rule 6).

### 4.3 Reward, starting, and treasure units

Following the reward ladder of
[section 4.8 of the current rules](RULESET_7_CURRENT.md#48-city-rewards)
(no change to the ladder):

| Slot                                | Cult unit                                                                                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Starting unit                       | One Initiate on the capital (the `FIGHTER` role, like every faction)                                                                                                                              |
| Level 2 Militia (or +4 Coins)       | **Two Initiates** (the Goblin precedent of a two-unit Militia: the Cult is the other fodder faction; two Initiates are 4 Coins of units against the 4-Coin Stockpile, and 4 Favour if Sacrificed) |
| Level 3 Scouts (or Walls)           | The radius-3 reveal and a **Familiar**                                                                                                                                                            |
| Level 5 and up: giant (or 10 Coins) | The **Thing in the Cellar**, at every level from 5                                                                                                                                                |
| Treasure chest unit                 | A **Familiar** (the `RAIDER` role, like the five newer factions; never a tier-3 unit, so the round-15 rule never applies)                                                                         |

Reward units appear by the shared placement rules. No reward, chest, or
Market hire ever gives Favour or a daemon.

## 5. Sacrifice

**Recommendation: first version. The heart of the economy.** The word on
the button is **Sacrifice** (the user's word); the show stays pulp and
bloodless ([section 14](#14-presentation)).

### 5.1 Sacrifice

**"The Summoner offers a unit beside it to the Ancient Ones: it is gone,
and you gain its value in Favour."**

- **Command** `SACRIFICE { unitId, victimUnitId }`, a primary action of a
  Summoner that may follow its Move.
- **Victim:** an own land-form unit on one of the eight tiles around the
  Summoner, of any role, the Thing in the Cellar and the Familiar
  included, never a daemon, an Egg, or a mind-controlled unit (the Cult
  never controls one), and **not Plagued or Bitten** (as for Disband, so a
  Sacrifice never dodges a bite).
- **Result:** the victim is removed (`UNIT_DIED` cause `SACRIFICED`): no
  kill credit, no Grave, no rising, no death blast, no Crumbs, no Plunder,
  no growth for anyone; its slot frees. The seat gains Favour equal to its
  value. It is not a Loss in the Score (like Disband) but ends a flawless
  game.
- **No limit** but the Summoner's one action a turn and the units beside
  it. The last unit of a city may be Sacrificed.
- **A lawful trick:** Sacrificing an own unit that the enemy is about to
  kill denies the kill (a Dinosaur's growth, a Knight's Overrun step, a
  Goblin's Plunder, an Undead Grave) and banks its value.

### 5.2 Seize

**"Two cultists hold down a broken or frogged enemy; the Summoner offers
it. Twice its value in Favour."**

- **Command** `SEIZE { unitId, victimUnitId }`, a primary action of a
  Summoner that may follow its Move.
- **Victim:** a hostile unit on one of the eight tiles around the
  Summoner that the actor sees, in land form, **living**
  (`isLivingUnitV7`: not of the Undead kind, not a construct), not a
  reward giant, not a two-slot unit, not an Egg, not neutral, and either a
  **frog** ([section 9.1](#91-ribbit)) or at **5 HP or less** (a Shield
  does not count). It must also stand next to **at least one other robed
  cultist** of the actor (the holder), who spends nothing.
- **Result:** the victim dies (`UNIT_DIED` cause `SACRIFICED`), credited
  to the Summoner as a kill (kills, Promotion, Slayer, the Score's Kills),
  with no Grave, rising, death blast, Crumbs, or Plunder. A Seized Brain
  releases its controlled unit. The seat gains **twice** the victim's
  value in Favour: a Fighter 4, a Guard 6, a Raider 8, a Knight 18, a
  Champion 12.
- **Why not Mind Control:** the Brain takes a weakened unit and may lose it
  again; the Seizure kills it for good and leaves nothing on the board.

### 5.3 Offering

**"A city gives up 2 population to the Ancient Ones for 3 Favour."**

- **Command** `OFFERING { cityId }`, the city's action for the turn
  (needs Farming, shown as **Harvest Rites**, [section 11](#11-technology-tree)).
  The city is the actor's, level 2 or more, not besieged, with no pending
  reward.
- **Result:** the city's population drops by 2 for good (a new city field
  `offeredPopulation`, subtracted in the population formula, so the city
  is 2 population further from its next level). Population may go below 0,
  which lowers the city's income by the shortfall, as live population loss
  already does. A level is never lost and a reward never repeats. The
  seat gains 3 Favour.
- **Why it is a real price:** 2 population is about 5 Coins of harvests and
  delays the city's next reward; it is the Coin-free route to Favour,
  worth it when the Cult is short of Coins and long of time.

## 6. Daemons and the Channel

**Recommendation: first version. The heart of the faction.** The choice
of this upkeep model over two alternatives is
[section 12.2](#122-control-upkeep).

### 6.1 Summon a Horror

**"The Summoner and a cultist beside it summon a Horror for 5 Favour.
Both channel it this turn."**

- **Command** `SUMMON { unitId, helperUnitId, at }`, a primary action of a
  Summoner that may follow its Move: the helper is a robed cultist of the
  actor on one of the eight tiles around the Summoner that has not used a
  primary action (it may have moved); `at` is a free land tile next to the
  Summoner that a Horror could enter. Costs 5 Favour.
- **Result:** a Horror of the actor stands on `at`, full HP, exhausted
  until the next turn. The Summoner and the helper have each **channelled
  it** this turn (their primary actions are spent; section 6.2).
- **No limit:** a Summoner may summon every turn it has a helper and the
  Favour.

### 6.2 Channel

**"A cultist channels a daemon within 3 tiles. At the start of your turn
each daemon needs as many unbroken strands as its Control, or it is
Unbound."**

- **Command** `CHANNEL { unitId, daemonUnitId }`, a primary action of a
  robed cultist that may follow its Move. The daemon is an own bound
  daemon, or an Unbound one (section 6.5), within Chebyshev distance **3**
  of the cultist. The cultist holds a **strand** to it until the next
  check. One strand per cultist per turn; a daemon may hold any number.
- **Control:** a Horror needs **1** strand, the Herald **3**.
- **Broken strand.** A strand breaks the moment its cultist is
  **disrupted**, the one rule this faction uses for the channel and for
  rituals:

  > **Disrupted:** it loses Hit Points (any source: an attack, a
  > retaliation, a splash, a blast, a bomb, an eruption, Plague, a crush,
  > a trample, a Star-fall, Black Ice), **or** it is moved by anything but
  > its own Move (Push, Charge!, Knockback, a Tractor Beam, Bounce,
  > Switcheroo, a gate shove), **or** it is Frozen, Splatted, or given any
  > other no-action status, **or** it leaves the board, changes owner, is
  > swallowed, burrows, or embarks.

  **Ward** (the Idol Bearer, [section 8.1](#81-ward-the-idol-bearer)) is
  the one exception: a cultist on one of the eight tiles around an own
  Idol Bearer **when it loses HP** keeps its strand. Every other cause
  still breaks it.

- **The check** runs at the Cult seat's Start Turn, after Plague and its
  chains and before rituals complete, Eggs, Windmill healing, and income
  ([section 13.3](#133-start-turn-order)). For each bound daemon, in unit-ID
  order: its **holding strands** are the strands of the last turn whose
  cultist is unbroken, still on the board as the seat's own, and within 3
  tiles of the daemon now. With holding strands **at least its Control**,
  it stays bound. Otherwise it is **Unbound** at once (section 6.4). Then
  every strand is cleared; the seat must channel again this turn.
- **A fresh daemon** is checked at the first Start Turn after it appears,
  with the strands of its summoning.
- **What the owner sees at End Turn:** each bound daemon shows "2 / 3" (the
  strands it has against its Control). End Turn with a daemon short of its
  Control asks once: "The Herald will be Unbound. End turn?" That is a
  confirmation, not a protection: nothing stops the choice (rule 4).

### 6.3 Why it is a real decision

- **Upkeep is a turn of every channeller.** A Herald costs three cultists'
  actions every turn, four or five for insurance. A Horror costs one.
- **Range 3 is the leash.** The Herald has Move 2 and most cultists Move 1,
  so a Herald that runs ahead loses its channellers; one that waits keeps
  them. The player chooses each turn between reach and safety.
- **Who stands nearest.** Channellers within 3 of a daemon are usually its
  nearest units if it breaks. A player who keeps the daemon between the
  channellers and the enemy line makes a break hurt the enemy first; one
  who lets the enemy into the back row makes it hurt the Cult.
- **The opponent's plan is simple and always available:** break enough
  strands that fewer than Control remain. One Marksman shot breaks a
  strand. Against a Herald with exactly three channellers, one hit is
  enough.

### 6.4 Unbound

**"An Unbound daemon belongs to nobody. It attacks the nearest unit,
friend or foe, at once and after every round."**

- **Result of a failed check:** the daemon's owner becomes the neutral
  owner (`NEUTRAL_OWNER_ID_V7`); it keeps its kind, role, and HP. It
  **rampages at once**, inside the Cult seat's Start Turn, then in every
  neutral turn after every round ([section 2.7 of the current rules](RULESET_7_CURRENT.md#27-map-curiosities)),
  for as long as it lives. It never fades (rule 4). Event
  `DAEMON_UNBOUND { unitId, summonerPlayerId, strands, control }`.
- **The rampage rule** (one rule for every Unbound daemon):
  1. Its **target** is the nearest unit on the board by Chebyshev
     distance, of any side, except other wild things, burrowed units, and
     afloat units. Ties go to a unit of the seat that summoned it, then to
     the fewest HP, then to the lowest unit ID.
  2. It moves toward the target by its ordinary Move (shortest path, ties
     in `(y, x)` order) and attacks it if it ends next to it: an ordinary
     attack with retaliation. A Herald then makes its second attack on the
     nearest unit next to it by the same tie rule.
  3. It never advances, captures, ends a move on a settlement center, or
     takes a chest or curiosity. It attacks units on a center from beside
     it. A daemon Unbound while on a center besieges nothing from that
     moment (a neutral unit never besieges) and steps off at its first
     move.
- **Public:** the board marks the unit each Unbound daemon will go for as
  the board stands now (the eye mark the Giant Spider's likely target has
  today), and every bound daemon short of its Control shows the same mark
  for "if it broke now". Nothing is random.
- **Kills:** an Unbound daemon's kills are credited to nobody, like the
  Spider's. Killing one is an ordinary kill of a hostile unit for whoever
  does it (the Score counts its value; no bounty Coins).

### 6.5 Bind again

**"Channel an Unbound daemon with enough cultists in one turn and it is
yours again."**

- `CHANNEL` may target an Unbound daemon within 3. When, during one Cult
  turn, the strands on it reach its Control, it is **bound** to the Cult
  at once (owner the seat, exhausted until the next turn), and those
  strands count for the next check. Event `DAEMON_BOUND`.
- So a Herald that broke can be taken back by three cultists who walk to
  within 3 of it, if they live that long. A player may also let a daemon
  go on purpose, by not channelling it, to Unbind it inside an enemy army.

## 7. Rituals

### 7.1 Taking part

**"A leader and the cultists next to it chant. Everyone sees the
countdown. Disrupt the circle and nothing happens."**

- **Participants.** A ritual has a **leader**, named by the ritual, and
  **chanters**: the leader's own robed cultists on the eight tiles around
  it that have not used a primary action when it begins. Every such unit
  joins; a player who wants one left out uses it first. Beginning spends
  the leader's and every chanter's primary action.
- **Countdown.** A ritual completes at the start of the Cult's next turn,
  after the channel check. The enemy has exactly one turn to answer.
- **Breaking.** A participant who is **disrupted** (the rule of
  [section 6.2](#62-channel); Ward does not apply to rituals) leaves the
  ritual. If the leader leaves, or fewer chanters remain than the ritual
  needs, it **fizzles** at once: the ring goes dark, nothing is refunded.
- **Public:** a chalk ring under the leader, a candle at each chanter, the
  ritual's icon, the countdown, and Star-fall's or the Herald's marked
  tile, on every tile the viewer has explored.

### 7.2 The rites

| Rite                    | Technology                           | Leader                         | Cultists needed            | Price     | Pay-off                                                                                           |
| ----------------------- | ------------------------------------ | ------------------------------ | -------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| **Summon a Horror**     | Administration                       | a Summoner                     | 1 helper; instant          | 5 Favour  | A Horror next to the Summoner; both channel it ([section 6.1](#61-summon-a-horror))               |
| **Star-fall**           | Sawmilling (Stargazers)              | a Stargazer that has not moved | 1 chanter or more; 1 turn  | none      | **5 + 1 for each chanter** to every unit on a marked tile and the eight around it, friend and foe |
| **The Great Summoning** | Explosives (**The Stars Are Right**) | a Summoner                     | 3 chanters or more; 1 turn | 20 Favour | **The Herald** appears on the marked tile; the leader and the chanters channel it                 |

### 7.3 The Great Summoning and the Herald

- **Begin:** `BEGIN_RITUAL { kind: "GREAT_SUMMONING", unitId, at }`: the
  leader is a Summoner with at least three chanters; `at` is a land tile
  next to the leader that a Herald could stand on (it may hold a unit);
  20 Favour is paid now. The tile is marked for everyone.
- **Complete** (the next Cult Start Turn, the leader and three or more
  chanters still in it): whatever unit stands on `at`, of any side, is
  **consumed** (`UNIT_DIED` cause `CONSUMED`; an enemy is credited to the
  leader and gives Favour as a Seizure would, with no living or HP test; an
  own unit gives Favour as a Sacrifice; a reward giant or a two-slot unit
  is consumed too). The Herald stands on `at`, exhausted for this turn.
  The leader and every remaining chanter **channel it** at once, which
  spends their whole turn (no Move, no action), so its first check needs
  three of those strands unbroken.
- **The enemy's two windows:** the turn after the ritual begins (break the
  circle: disrupt the leader, or enough chanters to leave fewer than
  three) and the turn after the Herald arrives (leave it fewer than three
  unbroken strands).

### 7.4 Star-fall

- **Begin:** `BEGIN_RITUAL { kind: "STARFALL", unitId, at }`: the leader is
  a Stargazer that has not moved this turn; `at` is a tile 2 to 4 tiles
  away (Chebyshev) that its owner has explored; at least one chanter.
- **Complete:** every unit on the board on `at` and the eight tiles around
  it, of any side and form (the Herald, the Thing, and ships included; a
  burrowed unit is not on the board), takes **5 + 1 for each chanter still
  in the ritual**, as fixed damage: no Defense, fortification, or cover;
  Armoured, Plated, and a Shield apply as for every fixed hit. Every Field
  Defense and **Barricade** in the area is destroyed. No retaliation.
  Kills are credited to the Stargazer (Promotion, Score). Cause
  `STARFALL`. A Stargazer that still has not moved may begin again at
  once.
- **No cap on chanters** beyond the eight tiles around the Stargazer: a
  Stargazer ringed by eight cultists drops a 13.

## 8. The faction's other unique rules

### 8.1 Ward (the Idol Bearer)

**"Cultists beside the Idol Bearer keep their strand when they are hurt."**
Passive, yes-or-no, never stacking, drawn as a chalk ring. It protects the
upkeep, not the Cult: a warded channeller that is killed, pushed, frozen,
or taken still breaks. The
[design principles](PULP_WARS_TECH_TREE_DESIGN_PRINCIPLES.md#8-active-support-actions-not-passive-auras)
discourage passive auras; this one is proposed because it matters only to
the Channel and reads at a glance.

### 8.2 Martyr (the Chosen)

**"When a Chosen dies, the Ancient Ones pay 6 Favour."** Any death but a
Sacrifice (which pays its value anyway): in battle, by Plague, by a blast,
or to its own Unbound daemon.

### 8.3 Daemons feed

**"Every enemy a bound daemon kills pays its value in Favour."** A kill by
a Horror or Herald of the seat (attack or retaliation) of a hostile unit
of a player or of the neutral owner; never an own or allied unit.

### 8.4 Anchor (the Thing in the Cellar)

The giant's signature, in the style of the
[giants' signatures](RULESET_7_GIANTS.md#6-final-rules): ability literal
`ANCHOR`, role mechanic `anchorStrands` 2.

**"The Thing channels a daemon within 3 as two cultists, without using
its turn. A daemon still needs one robed cultist."**

- **Command** `CHANNEL { unitId, daemonUnitId }` by the Thing is **not a
  primary action**: once per turn, before or after its Move or attack. It
  places **two** strands. They break only if the Thing is moved, Frozen,
  taken, or leaves the board (its HP loss never breaks them: it is too old
  to flinch).
- **The one-cultist rule:** a daemon whose holding strands come only from
  Things fails its check whatever their number. So the Herald needs one
  robed cultist beside a Thing, and that cultist is the target.
- A heavy, friendly-looking mass of teal tentacles and many eyes with a
  broken trapdoor round its middle like a collar. Numbers: the reward
  giant's, Defense 3.5 (as the Gingerbread Giant) because its signature
  is a support one. It deals a Juggernaut 9 and takes 9; a Juggernaut
  deals it 10 and takes 7.

## 9. Hexes and havoc

A spell is one button on one unit: arm it, pick the target on the board
with the move, attack, help, and place marks
([board targeting](../ui/BOARD_TARGETING.md)), read the result at the
target.

### 9.1 Ribbit

**"Turns an enemy within 2 into a frog until the end of its next turn. A
frog hops, has Defense 0.5 and no fortification, cannot attack or strike
back, and can be Seized."**

- **Command** `RIBBIT { unitId, targetUnitId }`, the Hexer's primary
  action (in place of an attack), on a visible hostile land-form unit
  within Chebyshev 2. Not a reward giant, a two-slot unit, an Egg, a
  neutral unit, or a daemon. The Hexer cannot Ribbit on its owner's next
  turn (`hexCooldowns`, the Mind Control cooldown pattern).
- **A frog**, until the end of its owner's next turn: Defense 0.5 flat, no
  fortification level, no cover (a Shield still absorbs); no attack,
  retaliation, capture, Kaboom, or other primary action; Move 1 whatever
  its role; it still blocks its tile and exerts its zone of control. It
  may be frogged again as soon as it ends (no immunity, as the user ruled
  for Freeze). Cured by Tend Wounded, Repair, and Frosting.
- **Distinct from Freeze** (`pulp_wars-w49.37`): a Frozen unit keeps its
  Defense and fortification and cannot move; a frog can hop away but is
  soft and Seizable.
- **Numbers.** An Initiate deals a Guard on a walled center with a Field
  Defense 2 and takes 8; after a Ribbit it deals 7 and takes nothing. A
  Hexer's own shot deals the frogged Guard 7.

### 9.2 Switcheroo

**"The Familiar and a unit within 2 swap places."** From the proposal:
Raiding gives it in place of the Charge bonus; one visible land-form unit
within Chebyshev 2, own or enemy, not a giant, a two-slot unit, an Egg, a
neutral unit, or a daemon; each unit must be able to stand where the other
stood by the rule every shove uses; the Familiar cannot do it again on its
owner's next turn. A swapped unit is moved, so a swapped channeller is
disrupted. It may put the Familiar on an enemy center, where it besieges
and may capture next turn.

### 9.3 Tentacle

**"Calls up a Tentacle on a tile within 3. It slaps the weakest unit next
to it, whoever that is, when it comes up and after every round."** From
the proposal: the Caller's primary action; a free land or water tile
within 3 of the Caller; one Tentacle per Caller at a time. It is owned by
nobody, never moves, attacks the adjacent unit with the fewest HP (ties to
the lowest ID) at once and in every neutral turn, and sinks after three
rounds. It has 8 HP, Attack 3, Defense 1; anyone may kill it. It kills a
full-HP Catapult on arrival (10 of 10) and leaves a Marksman at 2; on
water it slaps ships.

## 10. Balance against the Humans, unit by unit

The method of the faction passes: cost, HP, Attack, Defense, Move against
the Human of the same role; where the Cult unit is better, it pays in cost,
HP, or Defense. **The daemons are exempt by the variance rules:** they are
meant to be better than anything, and are paid for in Favour and upkeep.

| Role         | Human (cost/HP/Atk/Def/Move)                      | Cult (cost/HP/Atk/Def/Move)                     | Head to head (full HP, open ground)                                                                                  | Verdict                                                                                            |
| ------------ | ------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Line         | Fighter 2/12/2/2/1, Field Defense                 | Initiate 2/10/2/1.5/1                           | Initiate attacks: deals 5, takes 5. Fighter attacks: deals 5, takes 3.                                               | Weaker body, same price: pays for channelling, chanting, and being Favour.                         |
| Defender     | Guard 3/17/1.5/3 (1 against range), Field Defense | Idol Bearer 3/16/1.5/2.5                        | Marksman deals it 4 (the Guard 6). A Fighter deals it 4, takes 6 (the Guard: 4, takes 8).                            | Softer up close, sturdier at range; Ward instead of Field Defense.                                 |
| Fast         | Raider 4/12/2/1/2, Charge, Escape, ignores ZOC    | Familiar 3/8/2/1/2                              | Familiar attacks a Marksman: deals 6, takes 2. A Raider deals a Familiar 6 of 8, takes 2.                            | 1 Coin cheaper, 4 HP frailer, loses Charge, Escape, and ZOC freedom for Switcheroo.                |
| Ranged       | Marksman 4/12/2/1/1, range 1–2                    | Hexer 4/9/2/1/1, range 1–2                      | Hexer shoots a Fighter: 5 (a Marksman: 5). A Knight kills a Hexer (9 of 9).                                          | Same shot, 3 HP less: pays for Ribbit every second turn.                                           |
| Support      | Captain 5/10/1/1/1, Rally, Tend                   | Summoner 5/10/1/1/1                             | Equal bodies. A Marksman deals either 6; a Knight kills either.                                                      | Parity of body; Sacrifice, Seize, and Summon instead of Rally and Tend.                            |
| Siege        | Catapult 8/10/3/0.5/1, range 2–3                  | Stargazer 8/10/—/0.5/1, Star-fall 2–4           | A Catapult deals a Fighter on a walled center 8 now; Star-fall with 2 chanters deals 7 next turn, to all nine tiles. | No direct shot; trades certainty for area, Wall-ignoring, and three units' actions.                |
| Breakthrough | Knight 9/13/4/1/3, Overrun                        | Caller 8/12/2.5/1/2, Tentacle                   | Caller attacks a Marksman: 8, takes 1 (a Knight kills it). A Knight kills a Caller (12 of 12).                       | Much weaker in its own fight, 1 Coin cheaper; its Tentacle does the backline killing from 3 tiles. |
| Heavy line   | Champion 6/15/3.5/2.5/1                           | Chosen 6/15/3.5/2/1, Martyr                     | Chosen attacks a Champion: 9, takes 5. Champion attacks a Chosen: 10, takes 3.                                       | Defense −0.5 pays for 6 Favour on death.                                                           |
| Reward giant | Juggernaut 40/4/4, Crushing Shove                 | Thing in the Cellar 40/4/3.5, Anchor            | Thing attacks Juggernaut: 9, takes 9. Juggernaut attacks Thing: 10, takes 7.                                         | Defense −0.5 pays for Anchor.                                                                      |
| (none)       | —                                                 | Horror 5 Favour + 1 strand/turn, 18/4/2/2       | Horror kills a Knight (13 of 13); a Knight deals it 12, takes 3.                                                     | Better than a Knight for about 5 Coins of Initiates, plus one cultist's turn every turn.           |
| (none)       | —                                                 | Herald 20 Favour + 3 strands/turn, 60/7/4/2, ×2 | Kills any non-giant Human unit per attack; kills a Juggernaut in one turn.                                           | Deliberately above everything (variance rule 1).                                                   |

**The whole army.** Without daemons the Cult is a slightly weaker Human
army with tricks (frogs, swaps, stars). It must convert units into Favour
and Favour into daemons to win, and every daemon ties cultists to the
channel. The two failure checks of every faction:

- **One unit that makes the rest pointless?** The Herald, deliberately, but
  it makes the robed units **more** necessary: three to five of them must
  channel it every turn, and a Summoner and three chanters must make it.
  The Horror is the everyday version and needs one channeller.
- **Always wins or never wins?** Neither, by construction: the Cult that
  protects its channellers wins hard, the Cult that cannot loses hard, and
  which one happens is decided on the board each turn. The AI risk is
  covered in [section 15](#15-normal-ai).

## 11. Technology tree

The shared graph, tiers, prerequisites, prices, free opener, Dry Land
rule, and every shared unlock, with these Cult differences (display names
in the pattern of section 6.2 of the current rules; IDs unchanged):

| ID               | Cult name               | Cult unlocks (differences in bold)                                         | Why a Cult player buys it                               |
| ---------------- | ----------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| `FARMING`        | **Harvest Rites**       | Farm; **Offering**                                                         | Favour without Coins                                    |
| `MILLING`        | Milling                 | Windmill (it never heals a daemon)                                         | The only healing for frail cultists                     |
| `ADMINISTRATION` | Leadership              | **Summoner (Sacrifice, Seize, Summon Horror)**; Market; Disband            | The faction's heart; the second technology              |
| `SAWMILLING`     | **Stargazers**          | Sawmill; **Stargazer (Star-fall)**                                         | The crowd and fortification answer                      |
| `MARKSMANSHIP`   | **Hexers**              | **Hexer (Ribbit)**                                                         | The long-range answer and the Seizure combo             |
| `FIELDCRAFT`     | Pathfinding             | Replant Forest; Familiars and Hexers ignore Forest stops; Hexer Sight 2    | As for everyone                                         |
| `SCOUTING`       | **Familiars**           | **Familiar**; Familiar Sight 2                                             | Villages and Switcheroo                                 |
| `RAIDING`        | Raiding                 | Pillage; **Switcheroo** (no Charge bonus)                                  | Lifts a defender off its center                         |
| `CHIVALRY`       | **Callers**             | **Caller (Tentacle)**; Cultivate Forest; no Overrun                        | The backline killer                                     |
| `METALLURGY`     | **the Chosen**          | Forge; Arms Industry (−1 Coin training; never Favour); **Chosen (Martyr)** | The heavy body that pays when it dies                   |
| `FORTIFICATION`  | **Warding Circles**     | **Idol Bearer (Ward)**; no Field Defense                                   | A channel that survives chip damage                     |
| `EXPLOSIVES`     | **The Stars Are Right** | Blast Mountain; Breach; **the Great Summoning (the Herald)**               | The capstone, behind the node that protects its channel |

Gathering, Planning, Hunting, Forestry, Roads, Commerce, Drill (Crafting),
Engineering, and the five Naval technologies read as for every seafaring
faction. Channel and Horror summoning need only the Summoner. Capabilities
(the engine reads these, never a raw technology test): `offering`,
`switcheroo`, `greatSummoning`; the unit abilities `SACRIFICE`, `SEIZE`,
`SUMMON`, `CHANNEL`, `RIBBIT`, `SWITCHEROO`, `TENTACLE`, `STARFALL`,
`WARD`, `MARTYR`, `ANCHOR`, `RAVAGE`, `UNSTOPPABLE`.

**Where the strong effects sit.** The Horror is tier 2 (Administration):
the identity works in the first 20 rounds. The Herald is tier 3 behind
Warding Circles: the tree hands the Cult its protection one step before
its monster. Star-fall and the Tentacle are tier 3.

## 12. Alternatives: the economy and the upkeep

### 12.1 The special economic mechanic

| Option                                           | How it works                                                                                                                                                                                                               | For                                                                                                                                            | Against                                                                                                                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Favour** (recommended; section 3)           | A public, uncapped pool fed by Sacrifice, Seize, Offering, bound daemons' kills, and Martyrs; spent only on summons.                                                                                                       | One number; separates earning from spending (a Sacrifice at home pays for a Herald at the front); compounds; public, so it is counterplayable. | A second purse beside Coins, which the [design principles](PULP_WARS_TECH_TREE_DESIGN_PRINCIPLES.md#13-avoid-unnecessary-new-resource-systems) discourage; the user asked for one. |
| **B. Blood Altars** (Coins only)                 | A Cult building, the Altar, on any own territory tile: +2 Coins whenever a unit of any side dies within 2 tiles of it; a Sacrifice on an Altar pays the victim's value in Coins; summons cost Coins (Horror 6, Herald 24). | No new resource; positional (the enemy can pillage or capture an Altar); battles near home pay.                                                | Summons compete with every other Coin use; Coins already pile up; deaths far from Altars pay nothing, so the Cult turtles near them, the play the Human tuning removed.            |
| **C. The Doom Track** (a threshold, never spent) | A public counter that only rises (Sacrifice, Seize, bound kills add the victim's value). Summons are free but need Doom 5 (Horror) or 25 (Herald); Doom is never spent.                                                    | The most extreme snowball: past 25, Heralds are limited only by rituals and channellers, which is exactly the user's "balanced by upkeep".     | No economic decision after the threshold (it is a technology in disguise); the opponent cannot drain it; early game it does nothing.                                               |

**Recommendation: A, Favour.** It is the only one with a decision every
turn (sacrifice now or keep the unit; Offering or a new Initiate), it ties
sacrifice to summoning directly, and it is as swingy as the user wants
without being a one-way switch. C is the bolder fallback if hand play
finds Favour too slow.

### 12.2 Control upkeep

| Option                                           | How it works                                                                                                                                                                          | For                                                                                                                           | Against                                                                                                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Active Channel** (recommended; section 6.2) | Each turn Control cultists spend their action to channel; at the Cult's Start Turn the unbroken strands within 3 are counted; any HP loss, shove, Freeze, or capture breaks a strand. | The user's own example; a real upkeep (actions); every faction can break a strand with what it has; deterministic; one check. | Fiddly with many daemons (one action per channeller per daemon); one Marksman shot can break an under-channelled Herald.                                        |
| **2. Presence** (passive)                        | A daemon stays bound while at least Control own cultists stand within 2 of it at the Cult's Start Turn; no action, damage irrelevant.                                                 | Simplest to play and to teach; the AI only keeps units near.                                                                  | No upkeep cost beyond standing still; counterplay must kill, not hurt, so the Herald is far harder to answer; less drama.                                       |
| **3. Control roll**                              | At each Start Turn a seeded draw breaks the daemon with a chance that grows with each missing channeller (none missing: 5%; each missing: +30%).                                      | The most "cannot always control"; spectacular failures even when played well.                                                 | Dice, not counterplay: a perfect player still loses a Herald to a roll, which the user's fairness rule (counterplay) argues against; the AI cannot plan for it. |

**Recommendation: 1, Active Channel.** It is literally "three cultists
casting control spells at it every turn", it makes the opponent's
counterplay a matter of reach, and its failure is caused by someone's play
(variance rule 7). The dial to watch in hand play is what disrupts: "any
HP loss" is harsh by intent, and Ward is the Cult's paid answer.

## 13. Interactions

### 13.1 Faction rules and work in progress

| Rule                                                             | Ruling                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Freeze** (`pulp_wars-w49.37`, in progress)                     | A Frozen cultist is disrupted (its strand and ritual place break) and cannot channel on its frozen turn. A Horror can be Frozen (no retaliation, no move); the Herald is immune. Cold Snap on a circle breaks every adjacent chanter at once. Black Ice damage or freeze on an iced channeller breaks it. Shatter can kill a Frozen Horror; never the Herald.                                                         |
| **Plague and Bitten**                                            | Plague damage at the Cult's Start Turn comes before the check and breaks every unwarded plagued channeller: the Undead's best answer. A Plagued or Bitten unit cannot be Sacrificed; a Bitten enemy can be Seized: it dies and does not rise (a Seizure is a removal). Daemons are not living: no Plague, bite, Infect, or Wail on them.                                                                              |
| **Undead Graves**                                                | A Sacrifice, Seizure, or consumption leaves no Grave; every other death of a Cult unit does. An Unbound daemon's victims leave Graves as any death.                                                                                                                                                                                                                                                                   |
| **Eggs**                                                         | An Egg is never Sacrificed, Seized, frogged, or swapped. Star-fall, Tentacles, the Herald, and a rampage hit Eggs as units. A Herald arriving on an Egg's tile consumes it.                                                                                                                                                                                                                                           |
| **Barricades** (Dwarf)                                           | Block daemons and cultists like any unit. Star-fall destroys every Barricade in its area. A bound daemon may `ATTACK_BARRICADE` (the Herald deals a fresh one 10 of 10); a rampage never attacks a Barricade and walks round it.                                                                                                                                                                                      |
| **Burrowing** (Dwarf)                                            | A burrowed unit is never a rampage target, a Star-fall victim, or a Seizure; a cultist never burrows. A surfacing eruption damages channellers (breaks strands).                                                                                                                                                                                                                                                      |
| **Sugar Rush and Candy statuses**                                | Splat and every no-action Candy status (Stuck, in the Candy redesign `pulp_wars-jdb.12`) disrupt a cultist. A Rushed Candy unit reaches a back row a turn early: the Candy answer. The Herald is immune to every Candy status; Crumbs work as for any unit.                                                                                                                                                           |
| **Mind Control and the Tractor Beam**                            | A mind-controlled channeller has changed owner: broken. A pulled channeller is moved: broken. Daemons are immune to both. A Brain may be Seized; its thrall is released.                                                                                                                                                                                                                                              |
| **Goblin Berserk**                                               | A word clash only: the Cult's failure state is **Unbound**, never "berserk", in every text.                                                                                                                                                                                                                                                                                                                           |
| **Giants' signatures**                                           | Swallow and Goblin Toss never take a daemon; Crushing Shove, Glacial Smash, and Siege Hammer hurt a daemon as damage only (the Herald is never pushed, a Horror may be). The Thing's Anchor is a channel (section 8.4).                                                                                                                                                                                               |
| **Curiosities, rounds 1 and 2** (`pulp_wars-737.14` in progress) | An Unbound daemon is a neutral unit and acts in the neutral turn with the Spider and the camps (unit-ID order); "one danger per board" is a generation rule and does not stop a daemon from breaking. A daemon never heals at a Fountain, is never Promoted at a Shrine, and never uses a gate on its own; a cultist shoved by a gate is disrupted. A Horror's Unbound rampage may target the Spider or a camp guard. |
| **Score and modes** (`pulp_wars-kaw6.2` in progress)             | Favour is not scored. A daemon's Army value (Horror 6, Herald 24) counts while the seat commands it and leaves the Army when it is Unbound (not a Loss). A Sacrifice is not a Loss and ends Flawless; a Seizure is a kill (Kills for the Cult, Losses for the victim). Unbound kills are credited to nobody. Killing a wild daemon is a kill at its value.                                                            |
| **Achievements**                                                 | Slayer counts Seizures and bound kills; Muster counts daemons as kinds while commanded.                                                                                                                                                                                                                                                                                                                               |
| **Capture** (`pulp_wars-ke95`)                                   | Every Cult land unit and every **bound** daemon captures; a daemon that captures stays homeless (fills no slot). An Unbound daemon never besieges or captures.                                                                                                                                                                                                                                                        |
| **Elimination**                                                  | An eliminated Cult seat's bound daemons become Unbound at once (they rampage in the next neutral turn); its Favour is gone.                                                                                                                                                                                                                                                                                           |

### 13.2 Counters, both ways

| Against  | The Cult's answer to their trick                                                                            | Their answer to the Cult                                                                                                |
| -------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Human    | Frog the Knight before it charges; Star-fall on Guards on Field Defense; Seize a frogged Knight for 18      | Marksmen and Catapults on channellers; a Raider ignores zones of control to the back row; an Overrun through a circle   |
| Undead   | Daemons are immune to Plague, bite, and Infect; nothing the Cult loses to a Seizure becomes a Grave         | Plague on a circle breaks every strand at the Cult's Start Turn; a Wail hits a whole circle                             |
| Goblin   | Star-fall on a clumped horde; a frog cannot Kaboom; Seize broken Goblins (cheap Favour)                     | A Kaboom or death blast beside the channellers; Berserk walks past the line                                             |
| Dinosaur | Frog a one-slot dinosaur, then Seize it; Star-fall on Eggs, which cannot walk away; Sacrifice denies growth | A T-Rex's Rampage or a Triceratops's Charge! push through the back row; two-slot dinosaurs are immune to frog and Seize |
| Martian  | Daemons cannot be mind-controlled or pulled; frog a Brain, then Seize it                                    | Mind Control or a Tractor Beam on a channeller; a Saucer reaches the back row                                           |
| Ice Folk | The Herald ignores Freeze; Star-fall ignores Snow cover                                                     | Cold Snap breaks a whole circle; Frost Bolt and Bolas break single strands                                              |
| Dwarf    | Star-fall destroys Barricades and ignores Dig In; Switcheroo lifts a dug-in Hammerer                        | A bomb from three tiles, a Knockback, or an eruption under the circle breaks strands                                    |
| Candy    | Frog a Chocolate Bunny; Seize a Rushed unit after a Crash                                                   | Splat a channeller; a Rushed Donut Racer reaches the back row                                                           |

### 13.3 Start Turn order

A Cult seat's Start Turn adds two steps to
[section 3 of the current rules](RULESET_7_CURRENT.md#3-players-turns-and-victory):
after Plague and its chains, **(a) the channel check** for each bound
daemon in unit-ID order, each Unbound one rampaging at once with its
deaths and consequences, then **(b) the rituals**, each completing or
fizzling in leader unit-ID order (Star-fall's damage, the Great Summoning's
consumption and arrival); then the existing steps from Egg hatching on.
The neutral turn runs every Unbound daemon and Tentacle after the Spider
and the camps, in unit-ID order; each Tentacle's lifetime counts down at
the end of the neutral turn. So a Cult's own Star-fall that hurts its own
channellers breaks those strands for the **next** check, not this one.

## 14. Presentation

### 14.1 Names and tone

A pulp lodge, never grim or gory, and nothing from a published mythos (no
named Old One, book, or creature) or a real religion. The user's word
"sacrifice" is used on the button; what happens on screen stays a magic
trick: a puff of green smoke and the victim's hat left spinning on the
tile (an own unit), or a tentacle from a crack in the ground that tugs the
enemy down with a comic "glurp" (a Seizure). The sign of the lodge is an
eye in a spiral.

- **Faction:** Cultists (ID `CULT`); in Help, "the Cultists of the Ancient
  Ones".
- **Units:** Initiate, Idol Bearer, Familiar, Hexer, Summoner, Stargazer,
  Caller, Chosen, Thing in the Cellar; Horror, Herald, Tentacle.
- **Words:** Favour, Sacrifice, Seize, Offering, Summon, Channel, strand,
  Control, Unbound, Bind, Ward, Martyr, Anchor, Ravage, Unstoppable,
  chant, circle, Star-fall, the Great Summoning, Ribbit, Switcheroo,
  Harvest Rites, Warding Circles, The Stars Are Right.

### 14.2 Colour, looks, sound, music

Kept from the proposal: **eldritch green `#00ff78`**, the only candidate
that passes the faction-colour test beside the eight taken colours
([the proposal's section 7.2](RULESET_7_CULT_PROPOSAL.md#72-colour), to be
checked in a capture beside the Dwarf jade and the yellow-green help mark);
fixed-colour sprites in midnight-indigo robes with one green flame accent,
summoned things in rubbery deep-sea teal; the looks of every unit
([section 7.3](RULESET_7_CULT_PROPOSAL.md#73-looks-for-the-art-brief)),
with the Herald added (a robe of night sky taller than a giant, one huge
eye, a crown of tentacles, chains of green light running to its
channellers) and the Chosen added (a burly cultist in a crimson-trimmed
hood with an oversized ceremonial cleaver and a "CHOSEN" sash); the sounds
([section 7.5](RULESET_7_CULT_PROPOSAL.md#75-sounds-worth-having)), with a
taut violin string per strand, a snap for a broken strand, and a gong and
a deep laugh for Unbound; and the 5/4 mock-sinister procession theme
([section 7.6](RULESET_7_CULT_PROPOSAL.md#76-theme-music)).

### 14.3 How it reads on the board without text

| Thing                      | Shown as                                                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Favour                     | Green candles and a number beside the Coins (own) and beside each Cult seat in the leaderboard (everyone)                                |
| A strand                   | A thin green chain from channeller to daemon, for every viewer who sees both; it snaps (red flash) when the cultist is disrupted         |
| Control                    | Pips under each daemon: lit for holding strands, hollow for missing ones ("2 / 3")                                                       |
| A daemon that would break  | The eye mark on the unit it would go for if it broke now, and a cracked collar                                                           |
| Unbound                    | No owner colour, red eyes, broken chains; the eye mark on its target                                                                     |
| Ward                       | A chalk ring round the Idol Bearer's eight tiles                                                                                         |
| A ritual                   | A chalk ring under the leader, a candle at each chanter, the icon, a countdown ring; Star-fall's and the Herald's target tiles marked    |
| Sacrifice, Seize, Offering | The help mark on legal victims (own) and the attack mark (enemy), labelled with the Favour; the city button shows "+3 Favour, −2 people" |
| A frog                     | A small frog on the unit's base with a pip for the turn left                                                                             |
| Switcheroo                 | Ghosts of the two units in each other's places before the click                                                                          |

Each has a one-sentence tooltip (the card texts above) and a Help entry.

## 15. Normal AI

The Normal AI is deterministic, reads only the public view and previews,
and has **no memory between turns**
([current rules, section 16](RULESET_7_CURRENT.md#16-normal-ai-summary);
[Normal AI](../architecture/NORMAL_AI.md)). Everything the Cult needs is on
the board: strands, Control, rituals, and Favour are public state. A new
gated module, `src/ai/v7-cult.ts`, holds the Cult rules.

### 15.1 As the Cult: the channel at a basic level

The AI runs these steps **before** its ordinary army play, in this order,
every turn:

1. **Count the upkeep.** For each own bound daemon (the Herald first, then
   Horrors by unit ID), the wanted strands are Control + 1 (Herald 4,
   Horror 2), or Control when the seat has too few robed cultists.
2. **Plan the daemon's move first.** A daemon may end its Move (and make
   its attacks) only on a tile within **4** tiles of at least its Control
   of its candidate channellers (robed cultists not yet assigned, nearest
   first); this keeps them able to step to within 3. Among such tiles it
   takes the best attack by the ordinary scoring (the Herald's two attacks
   scored together; the Herald prefers kills).
3. **Assign channellers.** The nearest unassigned robed cultists that can
   reach a tile within 3 of the daemon's new tile are assigned; each
   prefers a tile next to an own Idol Bearer, then a tile outside every
   visible enemy's threatened tiles (`queryThreatenedTilesV7`), then the
   farthest from the enemy. Each moves and channels.
4. **A daemon that cannot be held** (fewer than Control channellers can
   reach it) is **released toward the enemy**: it moves to the tile that
   puts the nearest visible enemy unit nearer to it than any own unit, and
   the assigned cultists instead move away from it. The AI never leaves
   its own units nearest to a daemon it cannot hold, when another legal
   tile exists.
5. **Bind again** an Unbound daemon only when Control robed cultists can
   all reach tiles within 3 of it this turn and none of those tiles is the
   daemon's current target.

### 15.2 As the Cult: everything else

| Mechanic                     | The AI's rule                                                                                                                                                                                                                                                                          | Honest flag                                  |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Seize                        | Always, when legal (it is a free kill at double Favour); before ordinary attacks on that unit. Hexers frog an enemy next to a Summoner and a cultist first when a Seizure would follow this turn.                                                                                      | Plays it well                                |
| Sacrifice                    | (a) An own unit that a visible enemy can kill this turn and that cannot retreat; (b) an Initiate beyond the seat's wanted channellers + 2, when Favour is within its value of 5 or 20 and the Summoner has nothing better. Never a city's last defender while an enemy is within 3.    | Plays the plain cases                        |
| Offering                     | A city at its unit limit or with nothing to train, Favour short of the next threshold, and population 2 or more above 0.                                                                                                                                                               | Simple and safe                              |
| Summon Horror                | When Favour is 5 or more, a Summoner has a robed neighbour, and the seat has a spare robed cultist for every daemon's Control + 1 after it.                                                                                                                                            | Plays it well                                |
| The Great Summoning          | Only when Favour is 20 or more, the seat has Explosives, a Summoner already has three robed neighbours that have not acted, and no visible enemy unit can reach the circle next turn. When Favour is 20 or more, idle cultists at home end their Moves next to the capital's Summoner. | Does it sometimes, slowly; accept            |
| Star-fall                    | The tile with the most enemy value on its nine tiles, preferring fortified units, siege units, and Eggs, with no own unit there; own units never end a Move under an own mark.                                                                                                         | Adequate; it cannot guess who will walk away |
| Ribbit, Switcheroo, Tentacle | The proposal's targets (frog the unit about to capture or the one own melee will attack; swap a defender off a center beside an own capturer; Tentacle beside the most enemy units and no own unit).                                                                                   | Plays the plain cases                        |
| Research                     | Administration after the free opener, then Marksmanship, Fortification (Warding Circles), Scouting, Sawmilling; Explosives once Favour has reached 12.                                                                                                                                 | Fixed order, as for the other factions       |

### 15.3 Against the Cult (every other seat)

- **Hunt the strands.** A visible channeller is a target worth the value of
  the daemon it holds divided by the strands to spare (holding strands −
  Control + 1); any hit counts, so a ranged shot on an unwarded channeller
  outranks an ordinary attack. A circle's leader and chanters are scored
  the same way.
- **Never stand nearest a daemon about to break.** A unit avoids ending a
  routine Move as the eye-marked target of an Unbound daemon or of a bound
  one short of its Control, as it avoids the Spider today.
- **Step out from under a star.** As the proposal (a unit under a visible
  Star-fall mark steps out when it can).
- **Do not fight the Herald.** Never attack a bound Herald unless the
  attack kills it; spend those units on its channellers.

## 16. Worked examples

All with the formula of section 13.2 of the current rules, full-HP units
on open ground unless stated.

### 16.1 The snowball: a bound Herald's turn

The Cult's Herald stands two tiles from a Human line: a Champion in the
open and a Guard on its walled center with a Field Defense (fortification
4). Four Initiates channelled it last turn from 3 tiles behind; two stand
beside an Idol Bearer.

1. **Start Turn:** four holding strands against Control 3: bound.
2. The Herald moves 1 and attacks the Champion: 15 of 15, dead, nothing
   back. Its second attack on the Guard ignores the 4 fortification levels:
   17 of 17, dead, the Field Defense destroyed. **Favour +9** (6 + 3).
3. Four Initiates step up and channel it again.
4. Next turn the Herald steps onto the empty center (the city is
   besieged) and kills two Fighters that come to retake it (+4); the turn
   after, it captures the city. A Cult that began this turn at 7 Favour is
   at 20 two turns later and can begin a second Great Summoning.

### 16.2 The counterplay: breaking the strands

The Human answer to 16.1, on its turn: the two unwarded channellers stand
within reach.

- A Marksman shoots channeller A from 2 tiles: 5 of 10. **Broken.**
- A Catapult shoots channeller B from 3 tiles: 9 of 10. **Broken.**
- The two warded channellers would need to be **killed**: a Knight deals
  an Initiate 10 of 10 and could, but the Human keeps it back.

**Cult Start Turn:** two holding strands against Control 3. **The Herald
is Unbound.** Its nearest units are the four Initiates within 3 (the
Human shooters stand farther from the Herald than its own back row). It rampages at once: an Initiate 10 of 10, dead;
second attack, another, dead. After the round it rampages again in the
neutral turn. The Cult now needs three robed cultists within 3 of a
monster that kills two of them a turn to bind it again, or it walks
away and lets the Herald chew through whatever is nearest. **That is the
spectacular failure, caused by two shots.**

Had the Cult kept its channellers next to the Idol Bearer (all four
warded), the Humans would have needed two kills, for example a Knight on
one Initiate (10 of 10) and a Catapult and a Marksman on another (9, then
the last 1): a much harder turn.

### 16.3 A circle broken at the last moment

A Summoner and four Initiates begin the Great Summoning beside the
capital, 20 Favour paid. A Human Knight (Move 3) reaches the Summoner:
10 of 10, dead. **The ritual fizzles; 20 Favour is gone.** Had the Knight
reached only a chanter, three chanters would remain and the Herald would
arrive; the Knight, standing next to the circle, would then be the
Herald's nearest enemy.

### 16.4 Frog and Seize: the human sacrifice combo

A Human Knight (13 HP) has charged into the Cult's line. A Hexer frogs it
from 2 tiles (Ribbit). An Initiate walks next to it (the holder; the frog
cannot strike back). The Summoner, also next to it, **Seizes** it: the
Knight dies, credited to the Summoner; **Favour +18**, nearly a Herald.
Against a Guard on a walled center, the same frog lets an Initiate deal 7
instead of 2, and a Seizure of the frogged Guard pays 6.

### 16.5 Star-fall on a dug-in line

A Stargazer and three chanters mark a tile among three Human Fighters on
Field Defenses (12 HP each). Next Cult Start Turn the star lands: each
Fighter takes **8** (5 + 3), whatever its fortification, and the three
Field Defenses are destroyed. A Catapult shot on one of them would have
dealt 8 to that one alone. If the Humans had shot the Stargazer (a Marksman
deals 7 of 10), the star would have fizzled.

### 16.6 A Horror on one strand

A Summoner and an Initiate summon a Horror (5 Favour); both channel it.
Next turn the Horror kills a Human Knight (13 of 13; Favour +9) and the
Initiate channels it alone, keeping the Summoner free to Sacrifice. A
Human Raider then hits that Initiate (5 of 10): the strand breaks, and at
the Cult's Start Turn the Horror, with no strand, is Unbound. Its nearest
unit is the wounded Initiate (5 HP left): 5 of 5, dead. Insurance would
have been one more channeller.

### 16.7 Anchor

A Thing in the Cellar and one Initiate hold a Herald (2 + 1 strands =
Control 3). The Thing also attacks every turn. The Human shoots the
Initiate (5 of 10): broken, and the Thing's two strands alone do not hold
it (the one-cultist rule). The Herald is Unbound; its nearest unit is the
Thing beside it: 21 of 40 (5 back), then its second attack, 19 of 19. The Thing is
dead, and the Herald is loose beside the Cult's line.

### 16.8 A Favour ledger (illustrative, one city to three)

| Round | What the Cult did                                                            | Favour |
| ----: | ---------------------------------------------------------------------------- | -----: |
|   1–3 | Gathering (free), Administration (7 Coins)                                   |      0 |
|   4–7 | A Summoner; three Initiates trained and Sacrificed                           |      6 |
|     8 | Summon a Horror (−5)                                                         |      1 |
|  9–12 | The Horror kills a Raider and a Fighter (+6); a frogged Marksman Seized (+8) |     15 |
| 13–15 | Two Offerings (+6); Explosives researched                                    |     21 |
|    16 | Begin the Great Summoning (−20)                                              |      1 |
|    17 | The Herald arrives                                                           |      1 |

## 17. Beads to file

After the user approves this spec, under epic `pulp_wars-mch9`, in order.
Every engine bead bumps the ruleset identity once; none runs whole-game
simulations (focused unit tests on hand-built states only).

**Engine** (profile `ai/map/persistence` where state shapes change):

1. **E1 Registration and roster.** The `CULT` faction (ninth in the frozen
   order), its nine roles and numbers, the three summoned role IDs
   (`HORROR`, `HERALD`, `TENTACLE`) appended in every registration and
   unlocked by none but the Cult, the tree and display names, the reward,
   starting, and treasure units, a ninth seat (setup, seat colours, map
   scale rows for nine players). No faction mechanic yet.
2. **E2 Favour and sacrifice.** The `favour` state and view; `SACRIFICE`,
   `SEIZE`, `OFFERING` (the city's `offeredPopulation`); cause
   `SACRIFICED`; Favour from bound kills and Martyr; previews; Score
   hooks.
3. **E3 Channel and daemons.** `SUMMON`, `CHANNEL`, strands and the
   disrupted flag set by every damage, displacement, and status path; the
   Start Turn check; Unbound (an owned unit turning neutral, generalising
   the neutral registration that `pulp_wars-737.14` is extending for the
   camps); the rampage rule in the Start Turn and the neutral turn; Bind
   again; Ward; Anchor; `previewChannelV7` and `previewRampageV7`. Depends
   on `pulp_wars-737.14`.
4. **E4 Rituals and the Herald.** The ritual frame, Star-fall (Barricade
   destruction), the Great Summoning, consumption, the Herald (Ravage,
   Unstoppable, its immunities).
5. **E5 Hexes.** Ribbit (the frog and its Seizure), Switcheroo, the
   Tentacle in the neutral turn.

**AI** (profile `ai/map/persistence`):

6. **A1 The Cult seat:** the channel steps of section 15.1, Summon, Seize,
   Sacrifice, Offering, research.
7. **A2 The Cult seat:** rituals, Star-fall, Ribbit, Switcheroo, Tentacle.
8. **A3 Every seat against the Cult:** hunt the strands, avoid the eye
   mark, step out from under a star, never fight a bound Herald.

**Art** (PixelLab scripts only; needs the user's approval of the art
direction first):

9. **ART1 Faction fragment** under
   [the faction art layer](../art/factions/README.md) from
   [its template](../art/factions/FACTION_TEMPLATE.md), the colour capture
   check, for the user's approval.
10. **ART2 Sample:** Initiate, Horror, Herald, reviewed at native and
    enlarged scale.
11. **ART3 Batches:** the other units, the Thing, the Tentacle, the frog,
    the city and buildings, portraits, the five technology icons.

**UI** (profile `ui/presentation`, browser smoke where the bead says so):

12. **U1 Favour and sacrifice:** the HUD and leaderboard candles, the
    Sacrifice, Seize, and Offering targeting and labels.
13. **U2 The channel:** strands, Control pips, the End Turn confirmation,
    the eye mark, Unbound and Bind cues, Ward rings.
14. **U3 Rituals and hexes:** rings, countdowns, the star and arrival
    marks, the frog, Switcheroo ghosts, Tentacles; Help, glossary, sounds,
    theme music.

**Balance and fold:**

15. **B1 Hand-play check against the Humans** with the text harness and a
    `LAB_CULT_MID` lab (no simulations): a fairness check only, against
    [the variance rules](#2-the-variance-rules).
16. **B2 Fold** into the current rules as section 24 (the Cultists).

## 18. Open questions for the user

Only the questions the direction does not settle; everything else is
decided above.

1. **Favour or another economy?** Recommended: Favour (section 12.1). The
   Doom Track is the bolder alternative.
2. **Active Channel, and "any HP loss breaks a strand"?** Recommended:
   yes (section 12.2). The softer reading is "only death, displacement,
   and capture break it", which makes a Herald far harder to answer.
3. **Is the Herald overpowered enough?** 60 HP, Attack 7, Defense 4, Move
   2, two attacks a turn, ignores fortification and every status: it kills
   any non-giant unit per attack and a giant per turn. Or should it also
   have an area attack?
4. **The tone of sacrifice.** The button says Sacrifice and the enemy is
   "Seized"; the show is a puff of smoke and a comic tentacle. Is that the
   right pitch, or should it be darker (or lighter, "Volunteer")?
5. **Nine players.** The ninth faction makes nine-seat matches possible.
   Allow them (recommended), or keep eight seats?

The colour (`#00ff78`) is recommended and needs only the capture check of
bead ART1.

## Appendix A. The proposal's fifteen decisions, answered

| #   | The proposal's question                         | Answer under the 2026-10-09 direction                                                                                                                                        |
| --- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Which shape?                                    | Neither the blend nor the purer shapes: **daemons on a channel**, with sacrifice and Favour as the economy and three multi-cultist rites (section 1).                        |
| 2   | A resource of its own?                          | **Yes: Favour**, the one special economic mechanic, uncapped and public (section 3; alternatives in 12.1).                                                                   |
| 3   | Can a wild thing capture or besiege?            | An Unbound daemon or a Tentacle: **no**, never stands on a center. A **bound** daemon: **yes**, like every land unit (the snowball).                                         |
| 4   | Mind Control, bites, Infect on summoned things? | **No to all.** Daemons are not living and are immune to Mind Control; the Martian and Undead answers go through the channellers.                                             |
| 5   | How many at once?                               | **No limit** (variance rule 3): Favour and channellers are the only limits. One Tentacle per Caller (the spell's shape).                                                     |
| 6   | Who may be sacrificed, and the last unit?       | **Any own unit** except daemons, Eggs, and Plagued or Bitten units, the last unit included; enemies by **Seize** (living, frogged or at 5 HP or less, held by two cultists). |
| 7   | Familiar capture after Switcheroo?              | **Yes**; every unit captures now (`pulp_wars-ke95`).                                                                                                                         |
| 8   | How easily is a controller distracted?          | **Any HP loss**, a shove, a freeze, a capture: the one disruption rule (section 6.2); Ward is the exception for HP loss.                                                     |
| 9   | Let a daemon loose on purpose?                  | **Yes**: stop channelling it; it is Unbound at your next Start Turn. The AI does it only when it cannot hold one (section 15.1).                                             |
| 10  | Is the Great Summoning's monster uncontrolled?  | **No: the Herald is bound** by three channellers; it is uncontrolled only when the upkeep fails. The Tentacle stays wild from birth.                                         |
| 11  | Rain of Fish?                                   | **Cut**: the Cult has one economic mechanic. The Offering takes its place and goes the other way.                                                                            |
| 12  | Field Defense?                                  | **No**; Fortification is Warding Circles (the Idol Bearer and Ward).                                                                                                         |
| 13  | The colour?                                     | **Eldritch green `#00ff78`**, after the capture check (bead ART1).                                                                                                           |
| 14  | The name and the words?                         | **Cultists** (`CULT`); **Sacrifice** on the button (the user's word); Unbound, not berserk (section 14.1). Open question 4 asks about the tone.                              |
| 15  | Nine players?                                   | **Allow** nine seats; bead E1 adds the nine-seat rows. Open question 5 confirms.                                                                                             |
