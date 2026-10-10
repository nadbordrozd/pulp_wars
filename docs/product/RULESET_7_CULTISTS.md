# Ruleset 7: the Cultists of the Ancient Ones (spec)

**Status:** final design spec for the ninth faction, validated on paper
(bead `pulp_wars-mch9.2`, epic `pulp_wars-mch9`, 2026-10-09; the first
draft was bead `pulp_wars-mch9.1`). Nothing here is implemented, and no
game was played or simulated to write it. It replaces
[the Cult proposal](RULESET_7_CULT_PROPOSAL.md) of 2026-10-06 (bead
`pulp_wars-2yc.25`), which stays as design history; where the two
disagree, this document is the design. It is an overlay over
[Ruleset 7: current rules](RULESET_7_CURRENT.md); every rule it does not
mention stays in force. Every number is a first guess for the contract
step to run through the engine's combat preview, except where a
[variance rule](#2-the-variance-rules) forbids a change. The user's
answers of 2026-10-09 to the first draft's questions are applied
throughout ([section 20](#20-decisions-and-open-questions)).

**What to read:** the [one-page summary](#one-page-summary), the
[variance rules](#2-the-variance-rules) (section 2), the
[wacky abilities at a glance](#44-the-wacky-abilities-at-a-glance)
(section 4.4), the [validation](#17-validation) (section 17), what it
[changed](#18-what-validation-changed) (section 18), and the
[implementation beads](#19-implementation-beads) (section 19).

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
   **Unbound**: it belongs to nobody, attacks the nearest unit, friend or
   foe, at once and after every round, and cannot be bound again until
   the Cult's next turn.
2. **Human sacrifice.** A Summoner **Sacrifices** an own unit, or
   **Seizes** a broken enemy held down by a second cultist. Cities make an
   **Offering** of their own population.
3. **Rituals that need several cultists.** Summoning a Horror takes two
   cultists; **Star-fall** takes a Stargazer and its chanters; **the Great
   Summoning** of the Herald takes a Summoner and three chanters for a
   whole enemy turn.
4. **One special economic mechanic on the shared spine: Favour.** Coins,
   villages, cities, buildings, levels, and the reward ladder are
   unchanged. Sacrifices, Seizures, Offerings, Martyrs, and the kills of
   bound daemons give **Favour**, a public, uncapped pool that pays for
   every summoning.
5. **Bold and high variance, by rule.** The Herald is far above every
   unit in the game (60 HP, Attack 7, two attacks a turn, ignores
   fortification, no area attack). Nothing caps Favour, the number of
   daemons, or the damage of a failure. The only fairness rule is that the
   counterplay is always on the board: **kill or disrupt the
   channellers**. Any Hit Point a channeller loses, and any freeze or
   other status an enemy puts on it, breaks its hold.

**The roster, each with a wacky trick:** Initiate (line; **Pamphlets**),
Idol Bearer (defender; **Behold!**), Familiar (fast; **Switcheroo**),
Hexer (ranged; **Ribbit**), Summoner (support; **Sacrifice, Seize,
Summon**), Stargazer (siege; **Star-fall**), Caller (breakthrough;
**Tentacle**), the Chosen (heavy line; **Pick Me!** and Martyr), and the
reward giant, the Thing in the Cellar (**Anchor**). Summoned, never
trained: the Horror (**Boo!**), the Herald (**Proclaim**), and the wild
Tentacle (**Grab**).

**Who beats it:** anything that reaches the channellers: Marksmen,
Catapults, Raiders, Knights riding through a circle, bombs, Plague, Wail,
Freeze, Whirl, Thump, pulls, and pushes; or an army that goes round the
Herald and takes the Cult's cities. **What it beats:** everything, for as
long as the channel holds. **The swing:** a Cult that keeps its Herald
bound rolls an opponent over in a few turns; a Cult whose channellers are
shot watches its Herald eat its own army for a whole round.

**Review axes at a glance:**

| Axis                  | The Cult's answer                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Crowd control         | Star-fall (a 3 × 3 explosion of 5 + 1 per chanter); Boo! scatters a crowd; Tentacles grab and slap whoever is weakest; the Herald's two attacks    |
| Fortifications        | Star-fall ignores Walls, Field Defense, and Dig In and destroys Field Defense and Barricades; the Herald ignores them; Proclaim stops a retraining |
| Long-range attackers  | Ribbit frogs a Catapult or Marksman at range 2; a Tentacle rises next to it within 3 of a Move-2 Caller; Switcheroo pulls it into the circle       |
| Unique abilities      | Channel and Unbound; Favour; Sacrifice, Seize, Offering; rituals; one wacky trick on every unit and summon (section 4.4)                           |
| Balance against Human | Unit for unit the cultists are a little weaker and cheaper; the daemons are deliberately far stronger, paid in Favour and upkeep (section 10)      |
| Thematic fit          | Every name and effect is lodge-and-tentacle pulp: hoods, pamphlets, candles, chanting circles, a star chart, a herald from the stars               |

## The brief

The user's direction, from the comments on `pulp_wars-mch9.1` and the
epic `pulp_wars-mch9` (authoritative):

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
  rules so later balance passes do not tune the variance away.
- **2026-10-09, economy:** keep the shared economy spine (Coins, villages,
  cities, buildings, city levels, the reward ladder) and add **one** special
  Cult economic mechanic.
- **2026-10-09, answers to the first draft:** Favour, yes; any HP loss, or
  being Frozen and the like, breaks a strand; no area attack for the
  Herald; "Sacrifice" and "Seize" are fine; nine-player games are allowed;
  **wacky abilities on every unit, summons included**; before
  implementing, think hard and validate the design conceptually and
  qualitatively, not by playing: early and late game means, not wiped
  out by the first enemy Fighter, can take cities, no cheese that makes
  them unbeatable even by overwhelming forces, every tech branch useful,
  realistic means of winning and a real chance of losing (perfect balance
  is not required); a sensible baseline Normal AI from judgement and the
  lessons of the other factions, not tuned by simulation; implement after
  all other queued work; the root makes all the decisions.

The standing memories `cultist-faction-user-2026-10-09-high-variance` and
`cultists-user-2026-10-09-favour-any-hp` repeat these rules for every
later session.

### What changed from the proposal

| The proposal (2026-10-06)                                     | This spec                                                                                               | Why                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| One Summoner holds one Horror on a three-tile leash           | **Channel:** a daemon needs as many channelling cultists every turn as its Control (Horror 1, Herald 3) | The user's own example of upkeep          |
| Hurt Summoner: Unruly for a turn; dead Summoner: Loose        | One rule: a channeller that loses HP, is moved, gets an enemy status, or is taken is disrupted          | One rule to learn, every faction can hit  |
| A Loose Horror fades after four rampages                      | An Unbound daemon never fades; it is killed or bound again, never in the turn it broke                  | No pity timers                            |
| The Visitor: an uncontrolled monster from the Great Summoning | **The Herald:** the truly overpowered greater daemon, bound by three channellers                        | "Truly overpowered", "held by upkeep"     |
| Volunteer, own Initiates only, "never for value"              | **Sacrifice** any own unit, **Seize** broken enemies, **Offering** of population; all give Favour       | Sacrifice is central                      |
| No resource of its own; Favour only as a fallback             | **Favour** is the faction's one economic mechanic, uncapped and public                                  | The user asked for one                    |
| Rain of Fish (+2 population, once a level)                    | Cut; the Offering goes the other way (population into Favour)                                           | Only one economic mechanic                |
| Snack Time heals a Horror                                     | Cut: no daemon ever heals; the Horror's trick is **Boo!**                                               | Daemons are spent, not kept               |
| Ribbit: a frog keeps its Defense                              | A frog has Defense 0.5 and no fortification, and may be Seized once at half HP                          | Distinct from the Ice Folk Freeze         |
| Ward: wild things ignore the Idol Bearer's neighbours         | **Behold!**: an action; its neighbours keep their strand when hurt, until the Idol Bearer is disrupted  | Protects the upkeep, not from the failure |
| Warding Chalk (chanters fortified)                            | Warding Circles: the Idol Bearer and Behold!                                                            | Behold! carries it                        |
| Thing in the Cellar: Push; breaks loose if its city falls     | Thing in the Cellar: **Anchor**, grips one channeller beside it, whose strand counts three              | A giant signature, tied to the faction    |
| "Sacrifice" appears nowhere the player reads                  | The button says **Sacrifice**; the show stays bloodless                                                 | The user's word                           |

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

| Faction  | Its signature                                      | Why the Cult is not that                                                                                                                                                                               |
| -------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Human    | Sustain, Field Defense, Overrun                    | No healer, no Field Defense, no Overrun. Its daemons never heal.                                                                                                                                       |
| Undead   | Turns the dead into its units (Graves, Infect)     | **Overlap: death becomes power.** The Undead get a unit from a corpse; the Cult gets a number (Favour) from a living victim it kills on purpose. Nothing the Cult summons comes from a death.          |
| Goblin   | Kaboom, death blasts, Berserk, Plunder             | **Overlap: kills pay.** Plunder pays Coins for any kill; Favour comes only from a bound daemon's kill or a Seizure, and buys only daemons. The word "berserk" is the Goblins' (the Cult says Unbound). |
| Dinosaur | Eggs and growth                                    | A summon is instant or one turn, made of live participants, and is never a unit that grows.                                                                                                            |
| Martian  | Mind Control takes your unit while the Brain lives | **Overlap: control.** The Brain controls an **enemy** and loses it back to its owner; the Cult controls its **own** daemon and loses it to nobody. The Cult never takes an enemy unit.                 |
| Ice Folk | Freeze, Shatter, Snow                              | **Overlap: a disabled enemy.** A Frozen unit keeps its Defense and cannot move; a frog can hop but has Defense 0.5 and no fortification. One unit, every second turn.                                  |
| Dwarf    | Reliable machines, repair, tunnels, Barricades     | Cult power is unreliable by design and cannot be repaired. Star-fall destroys Barricades.                                                                                                              |
| Candy    | Sugar Rush and the Crash; Crumbs; Splat            | Nothing of the Cult is re-made; no burst of speed.                                                                                                                                                     |

**The Undead and the Martians, spelled out:**

- **Undead: attrition and raising the dead.** The Undead win slowly: every
  death near them, either side's, becomes an Undead unit (a Grave, Raise
  Dead, Infect, a Bitten rising), and Plague grinds. The Cult does not
  convert, raise, or grind. Its deaths are **chosen and immediate** (a
  Sacrifice, a Seizure) and their product is Favour, which becomes a
  daemon only through a ritual. A Sacrifice or Seizure is a removal and
  leaves no Grave ([section 13](#13-interactions)), so the two factions
  never feed each other's mechanic by accident. Only living units can be
  Seized, so Undead units are never Cult victims.
- **Martians: mind control.** Mind Control is a weapon against the enemy's
  units; the Channel is an upkeep on the Cult's own. When a Brain dies its
  thrall goes home; when a channel fails the daemon goes nowhere and bites
  the nearest unit. Summoned daemons are immune to Mind Control, and a
  Brain that takes a channeller breaks its strand, which is the Martians'
  best answer to a Herald.

## 2. The variance rules

These are **design rules of the faction**, binding on every later
balance, tuning, and AI pass (the user, 2026-10-09; memory
`cultist-faction-user-2026-10-09-high-variance`). A balance bead that
wants to break one asks the user first.

1. **The Herald is truly overpowered.** No other unit, giants included,
   comes near it in a straight fight. Its HP, Attack, Defense, Move, two
   attacks, and fortification-ignoring are never lowered to bring it
   nearer to a giant. (It has no area attack, by the user's decision.)
2. **Control is the price.** The daemons are paid for by Favour and by the
   channel upkeep, never by stat dampeners. The Control numbers (Horror 1,
   Herald 3) may be raised only by the user.
3. **No caps.** No cap on Favour, on Favour per turn, on daemons per seat,
   on summons per turn, or on the Favour of one Seizure. (A Caller's one
   Tentacle at a time, a Thing's one grip, and a Hexer's cooldown are the
   shape of a spell, not caps on the economy.)
4. **No failure protection.** A broken ritual refunds nothing. An Unbound
   daemon never fades, never weakens, and never spares the seat that
   summoned it (it prefers it on a tie). There is no "banish" button, no
   pity timer, and no warning period beyond what the board already shows.
5. **No catch-up.** Favour compounds: kills by bound daemons pay Favour,
   which buys more daemons. Nothing slows a Cult that is winning or helps
   one that is losing.
6. **Fairness is counterplay only.** Every bind and every ritual has a
   public weak point any faction can reach: the channellers and chanters,
   shown on the board to every player who has explored their tiles. A
   later pass may change a number **only to restore counterplay that was
   shown to be missing**, never to make a swing smaller. Every fix of the
   [validation](#17-validation) is of that kind or makes a failure worse.
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

| Source                    | Rule                                                                                                                                        | Favour                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **Sacrifice**             | A Summoner removes an own unit next to it ([section 5.1](#51-sacrifice))                                                                    | the unit's value           |
| **Seize**                 | A Summoner removes a broken living enemy next to it, held by a second cultist ([section 5.2](#52-seize))                                    | **twice** the unit's value |
| **Offering**              | A Cult city with 2 population or more gives up 2, as its city action ([section 5.3](#53-offering))                                          | 3                          |
| **A bound daemon's kill** | A Horror or Herald of the seat kills a hostile unit that is not a daemon or a Tentacle ([section 8.3](#83-daemons-feed))                    | the victim's value         |
| **Martyr**                | A Chosen of the seat dies, except by a Sacrifice, a consumption, or a wild unit's attack ([section 8.2](#82-pick-me-and-martyr-the-chosen)) | 6 (its value)              |
| **Consumed**              | A legal victim on the Herald's arrival tile is eaten ([section 7.3](#73-the-great-summoning-and-the-herald))                                | as a Sacrifice or Seizure  |

**Value** is the [Score](RULESET_7_SCORE_AND_STARS.md#32-exact-definitions)
unit value: the printed cost of the unit's role under its kind (an
Initiate 2, a Knight 9, a Battleship 16, an Egg its role's cost), 12 for a
reward giant, a neutral unit its bounty (the Spider 10, Bigfoot 12). A
summoned daemon has the values of [section 4.2](#42-summoned-units).
Free units (Militia, Scouts, risings, treasure units) are worth their
role, like everywhere else. Arms Industry lowers a price, not a value.

**How it sits with the shared spine.**

- **Coins** still buy every trained unit, building, technology, and Land
  Grant at the shared prices. An Initiate is the Cult's way of turning
  Coins into Favour: 2 Coins and a city action become 2 Favour. A Seizure
  is the way of turning the enemy's Coins into Favour, at double.
- **Villages and cities** are unchanged; capturing works as for everyone
  (and faster for an Initiate, [section 8.7](#87-pamphlets-the-initiate)).
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
by hand with the formula of
[section 13.2 of the current rules](RULESET_7_CURRENT.md#132-damage) and
must be re-run by the contract step through the engine's combat preview.

**Robed cultists** are the Cult's trained land units except the Familiar
(an animal) and its ships: Initiate, Idol Bearer, Hexer, Summoner,
Stargazer, Caller, and Chosen. Only a robed cultist channels, chants, or
holds down a Seizure; the Thing in the Cellar grips a channeller by its
own rule.

### 4.1 Trained units

| Unit                    | Role         | Technology                      | Cost |  HP | Attack | Defense | Move | Range | Captures | Its own thing                                                                                              |
| ----------------------- | ------------ | ------------------------------- | ---: | --: | -----: | ------: | ---: | ----: | -------- | ---------------------------------------------------------------------------------------------------------- |
| **Initiate**            | `FIGHTER`    | start                           |    2 |  10 |      2 |     1.5 |    1 |     1 | yes      | **Pamphlets** (captures a neutral village the turn it arrives). Channels, chants, holds. No Field Defense. |
| **Idol Bearer**         | `GUARD`      | Fortification (Warding Circles) |    3 |  16 |    1.5 |     2.5 |    1 |     1 | yes      | **Behold!** (its neighbours keep their strands when hurt). Cannot attack after moving. Channels.           |
| **Familiar**            | `RAIDER`     | Scouting (Familiars)            |    3 |   8 |      2 |       1 |    2 |     1 | yes      | **Switcheroo**. Sight 2. Charge with Raiding. No Escape, does not ignore zones of control. Never channels. |
| **Hexer**               | `MARKSMAN`   | Marksmanship (Hexers)           |    4 |   9 |      2 |       1 |    1 |   1–2 | yes      | **Ribbit** every second turn. Never advances. Channels.                                                    |
| **Summoner**            | `CAPTAIN`    | Administration                  |    5 |  10 |      1 |       1 |    1 |     1 | yes      | **Sacrifice, Seize, Summon Horror**; leads the Great Summoning. No Rally, no Tend Wounded. Channels.       |
| **Stargazer**           | `CATAPULT`   | Sawmilling (Stargazers)         |    8 |  10 |      — |     0.5 |    1 |     — | yes      | No attack of its own. Leads **Star-fall** at 2 to 4 tiles. Channels.                                       |
| **Caller**              | `KNIGHT`     | Chivalry (Callers)              |    8 |  12 |    2.5 |       1 |    2 |     1 | yes      | **Tentacle** within 3 tiles. No Overrun. Channels.                                                         |
| **Chosen**              | `SWORDSMAN`  | Metallurgy (the Chosen)         |    6 |  15 |    3.5 |       2 |    1 |     1 | yes      | **Pick Me!** (adjacent enemies may attack only it); **Martyr** (its death pays 6 Favour). Channels.        |
| **Thing in the Cellar** | `JUGGERNAUT` | reward only                     |    — |  40 |      4 |     3.5 |    1 |     1 | yes      | **Anchor** (its signature, [section 8.4](#84-anchor-the-thing-in-the-cellar)).                             |
| Patrol Boat and others  | the ships    | Naval branch                    |    — |   — |      — |       — |    — |     — | no       | The shared ships, drawn in the Cult's style (a black gondola with a lantern).                              |

Every land unit captures (`pulp_wars-ke95`), the Stargazer and the Thing
included. The Familiar is the only robed-less trained land unit.

### 4.2 Summoned units

Never trained, hired, found, or rewarded. None is living (no Plague,
Bitten, Infect, Wail, Seizure, or Boo!), none heals by any source (Windmill,
Recover, Fountain, Wishing Well, Promotion), none is promoted or
disbanded, none embarks, none has a home city or fills a unit slot (the
Undead rising precedent), and none is a Mind Control, Swallow, Tractor
Beam, or Switcheroo target. A daemon moves like a Martian walker: no
Forest, Mountain, or deep-snow stop, Mountain allowed without
Engineering, never water.

| Unit         | From                | Price                            | Control |  HP | Attack | Defense | Move | Value | Rules                                                                                                                                              |
| ------------ | ------------------- | -------------------------------- | ------: | --: | -----: | ------: | ---: | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Horror**   | Summon Horror       | 5 Favour; two cultists           |       1 |  18 |      4 |       2 |    2 |     6 | **Boo!** ([section 8.5](#85-boo-the-horror)). Captures while bound. Can be pushed, knocked back, Stuck, and Frozen while bound.                    |
| **Herald**   | the Great Summoning | 20 Favour; four cultists, a turn |       3 |  60 |      7 |       4 |    2 |    24 | **Ravage** (two attacks a turn), **Unstoppable** (ignores fortification; immune to every status and shove), **Proclaim**. Captures while bound.    |
| **Tentacle** | a Caller's Tentacle | the Caller's action              |       — |   8 |      3 |       1 |    0 |     0 | Wild from birth: owned by nobody, slaps the weakest unit next to it and **Grabs** it ([section 9.3](#93-tentacle-and-grab)). Sinks after 3 rounds. |

**Horror.** A rubbery, round, many-armed thing with googly eyes and a
spiked collar. In a fight it is a Knight that hits harder and lasts
longer: it kills a full-HP Fighter (12 of 12), Knight (13 of 13), or
Initiate (10 of 10) in one attack, deals a Guard 10 of 17 and takes 6, a
Fighter on a walled center 9 of 12. A Knight deals it 12 and takes 3; a
Catapult 8; a Marksman 5.

**Herald.** The lodge's life's work: a towering herald of the Ancient
Ones, a robe of night sky with one huge eye, and a crown of tentacles.

- **Ravage.** It may make two attacks in each of its owner's turns, after
  its Move or without one, at the same target or two targets; it never
  advances after a kill. A Proclaim takes the place of one of them. (When
  Unbound, its rampage also has two attacks.)
- **Unstoppable.** Its attacks ignore the defender's fortification levels
  (Walls, Field Defense, Dig In) and destroy a Field Defense on the
  target's tile, as Breach does; cover still counts, and so do Armoured,
  Plated, and Shields. It is immune to Freeze, Ribbit, Splat and every
  Candy status, Plague, Bitten, Mind Control, Swallow, Push (so a Crushing
  Shove crushes it, as damage), the Charge! push, Knockback, every Tractor
  Beam, Bounce, Boo!, a gate's shove, and Switcheroo. Damage of every kind
  hurts it.
- **Numbers.** At full HP it kills a full-HP Fighter, Guard (in the open
  or on a walled center with a Field Defense), Knight, Champion, Captain,
  Ankylosaurus, Mammoth, Triceratops, Zombie, Musk Ox, Marshmallow, or
  Jawbreaker with one attack, taking nothing back. It deals a Juggernaut 20
  and takes 7, then kills it with its second attack (20 of 20): **a giant
  dies in one turn.** It deals a T-Rex 25 of 28. A Plated Steam Tank takes
  only 4 a hit, the hardest body in the game for it. Against it, a Knight
  deals 9 and takes 9, a Champion 7 and takes 10, a Juggernaut 9 and takes
  9, a Catapult 6, a Tripod 9, a Rocket Cart 7, a Marksman 3, a
  Battleship 16 at range 3. Killing a fresh Herald by attrition takes about
  ten Catapult shots or seven Knight charges, one turn of an overwhelming
  army; the cheap answer is the channel (rule 6).

### 4.3 Reward, starting, and treasure units

Following the reward ladder of
[section 4.8 of the current rules](RULESET_7_CURRENT.md#48-city-rewards)
(no change to the ladder):

| Slot                                | Cult unit                                                                                                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Starting unit                       | One Initiate on the capital (the `FIGHTER` role, like every faction)                                                                                           |
| Level 2 Militia (or +4 Coins)       | **Two Initiates** (`MILITIA_FIGHTERS_V7` 2, the Goblin precedent: two Initiates are 4 Coins of units against the 4-Coin Stockpile, and 4 Favour if Sacrificed) |
| Level 3 Scouts (or Walls)           | The radius-3 reveal and a **Familiar**                                                                                                                         |
| Level 5 and up: giant (or 10 Coins) | The **Thing in the Cellar**, at every level from 5 (a Sacrifice of one pays 12 Favour)                                                                         |
| Treasure chest unit                 | A **Familiar** (the `RAIDER` role, like the five newer factions)                                                                                               |

Reward units appear by the shared placement rules. No reward, chest, or
Market hire ever gives Favour or a daemon.

### 4.4 The wacky abilities at a glance

The user asked for a wacky ability on every unit and every summon. Each is
one sentence on the card, one button or one rule, funny before it is
grim, and has a real tactical job. None copies another faction's
ability; the nearest relative is named.

| Unit        | Ability                           | Card text                                                                                                          | Tactical job                                                                   | Nearest relative, and why it is different                                         |
| ----------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Initiate    | **Pamphlets**                     | "Have you heard the good news about the Ancient Ones? The village joins at once."                                  | Wins the village race; makes up for frail bodies                               | None: every faction waits a turn on a village                                     |
| Idol Bearer | **Behold!** (action)              | "It holds up the idol. Cultists beside it are too awestruck to flinch, until someone hits the Idol Bearer."        | Keeps strands through chip damage; tells the enemy whom to hit first           | Field Defense protects HP; Behold! protects only the channel                      |
| Familiar    | **Switcheroo** (action)           | "The toad-cat and a unit within 2 swap places. Never on a settlement center."                                      | Pulls a broken enemy into a Seizure, a shooter into the line, a victim off one | The Tractor Beam pulls one way; this is a swap                                    |
| Hexer       | **Ribbit** (action)               | "Turns an enemy within 2 into a frog until the end of its next turn."                                              | Silences a Knight before it rides; softens a garrison for Initiates            | Freeze stops movement and keeps Defense; a frog hops and is soft                  |
| Summoner    | **Sacrifice, Seize, Summon**      | "Offer a unit to the Ancient Ones; hold down a broken enemy; call a Horror."                                       | The Favour engine                                                              | None                                                                              |
| Stargazer   | **Star-fall** (ritual)            | "Next turn a star lands 2 to 4 tiles away: 5, plus 1 for every chanter, to everything around it."                  | Siege and crowd control that ignores fortification                             | A Kaboom is now and centred on itself; this is announced and aimed                |
| Caller      | **Tentacle** (action)             | "Up comes a Tentacle within 3. It slaps and grabs whoever is weakest beside it."                                   | Kills exposed shooters; holds units under a star                               | The Spider wanders; the Tentacle is placed, rooted, and short-lived               |
| Chosen      | **Pick Me!** (action); Martyr     | "'I AM THE CHOSEN ONE!' Enemies beside it can attack nobody else until your next turn."                            | Shields channellers from melee; ranged attacks still reach them                | None in the game: the first taunt                                                 |
| Thing       | **Anchor** (free, once a turn)    | "The Thing grips the cultist beside it: that cultist's strand counts three. Hit that cultist and all three go."    | One cultist holds a Herald, at the risk of losing it to one hit                | None                                                                              |
| Horror      | **Boo!** (action)                 | "BOO! Every living unit beside it, friend or foe, jumps one tile away."                                            | Clears a center, scatters a crowd into a star, breaks a ring                   | Push, Knockback, and Bounce move one unit after damage; this moves all, no damage |
| Herald      | **Proclaim** (one of its attacks) | "'KNEEL!' A hostile city within 3 hides in its cellars: no income and no city action until its owner's turn ends." | Stops a retraining while the Herald takes the city; strangles a capital        | Besieging needs a unit on the center; this is at range 3 and costs a kill         |
| Tentacle    | **Grab**                          | "The unit it slapped cannot leave its side."                                                                       | Holds a victim under a Star-fall or in reach of the line                       | Stuck limits a Move to one step anywhere; Grab tethers it to the Tentacle         |

## 5. Sacrifice

**The heart of the economy.** The word on the button is **Sacrifice** (the
user's word, confirmed on 2026-10-09); the show stays pulp and bloodless
([section 14](#14-presentation)).

### 5.1 Sacrifice

**"The Summoner offers a unit beside it to the Ancient Ones: it is gone,
and you gain its value in Favour."**

- **Command** `SACRIFICE { unitId, victimUnitId }`, a primary action of a
  Summoner that may follow its Move.
- **Victim:** an own land-form unit on one of the eight tiles around the
  Summoner, of any role, the Thing in the Cellar and the Familiar
  included, never a daemon, an Egg, or a mind-controlled unit, and **not
  Plagued or Bitten** (as for Disband, so a Sacrifice never dodges a
  bite).
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

**"Two cultists hold down a broken enemy; the Summoner offers it. Twice
its value in Favour."**

- **Command** `SEIZE { unitId, victimUnitId }`, a primary action of a
  Summoner that may follow its Move.
- **Victim:** a hostile unit on one of the eight tiles around the
  Summoner that the actor sees, in land form, **living**
  (`isLivingUnitV7`: not of the Undead kind, not a construct), not a
  reward giant, not a two-slot unit, not an Egg, not neutral, and
  **broken**: at **5 HP or less**, or a **frog** ([section 9.1](#91-ribbit))
  at **half its maximum HP or less** (a Shield does not count). It must
  also stand next to **at least one other robed cultist** of the actor
  (the holder), who spends nothing.
- **Result:** the victim dies (`UNIT_DIED` cause `SACRIFICED`), credited
  to the Summoner as a kill (kills, Promotion, Slayer, the Score's Kills),
  with no Grave, rising, death blast, Crumbs, or Plunder. A Seized Brain
  releases its controlled unit. The seat gains **twice** the victim's
  value in Favour: a Fighter 4, a Guard 6, a Raider 8, a Knight 18, a
  Champion 12.
- **Why "broken" includes a frog only at half HP:** a frog at full HP
  would be an instant kill of any unit with no damage dealt and no turn
  to answer (the Ribbit and the Seizure come in the same Cult turn); the
  frog's Defense 0.5 makes the beating quick instead (an Initiate deals a
  frogged Knight 7 of 13, leaving 6, which is Seizable).
- **Why not Mind Control:** the Brain takes a weakened unit and may lose it
  again; the Seizure kills it for good and leaves nothing on the board.

### 5.3 Offering

**"A city gives up 2 population to the Ancient Ones for 3 Favour."**

- **Command** `OFFERING { cityId }`, the city's action for the turn
  (needs Farming, shown as **Harvest Rites**, [section 11](#11-technology-tree)).
  The city is the actor's, level 2 or more, not besieged or Cowed, with no
  pending reward, and its population (section 4.2 of the current rules)
  is **2 or more**.
- **Result:** the city's population drops by 2 for good (a new city field
  `offeredPopulation`, subtracted in the population formula, so the city
  is 2 population further from its next level). A level is never lost and
  a reward never repeats. The seat gains 3 Favour. (Population may still
  go below 0 later when live population is lost, as for every city.)
- **Why it is a real price:** 2 population is about 5 Coins of harvests and
  delays the city's next level and reward; it is the Coin-free route to
  Favour, worth it when the Cult is short of Coins and long of time. The
  population floor keeps it from becoming free once a city's income has
  hit its minimum ([section 17.5](#175-d-cheese-hunt)).

## 6. Daemons and the Channel

**The heart of the faction.** The choice of this upkeep model is
recorded in [section 12.2](#122-control-upkeep).

### 6.1 Summon a Horror

**"The Summoner and a cultist beside it summon a Horror for 5 Favour.
Both channel it this turn."**

- **Command** `SUMMON { unitId, helperUnitId, at }`, a primary action of a
  Summoner that may follow its Move: the helper is a robed cultist of the
  actor on one of the eight tiles around the Summoner that has not used a
  primary action (it may have moved); `at` is a free land tile next to the
  Summoner that a Horror could enter. Costs 5 Favour. Needs a Cult seat
  (a mind-controlled Summoner cannot summon, [section 13](#13-interactions)).
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
  robed cultist in land form on land that may follow its Move. The daemon
  is an own bound daemon, or an Unbound one that is not Furious
  (section 6.5), within Chebyshev distance **3** of the cultist. The
  cultist holds a **strand** to it until the next check. One strand per
  cultist per turn; a daemon may hold any number. Needs a Cult seat.
- **Control:** a Horror needs **1** strand, the Herald **3**.
- **Broken strand.** A strand breaks the moment its cultist is
  **disrupted**, the one rule this faction uses for the channel and for
  rituals:

  > **Disrupted:** it loses Hit Points (any source: an attack, a
  > retaliation, a splash, a ricochet, a thump, a blast, a bomb, an
  > eruption, Plague, a crush, a trample, a stomp, a sweep, a Whirl, a
  > Star-fall, Black Ice), **or** it is moved by anything but its own Move
  > (Push, the Charge! push, Knockback, a Tractor Beam, Bounce, Boo!,
  > Switcheroo, a gate shove, a reward displacement), **or** another seat
  > puts a status on it (Frozen, Stuck, Toothache, Splatted, Plagued,
  > Bitten, a frog), **or** it changes owner, or it leaves the board
  > (death, a Sacrifice, a Swallow, an embarkation).

  This is the user's rule of 2026-10-09: any HP loss, or being Frozen and
  the like, breaks a strand; "the like" is every status another seat can
  put on a unit. **Behold!** ([section 8.1](#81-behold-the-idol-bearer))
  is the one exception: a cultist on one of the eight tiles around an own
  Idol Bearer whose idol is raised **when it loses HP** keeps its strand.
  Every other cause still breaks it.

- **Candlelit.** A robed cultist that holds a strand is **visible to
  every player who has explored its tile**, wherever their units stand
  (its candles burn), so it can be targeted by any unit in range. The
  same holds for every ritual participant ([section 7.1](#71-taking-part))
  and for a Thing that grips a channeller. This closes the fog: a Cult
  cannot hide its channellers three tiles behind a Herald where Sight-1
  units cannot see them.
- **The check** runs at the Cult seat's Start Turn, after Plague and its
  chains and before rituals complete, Eggs, Windmill healing, and income
  ([section 13.3](#133-start-turn-order)). For each bound daemon, in
  unit-ID order: its **holding strands** are the strands of the last turn
  whose cultist is unbroken, still on the board as the seat's own, and
  within 3 tiles of the daemon now, each counting 3 when an Anchor grip
  holds and 1 otherwise ([section 8.4](#84-anchor-the-thing-in-the-cellar)).
  With holding strands **at least its Control**, it stays bound. Otherwise
  it is **Unbound** at once (section 6.4). Then every strand and grip is
  cleared; the seat must channel again this turn.
- **A fresh daemon** is checked at the first Start Turn after it appears,
  with the strands of its summoning.
- **What the owner sees at End Turn:** each bound daemon shows "2 / 3" (the
  strands it has against its Control). End Turn with a daemon short of its
  Control asks once: "The Herald will be Unbound. End turn?" That is a
  confirmation, not a protection: nothing stops the choice (rule 4).

### 6.3 Why it is a real decision

- **Upkeep is a turn of every channeller.** A Herald costs three cultists'
  actions every turn, four or five for insurance (or one cultist beside a
  Thing, at the risk of losing all three strands to one hit). A Horror
  costs one.
- **Range 3 is the leash.** The Herald has Move 2 and most cultists Move 1,
  so a Herald that runs ahead loses its channellers; one that waits keeps
  them. The player chooses each turn between reach and safety.
- **Who stands nearest.** Channellers within 3 of a daemon are usually its
  nearest units if it breaks. A player who keeps the daemon nearer to the
  enemy than to the channellers makes a break hurt the enemy first; the
  enemy who breaks a strand also pulls back so that the channellers are
  nearest. Both sides play the same puzzle on the same public board.
- **The opponent's plan is simple and always available:** break enough
  strands that fewer than Control remain. One Marksman shot breaks an
  unwarded strand. Against a Herald with exactly three channellers, one hit
  is enough.

### 6.4 Unbound

**"An Unbound daemon belongs to nobody. It attacks the nearest unit,
friend or foe, at once and after every round."**

- **Result of a failed check:** the daemon's owner becomes the neutral
  owner (`NEUTRAL_OWNER_ID_V7`) and it becomes a neutral unit of its own
  breed (`HORROR` or `HERALD`) in the neutral-unit registry of the map
  curiosities ([section 2.7 of the current rules](RULESET_7_CURRENT.md#27-map-curiosities));
  it keeps its kind, role, and HP and loses every status (Frozen, Stuck,
  Toothache), as no status sticks to a neutral unit. It **rampages at
  once**, inside the Cult seat's Start Turn, then in every neutral turn
  after every round, for as long as it lives. It never fades (rule 4).
  Event `DAEMON_UNBOUND { unitId, summonerPlayerId, strands, control }`.
- **The rampage rule** (one rule for every Unbound daemon):
  1. Its **target** is the nearest unit on the board by Chebyshev
     distance, of any player, never a neutral unit (the Spider, a camp
     guard, Bigfoot, another Unbound daemon, a Tentacle), a burrowed unit,
     or an afloat unit. Ties go to a unit of the seat that summoned it,
     then to the fewest HP, then to the lowest unit ID.
  2. It moves toward the target by its ordinary Move (shortest path, ties
     in `(y, x)` order, never into a gate) and attacks it if it ends next
     to it: an ordinary attack with retaliation. A Herald then makes its
     second attack on the nearest unit next to it by the same tie rule.
  3. It never advances, captures, Boos, Proclaims, ends a move on a
     settlement center, or takes a chest or curiosity. It attacks units on
     a center from beside it. A daemon Unbound while on a center besieges
     nothing from that moment (a neutral unit never besieges) and steps
     off at its first move.
- **Public:** the board marks the unit each Unbound daemon will go for as
  the board stands now (the eye mark the Giant Spider's likely target has
  today), and every bound daemon short of its Control shows the same mark
  for "if it broke now". Nothing is random.
- **Kills:** an Unbound daemon's kills are credited to nobody, like the
  Spider's, and pay no Favour. Killing one is an ordinary kill of a
  hostile unit at its value (Horror 6, Herald 24) for whoever does it,
  with no bounty Coins, **except** for the seat that summoned it, which
  gets no Kills and no Favour for its own former daemon.

### 6.5 Bind again, and Furious

**"Channel an Unbound daemon with enough cultists in one turn and it is
yours again, but not in the turn it broke loose."**

- **Furious.** A daemon that was Unbound in a Cult seat's Start Turn
  cannot be channelled by any seat during the rest of that turn. So a
  broken daemon always rampages twice (at the check and in the neutral
  turn after the round) before anyone can bind it.
- `CHANNEL` may target an Unbound daemon within 3 that is not Furious.
  When, during one Cult turn, the strands on it reach its Control, it is
  **bound** to that seat at once (exhausted until the next turn), and
  those strands count for the next check. Event `DAEMON_BOUND`. Any Cult
  seat may bind any Unbound daemon (in a match with two Cult seats, which
  only headless tools allow, a daemon can change lodges).
- So a Herald that broke can be taken back on the Cult's next turn by
  three cultists who walk to within 3 of it, if they live that long. A
  player may also let a daemon go on purpose, by not channelling it, to
  Unbind it inside an enemy army; it is then out of the Cult's hands for a
  whole round.

## 7. Rituals

### 7.1 Taking part

**"A leader and the cultists next to it chant. Everyone sees the
countdown. Disrupt the circle and nothing happens."**

- **Participants.** A ritual has a **leader**, named by the ritual, and
  **chanters**: the leader's own robed cultists on the eight tiles around
  it that have not used a primary action when it begins. Every such unit
  joins; a player who wants one left out uses it first. Beginning spends
  the leader's and every chanter's primary action. Rituals need a Cult
  seat.
- **Countdown.** A ritual completes at the start of the Cult's next turn,
  after the channel check. The enemy has exactly one turn to answer.
- **Breaking.** A participant who is **disrupted** (the rule of
  [section 6.2](#62-channel); Behold! does not apply to rituals) leaves the
  ritual. If the leader leaves, or fewer chanters remain than the ritual
  needs, it **fizzles** at once: the ring goes dark, nothing is refunded.
- **Public:** a chalk ring under the leader, a candle at each chanter, the
  ritual's icon, the countdown, and Star-fall's or the Herald's marked
  tile, on every tile the viewer has explored; every participant is
  Candlelit.

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
  chanters still in it): the unit standing on `at`, if any, decides it.
  - **A legal victim is consumed** (`UNIT_DIED` cause `CONSUMED`): an own
    unit that could be Sacrificed (Favour as a Sacrifice), or a hostile
    unit that could be Seized by the leader, the holder test waived
    (living, one-slot, not a giant, at 5 HP or less; Favour as a Seizure,
    credited to the leader).
  - **Any other unit blocks the arrival** (a healthy enemy, a giant, a
    two-slot unit, an Undead or construct unit, a neutral unit, an Egg):
    the ritual **fizzles** and the 20 Favour is gone. "Stand on the X" is
    counterplay any unit that reaches the mark can play.
  - Then the Herald stands on `at`, exhausted for this turn. The leader
    and every remaining chanter **channel it** at once, which spends their
    whole turn (no Move, no action), so its first check needs three of
    those strands unbroken.
- **The enemy's three windows:** the turn after the ritual begins (break
  the circle: disrupt the leader, or enough chanters to leave fewer than
  three; or put a healthy unit on the mark) and the turn after the Herald
  arrives (leave it fewer than three unbroken strands).

### 7.4 Star-fall

- **Begin:** `BEGIN_RITUAL { kind: "STARFALL", unitId, at }`: the leader is
  a Stargazer that has not moved this turn; `at` is a tile 2 to 4 tiles
  away (Chebyshev) that its owner has explored; at least one chanter.
- **Complete:** every unit on the board on `at` and the eight tiles around
  it, of any side and form (the Herald, the Thing, and ships included; a
  burrowed unit is not on the board), takes **5 + 1 for each chanter still
  in the ritual**, as fixed damage: no Defense, fortification, cover, Snow,
  or Blizzard; Armoured, Plated, and a Shield apply as for every fixed hit.
  Every Field Defense and **Barricade** in the area is destroyed. No
  retaliation. Kills are credited to the Stargazer (Promotion, Score).
  Cause `STARFALL`. A Stargazer that still has not moved may begin again at
  once.
- **No cap on chanters** beyond the eight tiles around the Stargazer: a
  Stargazer ringed by eight cultists drops a 13.

## 8. The faction's other unique rules

### 8.1 Behold! (the Idol Bearer)

**"It holds up the idol. Cultists beside it are too awestruck to flinch,
until someone hits the Idol Bearer."**

- **Command** `BEHOLD { unitId }`, a primary action of a land-form Idol
  Bearer that may follow its Move (the Guard's "cannot attack after
  moving" limits only Attack). It spends the Idol Bearer's action, so it
  does not channel that turn.
- **Effect:** the idol is **raised** until the end of the Cult seat's next
  Start Turn. While it is raised, an own robed cultist on one of the eight
  tiles around the Idol Bearer **that loses HP keeps its strand** (the
  moment of the HP loss decides). Being killed, moved, given a status, or
  taken still breaks it, and rituals are never protected.
- **Dropped:** the idol drops at once when the Idol Bearer is itself
  disrupted (any HP loss, a shove, a status, a capture, leaving the
  board). Strands kept before that moment stay kept. So the enemy's order
  matters: hit the Idol Bearer first (a Marksman deals it 4 of 16), then
  the channellers.
- **Never stacking:** a cultist next to two raised idols is warded once.
  Behold! is an action, not a passive aura, as the
  [design principles](PULP_WARS_TECH_TREE_DESIGN_PRINCIPLES.md#8-active-support-actions-not-passive-auras)
  ask.

### 8.2 Pick Me! and Martyr (the Chosen)

**Pick Me!** "'I AM THE CHOSEN ONE!' Enemies beside it can attack nobody
else until your next turn."

- **Command** `PICK_ME { unitId }`, a primary action of a land-form Chosen
  that may follow its Move.
- **Effect,** until the Cult seat's next Start Turn: a unit hostile to the
  Chosen's owner that stands on one of the eight tiles around the Chosen
  when it makes an `ATTACK` may target **only the Chosen**. Ranged
  attackers next to it are bound too; units two or more tiles away are
  not. It restricts the targeted `ATTACK` only: area effects (Whirl,
  Thump, Kaboom, blasts, Wail, Plague, Stomp), statuses (Bolas, Frost Bolt,
  Cold Snap), Mind Control, and the Tractor Beam are free. It ends when
  the Chosen leaves the board.
- **Why it is fair:** it shields channellers from the melee units that
  reach them, never from ranged fire or fixed damage, so the counterplay
  stays on the board.

**Martyr.** "When a Chosen dies, the Ancient Ones pay 6 Favour." Any death
but a Sacrifice (which pays its value anyway), a consumption, or an
attack by a wild unit (an Unbound daemon or a Tentacle; rule 4: the
Ancient Ones do not reward a failure).

### 8.3 Daemons feed

**"Every enemy a bound daemon kills pays its value in Favour."** A kill by
a Horror or Herald of the seat (attack or retaliation) of a hostile unit
of a player or of the neutral owner, **except** a daemon (bound or
Unbound, of any seat) or a Tentacle; never an own or allied unit.

### 8.4 Anchor (the Thing in the Cellar)

The giant's signature, in the style of the
[giants' signatures](RULESET_7_GIANTS.md#6-final-rules): ability literal
`ANCHOR`, role mechanic `anchorStrands` 2.

**"The Thing grips the cultist beside it: that cultist's strand counts
three. Hit that cultist and all three go."**

- **Command** `ANCHOR { unitId, cultistUnitId }`, **not a primary
  action**: once per turn, before or after the Thing's Move or attack, on
  an own robed cultist next to it that holds a strand this turn (it may
  channel after the grip). One grip per Thing, one grip per cultist.
- **At the check** the gripped cultist's strand counts **3** when the
  cultist's strand holds and it still stands next to the Thing, and the
  Thing has not been moved, Frozen, given a status, taken, or removed
  since the grip; it counts **1** when only the Thing failed, and **0**
  when the cultist was disrupted. The Thing's own HP loss never matters:
  it is too old to flinch.
- **The trade:** a Herald held by one Initiate beside a Thing costs one
  cultist's action instead of three, and one hit on that Initiate (or a
  freeze or push of the Thing) unbinds it. Several Things add no
  resilience beyond the cultists they grip.
- A heavy, friendly-looking mass of teal tentacles and many eyes with a
  broken trapdoor round its middle like a collar. Numbers: the reward
  giant's, Defense 3.5 (as the Gingerbread Giant) because its signature
  is a support one. It deals a Juggernaut 9 and takes 9; a Juggernaut
  deals it 10 and takes 7.

### 8.5 Boo! (the Horror)

**"BOO! Every living unit beside it, friend or foe, jumps one tile
away."**

- **Command** `BOO { unitId }`, a primary action of a bound land-form
  Horror in place of its attack, that may follow its Move.
- **Effect:** every **living** land-form unit on the eight tiles around
  it, **of any owner**, that is not a reward giant, a two-slot unit, an
  Egg, or a neutral unit, is moved one tile directly away from the
  Horror, in `(y, x, unitId)` order, when that tile passes the Push
  conditions (`displacementDestinationLegalV7`); otherwise it stays. No
  damage, no retaliation; it is not a Move. A moved robed cultist of any
  Cult seat is disrupted (so a Horror never Boos beside its own
  channellers). Undead and constructs are not scared. Event
  `UNITS_SCARED { playerId, unitId, results }`.
- **Jobs:** clear a garrison off an enemy center (the Juggernaut's Push
  precedent; an own unit must still walk on and survive a turn to
  capture), scatter a crowd under a Star-fall mark, break a Goblin mob's
  Gang Up, or push melee units off a circle.

### 8.6 Proclaim (the Herald)

**"'KNEEL!' A hostile city within 3 hides in its cellars: no income and no
city action until its owner's turn ends."**

- **Command** `PROCLAIM { unitId, cityId }`, one of the bound Herald's two
  attacks (it needs an attack left and land form; it may follow the
  Move). The city is a player's city hostile to the Herald's owner whose
  center the Cult has explored and that is within Chebyshev 3 of the
  Herald.
- **Effect:** the city is **Cowed** until the end of its owner's next
  turn: it pays no income at that Start Turn (like a besieged city) and
  has no city action (no training, laying, Land Grant, or Offering).
  Rewards still settle. State `cowed: { cityId, endsLeft }[]`, public.
  Event `CITY_COWED`. It may be Proclaimed again every turn.
- **Not an area attack:** it touches no unit. It is how a Herald besieges
  from range 3: kill the garrison with one attack, Proclaim with the other,
  and walk onto the empty center while nothing can be trained there.

### 8.7 Pamphlets (the Initiate)

**"Have you heard the good news about the Ancient Ones? The village joins
at once."**

- A land-form Initiate that **ended a Move on a neutral village center
  this turn** may `CAPTURE` it in the same turn, as if it had begun the
  turn there (`captureEligible` is set by the Move for this role on a
  neutral village only). Every other capture rule holds: alone on the
  center, no primary action used, never a player's city.
- **Why:** the cultists are the frailest line in the game; they win the
  village race instead. It saves one turn per village in the opening and
  is trivial for the AI (it is the ordinary Capture, offered earlier).

## 9. Hexes and havoc

A spell is one button on one unit: arm it, pick the target on the board
with the move, attack, help, and place marks
([board targeting](../ui/BOARD_TARGETING.md)), read the result at the
target.

### 9.1 Ribbit

**"Turns an enemy within 2 into a frog until the end of its next turn. A
frog hops, has Defense 0.5 and no fortification, cannot attack or strike
back, and can be Seized at half HP."**

- **Command** `RIBBIT { unitId, targetUnitId }`, the Hexer's primary
  action (in place of an attack), on a visible hostile land-form unit
  within Chebyshev 2. Not a reward giant, a two-slot unit, an Egg, a
  neutral unit, or a daemon. The Hexer cannot Ribbit on its owner's next
  turn (`hexCooldowns`, the Mind Control cooldown pattern). A
  mind-controlled Hexer keeps it (a unit trick, like a Kaboom).
- **A frog**, until the end of its owner's next turn: Defense 0.5 flat, no
  fortification level, no cover (a Shield still absorbs; Armoured and
  Plated still apply); no attack, retaliation, capture, Kaboom, or other
  primary action; Move 1 whatever its role; it still blocks its tile and
  exerts its zone of control. It may be frogged again as soon as it ends
  (no immunity, as the user ruled for Freeze). Cured by Tend Wounded,
  Repair, and Top-Up. A frogged cultist of another Cult seat is disrupted.
- **Distinct from Freeze** (`pulp_wars-w49.37`): a Frozen unit keeps its
  Defense and fortification and cannot move; a frog can hop away but is
  soft, and once beaten to half HP, Seizable.
- **Numbers.** An Initiate deals a Guard on a walled center with a Field
  Defense 2 and takes 8; after a Ribbit it deals 7 and takes nothing. A
  Hexer's own shot deals the frogged Guard 7. An Initiate deals a frogged
  Fighter 7 (5 left), a frogged Knight 7 (6 left, Seizable), a frogged
  Raptor 7 (5 left).

### 9.2 Switcheroo

**"The toad-cat and a unit within 2 swap places. Never on a settlement
center."**

- **Command** `SWITCHEROO { unitId, targetUnitId }`, the Familiar's primary
  action, from **Scouting** (its own technology): one visible land-form
  unit within Chebyshev 2, own or enemy, not a reward giant, a two-slot
  unit, an Egg, a neutral unit, or a daemon. Each unit must be able to
  stand where the other stood by the rule every shove uses, and **neither
  tile may be a settlement center** (city or village). The Familiar cannot
  do it again on its owner's next turn.
- A swapped unit is moved, so a swapped channeller (either side's) is
  disrupted. Neither unit's activation changes.
- **Jobs:** pull a broken enemy next to a Summoner and a holder (a Seizure
  this turn), drop an enemy Catapult among two Initiates, lift a dug-in
  Hammerer off its ring tile, or take a doomed own unit out of reach.

### 9.3 Tentacle and Grab

**"Up comes a Tentacle within 3. It slaps and grabs whoever is weakest
beside it."**

- **Command** `TENTACLE { unitId, at }`, the Caller's primary action: a
  free land or water tile within 3 of the Caller; one Tentacle per Caller
  at a time. The Tentacle is a neutral unit of breed `TENTACLE`, owned by
  nobody, Move 0, 8 HP, Attack 3, Defense 1; anyone may attack it (no
  bounty, value 0).
- **Slap:** at once and in every neutral turn, it attacks the adjacent
  unit (any player's, any form; never a neutral unit) with the fewest HP,
  ties to the lowest ID: an ordinary attack with retaliation. It sinks at
  the end of the third neutral turn after it rose.
- **Grab:** the unit it last slapped, while it survives and stands next to
  the Tentacle, may move only to tiles next to that Tentacle (a Move that
  leaves its side is `MOVEMENT_ILLEGAL { reason: "GRABBED" }`). Shoves
  still move it (and end the grab). The grab ends when the Tentacle dies or
  sinks, or slaps another unit.
- **Numbers.** It kills a full-HP Catapult on arrival (10 of 10), leaves a
  Marksman at 2, an Initiate at 1, a Fighter at 4 (and takes 4). On water
  it slaps ships. Kills are credited to nobody.

## 10. Balance against the Humans, unit by unit

The method of the faction passes: cost, HP, Attack, Defense, Move against
the Human of the same role; where the Cult unit is better, it pays in cost,
HP, or Defense. **The daemons are exempt by the variance rules:** they are
meant to be better than anything, and are paid for in Favour and upkeep.

| Role         | Human (cost/HP/Atk/Def/Move)                      | Cult (cost/HP/Atk/Def/Move)                     | Head to head (full HP, open ground)                                                                                  | Verdict                                                                                            |
| ------------ | ------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Line         | Fighter 2/12/2/2/1, Field Defense                 | Initiate 2/10/2/1.5/1, Pamphlets                | Initiate attacks: deals 5, takes 5. Fighter attacks: deals 5, takes 3.                                               | Weaker body, same price: pays for channelling, chanting, villages, and being Favour.               |
| Defender     | Guard 3/17/1.5/3 (1 against range), Field Defense | Idol Bearer 3/16/1.5/2.5, Behold!               | Marksman deals it 4 (the Guard 6). A Fighter deals it 4, takes 6 (the Guard: 4, takes 8).                            | Softer up close, sturdier at range; Behold! instead of Field Defense.                              |
| Fast         | Raider 4/12/2/1/2, Charge, Escape, ignores ZOC    | Familiar 3/8/2/1/2, Charge, Switcheroo          | Familiar attacks a Marksman: deals 6, takes 2. A Raider deals a Familiar 6 of 8, takes 2.                            | 1 Coin cheaper, 4 HP frailer, loses Escape and ZOC freedom for Switcheroo.                         |
| Ranged       | Marksman 4/12/2/1/1, range 1–2                    | Hexer 4/9/2/1/1, range 1–2                      | Hexer shoots a Fighter: 5 (a Marksman: 5). A Knight kills a Hexer (9 of 9).                                          | Same shot, 3 HP less: pays for Ribbit every second turn.                                           |
| Support      | Captain 5/10/1/1/1, Rally, Tend                   | Summoner 5/10/1/1/1                             | Equal bodies. A Marksman deals either 6; a Knight kills either.                                                      | Parity of body; Sacrifice, Seize, and Summon instead of Rally and Tend.                            |
| Siege        | Catapult 8/10/3/0.5/1, range 2–3                  | Stargazer 8/10/—/0.5/1, Star-fall 2–4           | A Catapult deals a Fighter on a walled center 8 now; Star-fall with 2 chanters deals 7 next turn, to all nine tiles. | No direct shot; trades certainty for area, Wall-ignoring, and three units' actions.                |
| Breakthrough | Knight 9/13/4/1/3, Overrun                        | Caller 8/12/2.5/1/2, Tentacle                   | Caller attacks a Marksman: 8, takes 1 (a Knight kills it). A Knight kills a Caller (12 of 12).                       | Much weaker in its own fight, 1 Coin cheaper; its Tentacle does the backline killing from 3 tiles. |
| Heavy line   | Champion 6/15/3.5/2.5/1                           | Chosen 6/15/3.5/2/1, Pick Me!, Martyr           | Chosen attacks a Champion: 9, takes 5. Champion attacks a Chosen: 10, takes 3.                                       | Defense −0.5 pays for the taunt and 6 Favour on death.                                             |
| Reward giant | Juggernaut 40/4/4, Crushing Shove                 | Thing in the Cellar 40/4/3.5, Anchor            | Thing attacks Juggernaut: 9, takes 9. Juggernaut attacks Thing: 10, takes 7.                                         | Defense −0.5 pays for Anchor.                                                                      |
| (none)       | —                                                 | Horror 5 Favour + 1 strand/turn, 18/4/2/2       | Horror kills a Knight (13 of 13); a Knight deals it 12, takes 3.                                                     | Better than a Knight for about 5 Coins of Initiates, plus one cultist's turn every turn.           |
| (none)       | —                                                 | Herald 20 Favour + 3 strands/turn, 60/7/4/2, ×2 | Kills any non-giant Human unit per attack; kills a Juggernaut in one turn.                                           | Deliberately above everything (variance rule 1).                                                   |

**The whole army.** Without daemons the Cult is a slightly weaker Human
army with tricks (frogs, swaps, stars, taunts). It must convert units into
Favour and Favour into daemons to win, and every daemon ties cultists to
the channel. The two failure checks of every faction:

- **One unit that makes the rest pointless?** The Herald, deliberately, but
  it makes the robed units **more** necessary: three to five of them must
  channel it every turn, and a Summoner and three chanters must make it.
  The Horror is the everyday version and needs one channeller.
- **Always wins or never wins?** Neither, by construction: the Cult that
  protects its channellers wins hard, the Cult that cannot loses hard, and
  which one happens is decided on the board each turn
  ([section 17.7](#177-f-win-paths-and-loss-paths)).

## 11. Technology tree

The shared graph, tiers, prerequisites, prices, free opener, Dry Land
rule, and every shared unlock, with these Cult differences (display names
in the pattern of section 6.2 of the current rules; IDs unchanged):

| ID               | Cult name               | Cult unlocks (differences in bold)                                                   | Why a Cult player buys it                                    |
| ---------------- | ----------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `FARMING`        | **Harvest Rites**       | Farm; **Offering**                                                                   | Favour without Coins                                         |
| `MILLING`        | Milling                 | Windmill (it never heals a daemon)                                                   | The only healing for frail cultists                          |
| `ADMINISTRATION` | Leadership              | **Summoner (Sacrifice, Seize, Summon Horror)**; Market; Disband                      | The faction's heart; the second technology                   |
| `SAWMILLING`     | **Stargazers**          | Sawmill; **Stargazer (Star-fall)**                                                   | The crowd and fortification answer                           |
| `MARKSMANSHIP`   | **Hexers**              | **Hexer (Ribbit)**                                                                   | The anti-rush unit, the long-range answer, the Seizure combo |
| `FIELDCRAFT`     | Pathfinding             | Replant Forest; Forest march; Hexer Sight 2                                          | A Hexer that sees its own Ribbit range                       |
| `SCOUTING`       | **Familiars**           | **Familiar (Switcheroo)**; Familiar Sight 2                                          | Scouting, chests, and the swap                               |
| `RAIDING`        | Raiding                 | Pillage; Familiar Charge                                                             | Raids, and the road to Callers                               |
| `CHIVALRY`       | **Callers**             | **Caller (Tentacle)**; Cultivate Forest; no Overrun                                  | The backline killer                                          |
| `METALLURGY`     | **the Chosen**          | Forge; Arms Industry (−1 Coin training; never Favour); **Chosen (Pick Me!, Martyr)** | The heavy body that guards the circle and pays when it dies  |
| `FORTIFICATION`  | **Warding Circles**     | **Idol Bearer (Behold!)**; no Field Defense                                          | A channel that survives chip damage                          |
| `EXPLOSIVES`     | **The Stars Are Right** | Blast Mountain; Breach; **the Great Summoning (the Herald)**                         | The capstone, behind the node that protects its channel      |

Gathering, Planning, Hunting, Forestry, Roads, Commerce, Drill (Crafting),
Engineering, and the five Naval technologies read as for every seafaring
faction. Channel and Horror summoning need only the Summoner. Capabilities
(the engine reads these, never a raw technology test): `offering`,
`switcheroo`, `greatSummoning`; the unit abilities `SACRIFICE`, `SEIZE`,
`SUMMON`, `CHANNEL`, `RIBBIT`, `SWITCHEROO`, `TENTACLE`, `STARFALL`,
`BEHOLD`, `PICK_ME`, `MARTYR`, `PAMPHLETS`, `ANCHOR`, `BOO`, `RAVAGE`,
`UNSTOPPABLE`, `PROCLAIM`, `GRAB`. Every node is checked in
[section 17.6](#176-e-every-technology).

**Where the strong effects sit.** The Horror is tier 2 (Administration):
the identity works in the first ten rounds. The Herald is tier 3 behind
Warding Circles: the tree hands the Cult its protection one step before
its monster. Star-fall and the Tentacle are tier 3.

## 12. The two decided choices

The first draft offered alternatives for the economy and the upkeep. The
user chose both recommendations on 2026-10-09; the tables stay as the
record of what was weighed.

### 12.1 The special economic mechanic

| Option                                           | How it works                                                                                                                                                                                                               | For                                                                                                                                            | Against                                                                                                                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Favour** (**chosen**; section 3)            | A public, uncapped pool fed by Sacrifice, Seize, Offering, bound daemons' kills, and Martyrs; spent only on summons.                                                                                                       | One number; separates earning from spending (a Sacrifice at home pays for a Herald at the front); compounds; public, so it is counterplayable. | A second purse beside Coins, which the [design principles](PULP_WARS_TECH_TREE_DESIGN_PRINCIPLES.md#13-avoid-unnecessary-new-resource-systems) discourage; the user asked for one. |
| **B. Blood Altars** (Coins only)                 | A Cult building, the Altar, on any own territory tile: +2 Coins whenever a unit of any side dies within 2 tiles of it; a Sacrifice on an Altar pays the victim's value in Coins; summons cost Coins (Horror 6, Herald 24). | No new resource; positional (the enemy can pillage or capture an Altar); battles near home pay.                                                | Summons compete with every other Coin use; Coins already pile up; deaths far from Altars pay nothing, so the Cult turtles near them, the play the Human tuning removed.            |
| **C. The Doom Track** (a threshold, never spent) | A public counter that only rises (Sacrifice, Seize, bound kills add the victim's value). Summons are free but need Doom 5 (Horror) or 25 (Herald); Doom is never spent.                                                    | The most extreme snowball: past 25, Heralds are limited only by rituals and channellers, which is exactly the user's "balanced by upkeep".     | No economic decision after the threshold (it is a technology in disguise); the opponent cannot drain it; early game it does nothing.                                               |

### 12.2 Control upkeep

| Option                                  | How it works                                                                                                                                                                                | For                                                                                                                           | Against                                                                                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Active Channel** (**chosen**; 6.2) | Each turn Control cultists spend their action to channel; at the Cult's Start Turn the unbroken strands within 3 are counted; any HP loss, shove, enemy status, or capture breaks a strand. | The user's own example; a real upkeep (actions); every faction can break a strand with what it has; deterministic; one check. | Fiddly with many daemons (one action per channeller per daemon); one Marksman shot can break an under-channelled Herald.                                        |
| **2. Presence** (passive)               | A daemon stays bound while at least Control own cultists stand within 2 of it at the Cult's Start Turn; no action, damage irrelevant.                                                       | Simplest to play and to teach; the AI only keeps units near.                                                                  | No upkeep cost beyond standing still; counterplay must kill, not hurt, so the Herald is far harder to answer; less drama.                                       |
| **3. Control roll**                     | At each Start Turn a seeded draw breaks the daemon with a chance that grows with each missing channeller (none missing: 5%; each missing: +30%).                                            | The most "cannot always control"; spectacular failures even when played well.                                                 | Dice, not counterplay: a perfect player still loses a Herald to a roll, which the user's fairness rule (counterplay) argues against; the AI cannot plan for it. |

## 13. Interactions

### 13.1 Faction rules and other systems

| Rule                                                 | Ruling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Freeze** (`pulp_wars-w49.37`)                      | A Frozen cultist is disrupted (its strand and ritual place break) and cannot channel on its frozen turn. A bound Horror can be Frozen (no retaliation, no move); the Herald is immune; an Unbound daemon is neutral and cannot be Frozen. Cold Snap on a circle breaks every adjacent chanter at once. Black Ice damage or freeze on an iced channeller breaks it. Shatter can kill a Frozen bound Horror; never the Herald. A Frozen Thing's grip fails.                                                                                                                                                                                                                                                                                                                                                                           |
| **Plague and Bitten**                                | Plague damage at the Cult's Start Turn comes before the check and breaks every plagued channeller not under a raised idol: the Undead's best answer. A Plagued or Bitten unit cannot be Sacrificed; a Bitten enemy can be Seized: it dies and does not rise (a Seizure is a removal). Daemons are not living: no Plague, bite, Infect, or Wail on them.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Undead Graves**                                    | A Sacrifice, Seizure, or consumption leaves no Grave; every other death of a Cult unit does. An Unbound daemon's and a Tentacle's victims leave Graves as any death.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Eggs**                                             | An Egg is never Sacrificed, Seized, frogged, swapped, scared, or consumed (it blocks the Herald's arrival). Star-fall, Tentacles, the Herald, and a rampage hit Eggs as units.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Barricades** (Dwarf)                               | Block daemons and cultists like any unit. Star-fall destroys every Barricade in its area. A bound daemon may `ATTACK_BARRICADE` (the Herald deals a fresh one 10 of 10, Defense 2); a rampage never attacks a Barricade and walks round it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Whirl, Thump, Stomp, Sweep** (area hits)           | Each hit is an HP loss: a Whirligig, a Chocolate Bunny, a Brontosaurus, or a Mammoth beside a circle breaks every hit cultist (Behold! keeps those under a raised idol unless the Idol Bearer is hit too). Pick Me! does not restrict them.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Burrowing** (Dwarf)                                | A burrowed unit is never a rampage target, a Star-fall victim, or a Seizure; a cultist never burrows. A surfacing eruption damages channellers (breaks strands).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Goblin Kaboom, death blasts, Berserk**             | A blast is fixed HP loss: it breaks every cultist in the 3 × 3. A Seized Bomb Chucker, Rocket Cart, or Scrap Buggy is removed and never explodes (a lawful trick); one the Herald kills explodes on it as usual. Berserk units ignore zones of control and reach the back row. "Berserk" is a Goblin word: the Cult's failure state is **Unbound** in every text.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Sugar Rush and Candy statuses**                    | Splat, Stuck, and Toothache from another seat disrupt a cultist. A Rushed Candy unit reaches a back row a turn early: the Candy answer. The Herald is immune to every Candy status and to Bounce; a bound Horror is bounced and may be Stuck. A Seizure and a Sacrifice leave no Crumbs; the Herald's kills do.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Mind Control and the Tractor Beam**                | A mind-controlled channeller has changed owner: broken. A pulled channeller is moved: broken. Daemons are immune to both. A Brain may be Seized; its thrall is released. A mind-controlled cultist moves, attacks, captures, Ribbits, swaps, raises its idol, and taunts for its controller (unit tricks follow the unit, like a Kaboom), but Sacrifice, Seize, Summon, Channel, Anchor, Offering, and rituals need a Cult seat.                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Giants' signatures**                               | Swallow and Goblin Toss never take a daemon; a swallowed cultist is off the board (broken). Crushing Shove, Glacial Smash, and Siege Hammer hurt a daemon as damage only (the Herald is never pushed, a bound Horror may be). Thunder Stomp and Overstride's trample break the cultists they hit. The Thing's Anchor is a grip (section 8.4).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Curiosities, rounds 1 and 2** (`pulp_wars-737.14`) | An Unbound daemon and a Tentacle are neutral units of their own breeds and act in the neutral turn with the Spider, the camp guards, and Bigfoot, in unit-ID order; "one danger per board" is a generation rule and does not stop a daemon from breaking. A rampage never targets a neutral unit, and no neutral unit's provocation or flight reads an Unbound daemon. A daemon never heals at a Fountain, is never Promoted at a Shrine, and never tosses a Coin into the Wishing Well. A bound daemon traverses a Dimensional Gate by its own Move like any unit (and usually leaves its channellers' reach: it breaks at the check); a rampage path never enters a gate; a cultist shoved by a gate is disrupted. A bound daemon's kill of the Spider, a guard, or Bigfoot pays its value in Favour, and the bounty to its seat. |
| **Score and modes** (`pulp_wars-kaw6.2`)             | Favour is not scored. A daemon's Army value (Horror 6, Herald 24) counts while the seat commands it and leaves the Army when it is Unbound (not a Loss, but the seat is no longer flawless: a unit left its control). A Sacrifice is not a Loss and ends Flawless; a Seizure is a kill (Kills for the Cult, Losses for the victim). Unbound and Tentacle kills are credited to nobody. Killing a wild daemon is a kill at its value, except for the seat that summoned it.                                                                                                                                                                                                                                                                                                                                                          |
| **Achievements**                                     | Slayer counts Seizures and bound kills; Muster counts daemons as kinds while commanded.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Capture** (`pulp_wars-ke95`)                       | Every Cult land unit and every **bound** daemon captures; a daemon that captures stays homeless (fills no slot). An Unbound daemon never besieges or captures. An Initiate captures a neutral village on arrival (Pamphlets).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Reward ladder** (`pulp_wars-zypi`)                 | Unchanged: Militia two Initiates, Scouts a Familiar, a Thing at every level from 5, the Familiar as the chest unit. A Cowed city still settles its rewards.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Elimination**                                      | An eliminated Cult seat's bound daemons become Unbound at once (they rampage in the next neutral turn); its Favour is gone. A Cult seat with a bound Herald and no city is eliminated like any seat.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Nine seats**                                       | `CULT` is the ninth faction, so `F` is 9 and a match has 2 to 9 players (section 17.8).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

### 13.2 Counters, both ways

| Against  | The Cult's answer to their trick                                                                                  | Their answer to the Cult                                                                                                                                 |
| -------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Human    | Frog the Knight before it charges; Star-fall on Guards on Field Defense; frog, beat, and Seize a Knight for 18    | Marksmen and Catapults on channellers; a Raider ignores zones of control to the back row; a Knight's Overrun through a circle                            |
| Undead   | Daemons are immune to Plague, bite, and Infect; nothing the Cult loses to a Sacrifice becomes a Grave             | Plague on a circle breaks every strand at the Cult's Start Turn; a Wail hits a whole circle; nothing of theirs can be Seized                             |
| Goblin   | Star-fall on a clumped horde; Boo! breaks a Gang Up; a frog cannot Kaboom; Seize broken Goblins (no blast)        | A Kaboom or death blast beside the channellers; Berserk walks past the line                                                                              |
| Dinosaur | Frog a one-slot dinosaur, beat it, Seize it; Star-fall on Eggs; Sacrifice denies growth                           | A Raptor's Pounce kills an Initiate; a T-Rex's Rampage, a Stomp, or a Charge! push through the back row; two-slot dinosaurs are immune to frog and Seize |
| Martian  | Daemons cannot be mind-controlled or pulled; frog a Brain, beat it, Seize it                                      | Mind Control or a Tractor Beam on a channeller; a Saucer reaches the back row                                                                            |
| Ice Folk | The Herald ignores Freeze; Star-fall ignores Snow cover and the Blizzard; daemons walk through deep snow          | Cold Snap breaks a whole circle; Frost Bolt and Bolas break single strands; a Frozen Thing loses its grip                                                |
| Dwarf    | Star-fall destroys Barricades and ignores Dig In; Switcheroo lifts a dug-in Hammerer; frog-and-Seize a Steam Tank | A bomb from three tiles, a Knockback, a Whirl, or an eruption under the circle; the Plated Steam Tank takes 4 from the Herald                            |
| Candy    | Frog a Chocolate Bunny; Seize a Crashed unit at 5 HP                                                              | Splat or Stick a channeller; a Thump breaks a circle; a Rushed Donut Racer or a hopping Bunny reaches the back row                                       |

### 13.3 Start Turn order

A Cult seat's Start Turn adds two steps to
[section 3 of the current rules](RULESET_7_CURRENT.md#3-players-turns-and-victory):
after Plague and its chains, **(a) the channel check** for each bound
daemon in unit-ID order, each Unbound one rampaging at once with its
deaths and consequences and becoming Furious for the turn, then **(b) the
rituals**, each completing or fizzling in leader unit-ID order (Star-fall's
damage, the Great Summoning's consumption or block and arrival); then the
existing steps from Egg hatching on. A Cowed city pays no income at its
owner's Start Turn. The neutral turn runs every neutral unit (the Spider,
camp guards, Bigfoot, Unbound daemons, Tentacles) in unit-ID order; each
Tentacle's lifetime counts down at the end of the neutral turn. So a
Cult's own Star-fall that hurts its own channellers breaks those strands
for the **next** check, not this one.

## 14. Presentation

### 14.1 Names and tone

A pulp lodge, never grim or gory, and nothing from a published mythos (no
named Old One, book, or creature) or a real religion. The user's words
"Sacrifice" and "Seize" are on the buttons (confirmed 2026-10-09); what
happens on screen stays a magic trick: a puff of green smoke and the
victim's hat left spinning on the tile (an own unit), or a tentacle from a
crack in the ground that tugs the enemy down with a comic "glurp" (a
Seizure). The sign of the lodge is an eye in a spiral.

- **Faction:** Cultists (ID `CULT`); in Help, "the Cultists of the Ancient
  Ones".
- **Units:** Initiate, Idol Bearer, Familiar, Hexer, Summoner, Stargazer,
  Caller, Chosen, Thing in the Cellar; Horror, Herald, Tentacle.
- **Words:** Favour, Sacrifice, Seize, Offering, Summon, Channel, strand,
  Control, Unbound, Furious, Bind, Candlelit, Behold!, Pick Me!, Martyr,
  Pamphlets, Anchor, Boo!, Ravage, Unstoppable, Proclaim, Cowed, Grab,
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
channellers), the Chosen added (a burly cultist in a crimson-trimmed hood
with an oversized ceremonial cleaver and a "CHOSEN" sash, one hand raised
for Pick Me!), the Initiate's sheaf of pamphlets, and the Idol Bearer's
idol held high for Behold!; the sounds
([section 7.5](RULESET_7_CULT_PROPOSAL.md#75-sounds-worth-having)), with a
taut violin string per strand, a snap for a broken strand, a gong and a
deep laugh for Unbound, a rubber-horn "BOO!", a frog's croak, a
paper-rustle for Pamphlets, and a booming "KNEEL!"; and the 5/4
mock-sinister procession theme
([section 7.6](RULESET_7_CULT_PROPOSAL.md#76-theme-music)).

**The art direction** (bead ART1, `pulp_wars-mch9.13`) is
[the Cult's faction fragment](../art/factions/CULT.md): the palette, the
silhouettes, the cities, buildings and ships, the icons and effects, and the
asset list of the art beads. It re-measured the colour (it passes; the board
capture moves to the bead that registers the colour) and it is the design
where it differs from the looks above: the Chosen has a plain cream sash
with no crimson and no lettering, the Initiate carries no dagger, the Idol
Bearer is one figure, and the gondola is indigo.

### 14.3 How it reads on the board without text

| Thing                      | Shown as                                                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Favour                     | Green candles and a number beside the Coins (own) and beside each Cult seat in the leaderboard (everyone)                                |
| A strand                   | A thin green chain from channeller to daemon, for every viewer who has explored both tiles; it snaps (red flash) on a disruption         |
| Candlelit                  | A lit candle over every channeller and participant, on every explored tile                                                               |
| Control                    | Pips under each daemon: lit for holding strands, hollow for missing ones ("2 / 3"); a gripped strand shows three lit pips                |
| A daemon that would break  | The eye mark on the unit it would go for if it broke now, and a cracked collar                                                           |
| Unbound and Furious        | No owner colour, red eyes, broken chains; the eye mark on its target; steam from the ears while Furious                                  |
| Behold!                    | The idol held high and a chalk ring round the Idol Bearer's eight tiles; the ring vanishes when the idol drops                           |
| Pick Me!                   | A raised hand and a speech bubble "ME!" over the Chosen; a red tether to each enemy next to it                                           |
| Anchor                     | A teal tentacle from the Thing wrapped round the gripped cultist                                                                         |
| A ritual                   | A chalk ring under the leader, a candle at each chanter, the icon, a countdown ring; Star-fall's and the Herald's target tiles marked    |
| Sacrifice, Seize, Offering | The help mark on legal victims (own) and the attack mark (enemy), labelled with the Favour; the city button shows "+3 Favour, −2 people" |
| A frog                     | A small frog on the unit's base with a pip for the turn left                                                                             |
| Switcheroo                 | Ghosts of the two units in each other's places before the click                                                                          |
| Grab                       | A tentacle curled round the grabbed unit                                                                                                 |
| Cowed                      | Shutters closed on the city and a "KNEEL!" banner                                                                                        |

Each has a one-sentence tooltip (the card texts above) and a Help entry.

## 15. Normal AI

The Normal AI is deterministic, reads only the public view and previews,
and has **no memory between turns**
([current rules, section 16](RULESET_7_CURRENT.md#16-normal-ai-summary);
[Normal AI](../architecture/NORMAL_AI.md)). Everything the Cult needs is on
the board: strands, Control, grips, rituals, marks, and Favour are public.
A new gated module, `src/ai/v7-cult.ts`, holds the Cult rules. It is a
**baseline designed from judgement and from the lessons of the other
factions' passes, not tuned by simulation**: no match is played to set a
number in it, and its tests are hand-built positions.

### 15.1 The gate and the lessons of the other factions

- **On the army policy from the first AI bead** (the Candy lesson). `CULT`
  joins `ARMY_PLAY_FACTIONS_V7` in bead A1, before the faction is offered
  anywhere, so a match with a Cult seat keeps every other seat on the
  army rules. (A match with a Candy seat still keeps the older policy for
  every seat today; the Cult must not add a second such drag.) Every Cult
  rule is gated on a Cult viewer; the rules against the Cult (15.5) are
  additive candidates gated on a visible Cult unit or mark; nothing else
  of another seat's research, production, or scoring changes.
- **Research order** (`ARMY_RESEARCH_ROLES_V7.CULT`): Summoner, Hexer,
  Idol Bearer, Familiar, Chosen, Stargazer, Caller. From a Gathering
  opener: Leadership, Hunting, Hexers, Crafting, Warding Circles,
  Familiars, Harvest Rites, Engineering, the Chosen, Forestry, Stargazers,
  Raiding, Callers. The Stars Are Right is the first late technology, due
  once Favour has reached 12. With a hostile `RAIDER`- or `KNIGHT`-role
  unit in sight before the seat has Hexers, Hunting and Hexers go first
  (`WANTED`), the pattern of the Goblin seat's Orc Brute rule.
- **The army** (`armySharesV7`, first guesses, not tuned): 45% line
  (Initiates and the Chosen), 20% Hexers, 10% Idol Bearers (no more than
  the seat owns cities, the Musk Ox cap), 10% Stargazers, 10% Callers,
  Summoners 1 for every 6 units (at least 1 once Leadership, at most 3);
  one Familiar for 5 units, 2 at most.
- **Bodies first** (the Undead lesson): the seat counts its robed
  cultists that capture; short of bodies it trains Initiates before
  research and takes the Militia (two Initiates) at level 2; it takes the
  Familiar at level 3 and the Thing at every level from 5 (a body that
  grips).
- **Weak links** (the Dinosaur, Ice Folk, and Dwarf Knight-ride lesson):
  every robed cultist under 15 HP at its maximum (the Initiate, Hexer,
  Summoner, Stargazer, Caller) is a weak link of a kill chain at any HP (a
  Knight kills each at full HP); the Chosen and the Idol Bearer are
  escorts. Channellers and chanters do not end a Move next to each other
  while a visible enemy with Overrun can reach them (`armyChainSpacingV7`),
  so one Knight cannot ride through a whole circle.
- **Contact with company** (the Goblin mob lesson): an Initiate does not
  step beside an enemy where the visible enemies kill it unless another
  own unit stands beside that enemy or can still come; a Seizure's holder
  and a Pamphlets capture are exempt.
- **Shooters and the back row out of reach** (the Ice Folk and Dwarf
  lesson): a Hexer, Stargazer, or Summoner makes no Move into a visible
  hostile melee unit's reach with no own line, defender, or Chosen nearer
  to the enemy, nor into the reach of a unit with Overrun from outside
  it; exempt are the Move from which a Hexer's shot kills and a Summoner's
  Move to a Seizure.

### 15.2 Channel first, and keep the channellers safe and spare

The AI runs these steps **before** its ordinary army play, every turn. No
robed cultist is given any other action until the channel plan has
claimed the ones it needs.

1. **Count the upkeep.** For each own bound daemon (the Herald first, then
   Horrors by unit ID), the wanted strands are **Control + 1** (Herald 4,
   Horror 2): one spare, so that one hit never unbinds it. With too few
   robed cultists it wants Control.
2. **Plan the daemon's move first.** A daemon may end its Move (and make
   its attacks) only on a tile within **4** tiles of at least its wanted
   strands' worth of candidate channellers (robed cultists not yet
   assigned, nearest first); this keeps them able to step to within 3.
   Among such tiles it takes the best attack by the ordinary scoring (the
   Herald's two attacks scored together, kills first) and, all else equal,
   a tile where a visible enemy unit is nearer to it than any own unit.
3. **Assign channellers.** The nearest unassigned robed cultists that can
   reach a tile within 3 of the daemon's new tile are assigned. Each
   prefers a tile next to an own Idol Bearer (which then raises its idol),
   then a tile outside every visible enemy's threatened tiles
   (`queryThreatenedTilesV7`), then one not next to another channeller,
   then the farthest from the enemy. Each moves and channels. A Thing
   next to an assigned channeller grips it, and that channeller then
   counts three (the seat still wants one more strand from elsewhere for
   the spare).
4. **A daemon that cannot be held** (fewer than Control strands can reach
   it) is **released toward the enemy**: it moves to the tile that puts the
   nearest visible enemy unit nearer to it than any own unit, and the
   assigned cultists instead move away from it. The AI never leaves its
   own units nearest to a daemon it cannot hold, when another legal tile
   exists.
5. **Bind again** an Unbound daemon that is not Furious only when Control
   robed cultists can all reach tiles within 3 of it this turn and none of
   those tiles is the daemon's current target.

### 15.3 Summon only what it can hold

- **Horror:** when Favour is 5 or more, a Summoner has a robed neighbour
  that has not acted, and after the summoning the seat still has a spare
  robed cultist for every daemon's Control + 1. Next to a visible enemy
  only when the Summoner and its helper are not the Horror's nearest units
  if it broke.
- **The Great Summoning:** only when Favour is 20 or more, the seat has
  The Stars Are Right, a Summoner already has three robed neighbours that
  have not acted, no visible enemy unit can reach any participant or the
  mark next turn, and the seat has four robed cultists to spare for the
  Herald's upkeep beyond every other daemon's. When Favour is 20 or more,
  idle cultists at home end their Moves next to the capital's Summoner.
  The mark is a tile surrounded by own units, never one an enemy can reach.

### 15.4 Everything else, in simple high-value ways

| Mechanic   | The AI's rule                                                                                                                                                                                                                                                                       | Honest flag                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Seize      | Always, when legal (a free kill at double Favour), before ordinary attacks on that unit. Hexers frog an enemy next to a Summoner and a holder first when the beating and the Seizure can follow this turn.                                                                          | Plays it well                                |
| Sacrifice  | (a) An own unit that a visible enemy can kill this turn and that cannot retreat; (b) an Initiate beyond the seat's wanted channellers + 2, when Favour is within its value of 5 or 20 and the Summoner has nothing better. Never a city's last defender while an enemy is within 3. | Plays the plain cases                        |
| Offering   | A city with population 2 or more, at its unit limit or with nothing to train, when Favour is short of the next threshold and no enemy is within 3.                                                                                                                                  | Simple and safe                              |
| Star-fall  | The tile with the most enemy value on its nine tiles, preferring fortified units, siege units, and Eggs, with no own unit there; own units never end a Move under an own mark.                                                                                                      | Adequate; it cannot guess who will walk away |
| Ribbit     | First the enemy unit that can kill an own channeller next turn, then the one a Seizure can follow, then the strongest melee unit in reach.                                                                                                                                          | Plays the plain cases                        |
| Switcheroo | Pull a broken enemy next to a Summoner and a holder; else drop an enemy siege or ranged unit beside two own melee units; never moves a channeller.                                                                                                                                  | Misses the clever ones                       |
| Tentacle   | The tile beside the most enemy value whose weakest neighbour is an enemy, with no own unit within 1; enemy siege and ranged units first.                                                                                                                                            | Plays the plain cases                        |
| Behold!    | An Idol Bearer next to two or more channellers that a visible enemy can hit raises its idol instead of channelling.                                                                                                                                                                 | Plays it well                                |
| Pick Me!   | A Chosen next to a channeller, with a hostile melee unit able to reach that channeller, taunts instead of attacking (unless its attack kills).                                                                                                                                      | Plays it well                                |
| Boo!       | A Horror with two or more hostile living units around it and no own living unit around it; or one beside an enemy center whose garrison it can move, with an own capturer able to step on.                                                                                          | Plays the plain cases                        |
| Proclaim   | The Herald's second attack when no second kill is on offer and a hostile city within 3 could train next turn.                                                                                                                                                                       | Plays it well                                |
| Pamphlets  | The ordinary Capture, offered one turn earlier; the village hunt sends Initiates first.                                                                                                                                                                                             | Plays it well                                |
| Anchor     | Always grips an assigned channeller next to the Thing.                                                                                                                                                                                                                              | Plays it well                                |

### 15.5 Against the Cult (every other seat)

- **Hunt the strands.** A visible channeller is a target worth the value of
  the daemon it holds divided by the strands to spare (holding strands −
  Control + 1; a gripped channeller counts its three); any hit counts, so
  a ranged shot on an unwarded channeller outranks an ordinary attack.
  Under a raised idol, the Idol Bearer is hit first (one hit drops the
  ward). A circle's leader and chanters are scored the same way.
- **Stand on the X.** A unit with more than 5 HP (or not living) that can
  end its Move on a visible Great Summoning mark does so, with the
  priority of a kill of the leader.
- **Never stand nearest a daemon about to break.** A unit avoids ending a
  routine Move as the eye-marked target of an Unbound daemon or of a bound
  one short of its Control, as it avoids the Spider today; after a turn
  that broke a strand, units pull back so the channellers are nearest.
- **Step out from under a star.** A unit under a visible Star-fall mark
  steps out when it can.
- **Do not fight the Herald.** Never attack a bound Herald unless the
  attack kills it; spend those units on its channellers. Attack an Unbound
  daemon only when the attacks this turn kill it.

## 16. Worked examples

All with the formula of section 13.2 of the current rules, full-HP units
on open ground unless stated.

### 16.1 The snowball: a bound Herald's turn

The Cult's Herald stands two tiles from a Human line: a Champion in the
open and a Guard on its walled center with a Field Defense (fortification
4). Four Initiates channelled it last turn from 3 tiles behind; two stand
beside an Idol Bearer that raised its idol.

1. **Start Turn:** four holding strands against Control 3: bound.
2. The Herald moves 1 and attacks the Champion: 15 of 15, dead, nothing
   back. Its second attack on the Guard ignores the 4 fortification levels:
   17 of 17, dead, the Field Defense destroyed. **Favour +9** (6 + 3).
3. Four Initiates step up and channel it again; the Idol Bearer raises its
   idol again.
4. Next turn the Herald steps onto the empty center (the city is
   besieged), kills a Fighter that came to retake it (+2), and Proclaims
   the next city within 3; the turn after, it captures the city. A Cult
   that began this turn at 7 Favour is at 18 two turns later.

### 16.2 The counterplay: breaking the strands

The Human answer to 16.1, on its turn: the two unwarded channellers stand
within reach, and every channeller is Candlelit.

- A Marksman shoots channeller A from 2 tiles: 5 of 10. **Broken.**
- A Catapult shoots channeller B from 3 tiles: 9 of 10. **Broken.**
- The two warded channellers stay: the Human could break them only by
  first hitting the Idol Bearer (a Marksman deals it 4 of 16: the idol
  drops) and then hitting each of them.
- The Human melee units step back, so the Herald's nearest units are the
  Initiates within 3.

**Cult Start Turn:** two holding strands against Control 3. **The Herald
is Unbound and Furious.** It rampages at once: an Initiate 10 of 10, dead;
second attack, another, dead. The Cult cannot bind it this turn. After the
round it rampages again in the neutral turn: two more cultists. Only on the
Cult's next turn can three robed cultists within 3 bind it, if any are
left. **That is the spectacular failure, caused by two shots.**

Had the Cult kept its channellers next to the raised idol (all four
warded), the Humans would have needed a third shot on the Idol Bearer
first, or two kills (a Knight on one Initiate, 10 of 10; a Catapult and a
Marksman on another, 9 then 1): a harder turn, never an impossible one.

### 16.3 A circle broken at the last moment

A Summoner and four Initiates begin the Great Summoning beside the
capital, 20 Favour paid. A Human Knight (Move 3) reaches the Summoner:
10 of 10, dead. **The ritual fizzles; 20 Favour is gone.** Had the Knight
reached only a chanter, three chanters would remain and the Herald would
arrive; the Knight, standing next to the circle, would then be the
Herald's nearest enemy. Had a Human Raider ended its Move on the mark
instead (12 HP, not Seizable), the ritual would also have fizzled.

### 16.4 Frog, beat, and Seize: the human sacrifice combo

A Human Knight (13 HP) has charged into the Cult's line. A Hexer frogs it
from 2 tiles (Ribbit). An Initiate hits the frog: 7 of 13, nothing back;
the Knight is at 6, half its HP or less. The Summoner, next to it with the
Initiate as the holder, **Seizes** it: the Knight dies, credited to the
Summoner; **Favour +18**, nearly a Herald. Against a Guard on a walled
center, the same frog lets an Initiate deal 7 instead of 2; a second hit
(8 of the 10 left) takes it to 2, and its Seizure pays 6.

### 16.5 Star-fall on a dug-in line

A Stargazer and three chanters mark a tile among three Human Fighters on
Field Defenses (12 HP each). Next Cult Start Turn the star lands: each
Fighter takes **8** (5 + 3), whatever its fortification, and the three
Field Defenses are destroyed. A Catapult shot on one of them would have
dealt 8 to that one alone. If the Humans had shot the Stargazer (a Marksman
deals 7 of 10), the star would have fizzled. With a Tentacle beside the
mark, the Fighter it grabbed could not have stepped out.

### 16.6 A Horror on one strand

A Summoner and an Initiate summon a Horror (5 Favour); both channel it.
Next turn the Horror kills a Human Knight (13 of 13; Favour +9) and the
Initiate channels it alone, keeping the Summoner free to Sacrifice. A
Human Raider then hits that Initiate (5 of 10) and escapes: the strand
breaks, and at the Cult's Start Turn the Horror, with no strand, is
Unbound and Furious. Its nearest unit is the wounded Initiate (5 HP left):
5 of 5, dead. In the neutral turn it goes for the Summoner. Insurance would
have been one more channeller.

### 16.7 Anchor

A Thing in the Cellar grips one Initiate that channels a Herald: 3
strands, Control 3, one cultist's action. The Thing also attacks every
turn. The Human shoots the Initiate (5 of 10): broken, and all three
strands go with it. The Herald is Unbound; its nearest unit is the Thing
beside it: 21 of 40 (5 back), then its second attack, 19 of 19. The Thing
is dead, and the Herald is loose beside the Cult's line for a round.

### 16.8 A Favour ledger (illustrative, one city to four)

| Round | What the Cult did                                                                    | Favour |
| ----: | ------------------------------------------------------------------------------------ | -----: |
|   1–4 | Gathering (free); Initiates trained; two villages taken by Pamphlets; Leadership     |      0 |
|   5–7 | A Summoner; the capital's Militia (two Initiates) and one more Initiate Sacrificed   |      6 |
|     8 | Summon a Horror (−5)                                                                 |      1 |
|  9–12 | The Horror kills a Raider and a Fighter (+6); a frogged, beaten Marksman Seized (+8) |     15 |
| 13–16 | Two Offerings (+6); Crafting, Warding Circles, The Stars Are Right                   |     21 |
|    17 | Begin the Great Summoning (−20)                                                      |      1 |
|    18 | The Herald arrives                                                                   |      1 |

## 17. Validation

### 17.1 Method

The user asked for a conceptual and qualitative validation, not play.
Every number below was worked by hand through the formula of
[section 13.2 of the current rules](RULESET_7_CURRENT.md#132-damage)
(full-HP units on open ground unless stated, the rounding half up, the
retaliation from base Defense), against the rosters of section 11 of the
current rules. No match was played, simulated, or run in the text
harness. Each question of the bead is answered, and each problem found is
fixed in the sections above and listed in
[section 18](#18-what-validation-changed). The contract step re-runs the
numbers through the engine's combat preview.

### 17.2 (a) The opening, rounds 1 to 10

**What the Cult opens with.** One Initiate and 3 Coins, like everyone. Two
openings, both cheap:

- **The Lodge** (the default): Gathering (free), Initiates every turn the
  capital can train, villages taken on arrival (Pamphlets), Leadership in
  round 3 or 4, a Summoner in round 5, the Militia at level 2 (two
  Initiates), three Sacrifices, **a Horror around round 8**. Hexers follow
  (Hunting, Hexers) by round 10.
- **The Hex** (against a seat whose Raider-role unit is in sight, or a
  Raider faction next door): Hunting (free), Hexers in round 3 or 4, then
  Gathering and Leadership; the Horror comes about two rounds later.

**How it scouts.** The radius-2 start reveal, Initiates walking to
villages, then a Familiar (Scouting, tier 1; or the level-3 Scouts
reward): Sight 2, Move 2, the treasure-chest runner. Scouting is a
weakness before round 6 that Pamphlets pays back: the villages the
Initiates find are theirs a turn sooner.

**How it takes villages.** Initiates, one turn faster than anyone
(Pamphlets). A Familiar may enter a village but must wait a turn like
everyone.

**Against each faction** (the threat in its first ten rounds, and the
answer, in numbers):

| Enemy    | Its early threat                                                                                                                                   | The Cult's answer                                                                                                                                                  | Capital holds?                                                 |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Human    | Fighter (deals an Initiate 5, takes 3); Raider with Raiding charges an Initiate for 9, kills a Hexer, Summoner, or Familiar outright, then Escapes | Initiates in pairs (6 + 6 kills a Raider); a Hexer shot (6) or a frog (a frogged Raider cannot Escape; an Initiate deals it 7); Seize the broken Raider (8 Favour) | Yes, with two Initiates and a Hexer by round 6                 |
| Undead   | Skeleton (even trade, 5 and 5; Bones: a Hexer deals it 4); Ghoul charge 9; Graves from Cult deaths                                                 | Trade Initiates; Sacrifice the doomed (no Grave); a Horror kills a Skeleton (10 of 10). Nothing Undead can be Seized: Favour comes from home                       | Yes; the Undead opening is slow                                |
| Goblin   | Mob: three Goblins with Gang Up 2 kill an Initiate (10 of 10, nothing back); Wolf Rider charge 9; Kaboom 6 on a 3 × 3                              | Every Initiate, Hexer, or Familiar kills a Goblin per attack (6 of 6, nothing back); do not clump (Kaboom); Seize broken Goblins (2 Favour, and no blast)          | Yes if the Cult strikes first; the closest early match-up      |
| Dinosaur | Raptor Pounce kills an Initiate (10 of 10) and grows; Caveman Pack Hunt 7                                                                          | Frog the Raptor, beat it (7 of 12), Seize it (8 Favour, no growth); Hexers behind Initiates; Sacrifice an Initiate a Raptor is about to kill                       | Yes; Raptor raids cost Initiates                               |
| Martian  | Grunt (8 HP and Shield 2, shoots at 2); Saucer (flies 3) dives the back row                                                                        | Initiates trade with Grunts (5, takes 3); a Hexer deals a Saucer 6                                                                                                 | Yes                                                            |
| Ice Folk | Yeti (9 HP; Rockfall from a Mountain); a Sled's Bolas freezes an Initiate; Snow stops Initiates                                                    | Initiates trade with Yetis (5, takes 3); a Hexer frogs the Sled. The danger (Cold Snap on circles) is later                                                        | Yes; the Ice Folk opening is slow                              |
| Dwarf    | Hammerer dug in at home (an Initiate deals it 4, takes 5); Gyrocopter bombs (5)                                                                    | No early war: expand by Pamphlets and build Favour at home                                                                                                         | Easily; taking Dwarf cities waits for Star-fall and the Herald |
| Candy    | A Rushed Toffee Trooper deals an Initiate 9 and sticks it; a Donut Racer charges for 9                                                             | Initiates in pairs; Seize a Crashed unit at 5 HP or less; a Hexer frogs a Bunny                                                                                    | Yes, in pairs                                                  |

**The rush tests.**

- **Raider rush** (a Human seat with Raiding, two Raiders by round 6): a
  charge leaves an Initiate on the capital at 1, and the Raider Escapes
  out of reach of Move-1 Initiates. A Raider cannot capture while an
  Initiate stands on the center; when it kills one and steps on, two
  Initiates beside the center kill it (6 + 6). Without a Hexer the Cult
  bleeds an Initiate a turn and cannot train while the center is
  occupied; with one Hexer (6 a shot at range 2) or a frog (no Escape for a
  frog) the Raiders die. The capital holds; the Cult must have Hexers by
  round 6 against a Raider seat, which is why the AI's research takes them
  first when a Raider-role unit is seen (15.1).
- **Wolf Rider rush:** the same numbers (a charge deals 9; an Initiate
  deals it 6, takes 2; two Initiates kill it, 6 then 4). The Wolf Rider
  has no Escape: the pair always gets its answer. Holds.
- **Goblin mob** (four Goblins and a Warboss by round 6): a Kaboom beside a
  pair deals each Initiate 6 (4 left), and a three-Goblin Gang Up kills an
  Initiate. But every Cult attack kills a Goblin with nothing back, so
  three Initiates and a Hexer kill four Goblins in a turn. A mob that
  strikes first trades one Goblin (1 Coin) for one Initiate (2 Coins) a
  turn; a Cult that strikes first wins. Holds, narrowly; Boo! and
  Star-fall make the later game clearly the Cult's.

### 17.3 (b) The first enemy Fighter

**Is the starting Initiate wiped out by it?** One on one, over two turns,
yes, like any weak opener:

- The Fighter attacks the Initiate: deals 5 (5 left), takes 3 (9 left).
- Its second attack, at 9 of 12 HP: deals 5, the Initiate is dead.
- If the Initiate attacks first: deals 5 (7 left), takes 5 (5 left); its
  next attack at half HP deals 6 (1 left) and takes 3.

But the Fighter arrives in round 5 to 8, and by then the Cult has two to
four Initiates: two of them leave it at 1 HP in one turn (5, then 6 on the
7 left, taking 5 and 3), and a third Initiate or a Seizure of the wreck (4
Favour) finishes it. A frog makes it cleaner: an Initiate deals the frog 7
(5 left, nothing back), and it is Seized at once.

**A Hexer** is not wiped out either:

- The Hexer shoots first from 2 tiles: 5 (7 left), nothing back.
- The Fighter walks up and attacks it: deals 5 (4 left), takes 2 (5 left).
- The Hexer shoots again at 4 of 9 HP: 5, the Fighter is dead.
- If the Fighter reaches the Hexer first: 6 (3 left), takes 2; the Hexer
  then frogs it (no attack next turn) and the Initiates finish it.

So neither is wiped out by the first Fighter when played as a pair, and
the Hexer wins its duel outright when it shoots first. **The real danger
is the first Raider-role unit with Charge** (9 on an Initiate, 9 of 9 on a
Hexer, 10 of 10 on a Summoner) and later the Knight, which kills every
robed cultist but the Chosen and the Idol Bearer in one blow; that is
counterplay by design, answered by pairs, frogs, and the Chosen's taunt.

### 17.4 (c) Taking cities

**Early** (rounds 8 to 14, Initiates, Hexers, a Summoner, maybe a Horror):

- A Fighter on a capital without Walls (fortification 0, or 2 with a
  Human Field Defense): Initiates deal it 5 (3 on the Field Defense) and
  take 5: a bad trade. The Cult way: the Hexer frogs the garrison
  (Defense 0.5, no fortification), an Initiate hits it for 7 (5 left), the
  Summoner Seizes it with the Initiate holding (4 Favour); the center is
  empty; a second Initiate walks on and captures next turn if it lives
  (it has 10 HP and no fortification on a foreign center). Three units
  and two tier-2 technologies.
- A Horror on a walled center: it deals a Fighter there 9 of 12 (7 with a
  Field Defense) and takes 3; a frog plus the Horror kills anything.
- **Not** by Switcheroo: a swap never touches a settlement center, so a
  Familiar cannot steal a capital by swapping onto it.

**Late** (rounds 15 and on):

- **Walled cities** (a Guard on a walled center with a Field Defense,
  fortification 4): the Herald kills it in one attack (17 of 17), Proclaims
  the city so nothing is trained there, and steps on. Star-fall with three
  chanters deals 8 to every unit on the center and the eight tiles around
  it, ignoring Walls, and destroys the Field Defense. Breach (The Stars Are
  Right) lets a Chosen deal that Guard 8 instead of 5, an Initiate a
  walled Fighter 5 instead of 2.
- **Dwarf Dig In and Barricades:** the Herald and Star-fall ignore Dig In
  (the Herald deals a dug-in Hammerer 12 of 12); a Horror deals a dug-in
  Hammerer 10 (8 on a walled center). Star-fall destroys every Barricade
  in its area; the Herald breaks one with one attack (10 of 10). The
  **Steam Tank** is the hard nut: Plated caps the Herald and Star-fall at
  4 a hit. The answer is the frog: a frogged Tank takes 4 from each
  Initiate, is at 8 (half) after two, and is Seized for 18 Favour.
- **Ice Folk on ice and Snow:** the ice and Snow cover (× 1.25) still
  count against the Herald, which kills a Yeti on Snow anyway (9 of 9);
  the Blizzard's halving never applies (the Herald attacks from next to
  its target; Star-fall is fixed damage). Deep snow stops cultists, not
  daemons (walkers). The counter-threat is real: a Witch's Cold Snap
  breaks a whole circle beside her, a Frozen Thing loses its grip.
- **Candy:** a Marshmallow bounces a Horror (not the Herald); a
  Jawbreaker's Toothache and Sticky Toffee do not stick to the Herald; a
  Confectioner re-bakes garrisons from Crumbs, and the Herald's kills leave
  Crumbs, so a Seizure or a frog-and-Seize (no Crumbs) is the clean kill
  at a Candy gate.

### 17.5 (d) Cheese hunt

Every way found for a Cult to become unbeatable even against
overwhelming forces, and how each is closed. "Kept" says what of the
swing stays: none of the fixes is a stat dampener or a cap (variance rules
2 and 3), and two of them make failures worse.

| #   | Cheese                                                                   | How it would work                                                                                                                          | Closed by                                                                                                                                                                                                                                                                                                                                                                                    | Kept                                                                                       |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | **Strand redundancy** (eight channellers on one Herald)                  | The enemy must break strands − 2 in one turn                                                                                               | **Not cheese, no fix.** Each strand is a cultist's whole turn; eight channellers leave the Herald alone at the front, where an overwhelming army kills it by attrition (about 60 HP of attacks: one turn of four Catapults, three Knights, and two Marksmen)                                                                                                                                 | Any number of strands                                                                      |
| 2   | **Chain-binding** (a daemon or a Thing as a channeller)                  | Daemons holding daemons, beyond reach                                                                                                      | Only robed cultists channel (6.2); the Thing only grips a robed cultist beside it (8.4); one strand per cultist per turn                                                                                                                                                                                                                                                                     | Any number of daemons                                                                      |
| 3   | **Ward stacking**                                                        | Every channeller warded: the enemy must kill instead of hit                                                                                | Behold! is an **action** of the Idol Bearer (no channel that turn), never stacks, and **drops when the Idol Bearer is disrupted**: one hit on it (a Marksman deals it 4) and the channellers are ordinary again                                                                                                                                                                              | A warded circle costs the enemy one more hit, in the right order                           |
| 4   | **Anchor + Ward + over-channelling**                                     | Several Things each adding two unbreakable strands, plus warded Initiates: the enemy had to kill every robed channeller                    | Anchor is a **grip**: the Thing triples one adjacent channeller's strand, and all three go when that cultist is disrupted (or one stays if only the Thing is moved or frozen). Several Things add no resilience                                                                                                                                                                              | One Initiate can hold a Herald, at the risk of one hit                                     |
| 5   | **Channellers hidden in fog**                                            | Three tiles behind a Herald, out of Sight-1 enemies' view, so no attack can target them                                                    | **Candlelit:** every channeller, gripping Thing, and ritual participant is visible to every player who has explored its tile                                                                                                                                                                                                                                                                 | The leash of 3                                                                             |
| 6   | **Channellers behind the Herald, in cities, behind Barricades or water** | Out of reach of melee                                                                                                                      | **Not cheese, no fix.** Range 2–3 shooters, bombs, flyers, Plague, Wail, Freeze, and ships reach them; Walls do not stop an HP loss; the Cult cannot build Barricades (Star-fall destroys them); a Herald tethered across water to its channellers cannot advance, so it defends a shore and conquers nothing                                                                                | Terrain play                                                                               |
| 7   | **Break-and-rebind** (the daemon always leads)                           | A broken Herald rampaged into the enemy at the check and was rebound in the same turn: the break cost the Cult almost nothing              | **Furious:** a daemon cannot be bound again in the turn it broke, so every break means two rampages (at the check and in the neutral turn) before anyone can bind it, and the enemy pulls back so cultists are nearest                                                                                                                                                                       | Failures are now worse, as rule 4 wants                                                    |
| 8   | **Sacrifice loops**                                                      | Coins → Favour → daemons → Favour                                                                                                          | **Not cheese, no fix.** Every Sacrifice is a Summoner's action and a city action's unit; with Arms Industry a 1-Coin Initiate pays 2 Favour, a snowball the variance rules accept (rule 5); a Thing pays 12 (one per city level from 5)                                                                                                                                                      | The snowball                                                                               |
| 9   | **Frog-and-Seize at full HP**                                            | Ribbit and Seize in the same turn: any one-slot living enemy, a garrison or a full Knight, dies with no damage dealt and no turn to answer | A frog is Seizable only at **half its maximum HP or less**; the frog's Defense 0.5 makes the beating quick (an Initiate deals a frogged Knight 7 of 13)                                                                                                                                                                                                                                      | Double Favour, frog combos, no cap per Seizure                                             |
| 10  | **Offering loops** (with Population Boom)                                | Once a city's population was negative, its income sat at the floor of 1 and every further Offering was free: 3 Favour a city a turn        | An Offering needs **population 2 or more** and never takes it below 0; Population Boom's +3 buys exactly one Offering                                                                                                                                                                                                                                                                        | 3 Favour for 2 real population                                                             |
| 11  | **Summon, release, and kill**                                            | Summon a Horror (5), let it go, kill it with the Herald (+6 Favour, +12 score)                                                             | A daemon or Tentacle kill pays no Favour (8.3); the summoning seat gets no Kills for its own former daemon (6.4)                                                                                                                                                                                                                                                                             | Daemons feed on everything else                                                            |
| 12  | **Unbound weaponised** (summon next to an enemy and let it go)           | A free neutral monster in the enemy's army                                                                                                 | **Not cheese, no fix.** A fresh Horror's nearest unit is the Summoner next to it (ties go to the Cult); a bound daemon walked into the enemy and let go is the designed "release" (6.5), costs the Cult that daemon, its kills pay nobody, it is Furious for a round, and it never heals: an overwhelming army kills it (a Horror in one turn of two Knights; a Herald in one turn of focus) | Release on purpose                                                                         |
| 13  | **Frog lock chains**                                                     | Two Hexers alternate on one enemy so it is never un-frogged                                                                                | **Not cheese, no fix.** It costs two Hexers' actions forever for one enemy unit; the frog still hops, blocks, and exerts ZOC, giants and two-slot units are immune, a healer cures it, and a 9-HP Hexer dies to a Raider's charge                                                                                                                                                            | No immunity, as for Freeze                                                                 |
| 14  | **Switcheroo theft**                                                     | Swap onto an enemy center from 2 tiles, survive one turn (8 HP; a Fighter deals 6), capture a capital in round 6                           | **Neither tile of a swap may be a settlement center**                                                                                                                                                                                                                                                                                                                                        | Every other swap; Boo! still clears a center, but an own unit must walk on and live a turn |
| 15  | **Switcheroo on giants**                                                 | Steal or displace a giant                                                                                                                  | Giants, two-slot units, Eggs, neutrals, and daemons are never swapped                                                                                                                                                                                                                                                                                                                        | —                                                                                          |
| 16  | **The Herald eating giants on arrival**                                  | Mark an enemy giant's tile: it is consumed for 24 Favour, more than the Herald cost; or mark a garrison's center and delete it             | Only a legal victim is consumed (own Sacrifice-able, or a Seizable enemy at 5 HP or less); any other occupant **blocks the arrival and fizzles the ritual**                                                                                                                                                                                                                                  | A new counterplay: stand on the X                                                          |
| 17  | **Favour from neutrals**                                                 | Farm the Spider, camps, Bigfoot                                                                                                            | **Not cheese, no fix.** One danger per board, never respawning: a one-off 3 to 12 Favour each. Unbound daemons and Tentacles never pay (11)                                                                                                                                                                                                                                                  | Daemons feed on monsters                                                                   |
| 18  | **The AI's inability to answer**                                         | A Cult that the AI never hunts                                                                                                             | Every threat is public (Favour, strands, grips, marks, eye marks, Candlelit cultists); bead A4 teaches every seat to hunt strands, hit a raised Idol Bearer first, stand on the X, avoid eye marks, and leave a bound Herald alone; the faction is not offered in the browser until it lands                                                                                                 | The AI plays the plain answers; a human plays the clever ones                              |
| 19  | **Pick Me! walls**                                                       | Chosen next to every channeller: no enemy can hit a channeller                                                                             | It binds only the targeted `ATTACK` of units **next to** the Chosen; shooters at 2 or more, area hits, statuses, and Mind Control are free                                                                                                                                                                                                                                                   | A taunt that matters in melee                                                              |
| 20  | **Perfection last round**                                                | In round 30 no check will come: skip channelling and attack with everyone                                                                  | **Not cheese, no fix.** Every faction has a last turn without consequences; it adds a few Kills                                                                                                                                                                                                                                                                                              | —                                                                                          |

**Overwhelming forces have a real path in every case:** break the
channels (one hit per unwarded channeller, two for a warded one, one for a
gripped one), stand on the X, kill the Herald by attrition in about one
turn of a big army (it never heals), or ignore the tethered Herald and
take the Cult's cities: a bound Herald ends every Cult turn within 3 of
its channellers or breaks, so it cannot chase a raid on a far city, and a
Cult with no cities is eliminated, its daemons Unbound.

### 17.6 (e) Every technology

| Technology (Cult name)           | Verdict   | Why                                                                                                                                        |
| -------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Gathering                        | useful    | The free opener of the Lodge; the road to Leadership                                                                                       |
| Farming (Harvest Rites)          | useful    | Farms, and the Offering: Favour without Coins                                                                                              |
| Milling                          | useful    | The Windmill heals cultists 6 a turn (after the check); the only healing the faction has                                                   |
| Administration (Leadership)      | essential | The Summoner: Sacrifice, Seize, Horrors                                                                                                    |
| Planning (Land Grants)           | useful    | +1 unit in every city: one more channeller; Land Grants for score                                                                          |
| Hunting                          | useful    | The free opener of the Hex; the road to Hexers                                                                                             |
| Forestry                         | useful    | Forest cover for cultists (fewer kills), Lumber Camps; the road to Stargazers                                                              |
| Sawmilling (Stargazers)          | useful    | Star-fall: the siege and crowd answer, Barricade breaker                                                                                   |
| Marksmanship (Hexers)            | essential | The anti-rush unit, Ribbit, the Seizure combo                                                                                              |
| Fieldcraft (Pathfinding)         | useful    | Hexer Sight 2 (it sees its own Ribbit range); Forest march for slow cultists                                                               |
| Scouting (Familiars)             | useful    | The scout, the chest runner, and Switcheroo                                                                                                |
| Roads                            | useful    | Moves Move-1 channellers to the front; Road population                                                                                     |
| Commerce                         | useful    | Trade income; Hire at a Market buys bodies (more Sacrifices, more channellers)                                                             |
| Raiding                          | useful    | Pillage and the Familiar's Charge (was dead weight in the first draft once Switcheroo moved to Scouting; fixed); the road to Callers       |
| Chivalry (Callers)               | useful    | The Tentacle kills exposed shooters, the main threat to the channel                                                                        |
| Drill (Crafting)                 | useful    | Workshop, Spoils; the root of Warding Circles and the Chosen                                                                               |
| Engineering                      | useful    | Mountains for cultists (cover 1.5 means fewer kills), Mines; the road to the Chosen                                                        |
| Metallurgy (the Chosen)          | useful    | The heavy body that taunts melee away from the circle; Arms Industry (cheaper Initiates)                                                   |
| Fortification (Warding Circles)  | essential | The Idol Bearer and Behold!; the prerequisite of the Herald                                                                                |
| Explosives (The Stars Are Right) | essential | The Great Summoning; Breach for cultists at walled cities                                                                                  |
| Shorecraft (Sailing)             | useful    | Ports, fish; boats carry a Summoner and three chanters to another island, where the Herald is summoned on the beach (daemons never embark) |
| Navigation                       | useful    | Deep Water for that landing party; sea trade                                                                                               |
| Seamanship (Boarding)            | useful    | Ram and Board, as for every seafaring faction                                                                                              |
| Naval Engineering (Shipbuilding) | useful    | Battleships: the Cult's only answer at sea, where daemons never go                                                                         |
| Submersibles                     | useful    | Submarines, Harbours                                                                                                                       |

No node is dead weight. The only one that was (Raiding, once the swap
moved to the Familiar's own technology) now gives the Familiar the
Charge every other fast unit gets. On water maps the Cult's daemons are
confined to the landmass they are summoned on, so the Naval branch is how
the Ancient Ones cross the sea: by a landing party and a ritual.

### 17.7 (f) Win paths and loss paths

**Against an aggressive early rush** (Human Raiders and Knights, a Goblin
mob, Dinosaur Raptors, Candy Rushes):

- **How the Cult wins:** pairs of Initiates and a Hexer by round 6 hold
  the capital; frogs stop the chargers, and broken raiders are Seized at
  double value (a Raider 8, a Knight 18), which buys a Horror in round 8 to
  10; the Horror kills a unit a turn and pays Favour for each, and the
  counter-push takes the rusher's villages with Pamphlets.
- **How it loses:** a Raider or Knight kills the Summoner (10 HP; 10 of 10
  from a charge) before the first Horror, and the Favour engine never
  starts; or the lone channeller of the first Horror is hit and the Horror
  eats the Cult's own back row for a round (Furious); or the Cult
  Sacrifices too many bodies and the capital's center is empty when the
  mob arrives.

**Against a turtle** (Dwarves dug in behind Barricades, Humans on Walls
and Field Defense, Ice Folk on Snow):

- **How the Cult wins:** a turtle feeds no Seizures but cannot stop
  Favour from home (Sacrifices, Offerings); the Great Summoning happens
  out of the turtle's reach; Star-fall, the Herald (fortification
  ignored), Breach, and Proclaim crack one city at a time. Against a
  turtle the Cult is the favourite late.
- **How it loses:** the turtle's reach breaks the Herald's channel at its
  gates over and over (Catapults and Steam Cannons at 3, Gyrocopter bombs,
  a Witch's Cold Snap), each break a Furious round among the Cult's own
  cultists; Plated Steam Tanks soak the Herald; meanwhile the turtle grows
  and out-researches a Cult that spends population on Offerings and units
  on Sacrifices.

**In Perfection** (30 rounds, the score decides):

- **How the Cult wins:** war pays score twice over: kills by bound daemons
  are Kills (2 a Coin of victim) and Favour; a bound Herald is 24 Army
  value; Pamphlets expand fast (territory, levels). The Cult's best
  Perfection game is a Herald by round 18 and a conquest after it.
- **How it loses:** Favour is not scored, so every Sacrifice lowers Army
  and every Offering delays a city level (−10 a level) for points that
  only exist if the daemons then kill; a Herald that breaks costs its
  Army value, the seat's flawless glow, and the HP of its rampage's
  victims (Damage taken and Losses). A peaceful builder on a big board can
  out-score a Cult whose rituals were broken.

Both sides have realistic means and real risks; the balance is not
perfect, and the variance rules say it should not be.

### 17.8 (g) Consistency with the current rules and nine seats

Every interaction is ruled in [section 13.1](#131-faction-rules-and-other-systems);
the checks that found something:

| Rule checked                            | Finding                                                                                                                                                                                                                       | Ruling                                                                                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Freeze (section 21)                     | A neutral unit cannot be Frozen (state parsing rejects it); the draft let a Frozen Horror go Unbound with its entry                                                                                                           | Becoming Unbound clears every status                                                                                         |
| Candy statuses (section 23.7)           | The draft called Stuck a "no-action" status; it is not, and Toothache and Splat were unnamed                                                                                                                                  | Any status another seat puts on a cultist disrupts it ("Frozen and the like")                                                |
| Candy Frosting                          | Gone since the Candy redesign                                                                                                                                                                                                 | Top-Up cures a frog                                                                                                          |
| Barricades and Whirl (section 22)       | A Whirl never touches a Barricade but hits a whole circle                                                                                                                                                                     | Added to 13.1; the Herald breaks a Barricade in one attack                                                                   |
| Berserk and death blasts (section 18)   | A Seized exploding unit must not explode (it is a removal); the word "berserk"                                                                                                                                                | Removal, no blast; "Unbound" in every text                                                                                   |
| Giants (`RULESET_7_GIANTS.md`)          | Swallow takes units of 12 HP or less, so a cultist                                                                                                                                                                            | A swallowed cultist is off the board: broken                                                                                 |
| Any-unit capture (`pulp_wars-ke95`)     | The Stargazer and the Thing capture; daemons capture while bound                                                                                                                                                              | Kept; Pamphlets is the one faster capture                                                                                    |
| Reward ladder (section 4.8)             | Militia two Initiates needs `MILITIA_FIGHTERS_V7` 2 for `CULT`                                                                                                                                                                | Bead E1                                                                                                                      |
| Score (`RULESET_7_SCORE_AND_STARS.md`)  | An Unbound daemon leaves the seat's control without dying                                                                                                                                                                     | Not a Loss; ends Flawless; no Kills for the summoner's own former daemon                                                     |
| Curiosities round 2 (shipped at `7r66`) | The draft let a rampage target a camp guard while also excluding "wild things"; the Wishing Well's full heal; gates                                                                                                           | A rampage never targets a neutral unit; daemons never toss a Coin; bound daemons gate like any unit, rampages never          |
| Neutral-unit registry (`monsters`)      | Unbound daemons and Tentacles must act in the neutral turn                                                                                                                                                                    | Breeds `HORROR`, `HERALD`, `TENTACLE` in the registry; no bounty                                                             |
| Mind Control (section 20.8)             | A controlled Summoner could Sacrifice for a Martian seat that has no Favour                                                                                                                                                   | Favour and channel abilities need a Cult seat; unit tricks follow the unit                                                   |
| Nine seats: seat count (section 2.1)    | `F` becomes 9: matches of 2 to 9 players, `aiCount` 1 to 8                                                                                                                                                                    | Bead E1 (headless) and U4 (setup screen)                                                                                     |
| Nine seats: colour                      | Nine player colours already exist (`PLAYER_COLORS_V7`, CORAL to AMBER, "never fewer than F"); owner colours are the factions'                                                                                                 | The Cult's own colour `#00ff78`, after the capture check (ART1)                                                              |
| Nine seats: map-scale rows              | `P(w, type)` reaches 9 on 11 × 11 Dry Land, every 14 × 14 type but Archipelago (8), every 16, 20, and 25 cell; it stays below 9 on 11 × 11 Pangea (8), Continents (6), Lakes (2), Archipelago (4) and 14 × 14 Archipelago (8) | Those cells allow up to their `P`; `autoBoardSizeV7` is 25 for 8 and 9 seats (20 × 20 gives 44 tiles a seat for 9, under 56) |
| Nine seats: the disruption window       | With nine seats there are eight enemy turns and a neutral turn between two checks                                                                                                                                             | More chances to break a strand; no change (rule 6 only restores counterplay)                                                 |

## 18. What validation changed

| #   | Change                                                                                                                               | Sections       | Reason                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------- | ---------------------------------------------------------------------------------------- |
| 1   | The user's answers applied: Favour, Active Channel, any HP loss or enemy status breaks, no Herald area attack, the names, nine seats | throughout, 20 | The user's decisions of 2026-10-09                                                       |
| 2   | A wacky ability on every unit and summon: Pamphlets, Behold!, Pick Me!, Boo!, Proclaim, Grab, and Switcheroo at Scouting             | 4.4, 8, 9      | The user's request                                                                       |
| 3   | Ward became **Behold!**, an action that drops when the Idol Bearer is disrupted                                                      | 8.1            | Ward stacking (cheese 3); the design principles prefer actions to auras                  |
| 4   | Anchor became a **grip** that triples one channeller's strand                                                                        | 8.4, 6.2       | Several Things made a Herald all but unbreakable (cheese 4)                              |
| 5   | **Candlelit** channellers and participants                                                                                           | 6.2, 7.1       | Channellers hidden in fog (cheese 5)                                                     |
| 6   | **Furious:** no rebinding in the turn of the break                                                                                   | 6.5            | A break cost the Cult almost nothing when the daemon led (cheese 7); makes failure worse |
| 7   | A frog is Seizable only at half HP or less                                                                                           | 5.2            | Instant kill at full HP with no counterplay (cheese 9)                                   |
| 8   | An Offering needs population 2 or more                                                                                               | 5.3            | Free Favour once income hit its floor (cheese 10)                                        |
| 9   | No Favour for killing daemons or Tentacles; no Kills for an own former daemon                                                        | 3, 6.4, 8.3    | Summon-release-kill loop (cheese 11)                                                     |
| 10  | The Herald consumes only a legal victim; any other occupant fizzles the ritual                                                       | 7.3            | Eating giants for profit and deleting garrisons (cheese 16)                              |
| 11  | Switcheroo never involves a settlement center                                                                                        | 9.2            | Capital theft (cheese 14)                                                                |
| 12  | Switcheroo moved to Scouting; Raiding gives the Familiar Charge                                                                      | 4.1, 9.2, 11   | A trick from the start; Raiding would have been dead weight                              |
| 13  | Martyr does not pay for a Sacrifice, consumption, or a wild unit's kill                                                              | 8.2            | Rule 4: no reward for a failure                                                          |
| 14  | Rampages never target neutral units; Unbound clears statuses; daemons and Tentacles are neutral breeds                               | 6.4, 9.3, 13.1 | Consistency with curiosities round 2 and Freeze (17.8)                                   |
| 15  | Unbound ends Flawless; a mind-controlled cultist keeps only unit tricks                                                              | 13.1           | Consistency with the score and Mind Control (17.8)                                       |
| 16  | The AI joins the army policy from its first bead and uses the other factions' lessons                                                | 15             | The Candy drag; the Knight-ride, weak-link, mob, and shooter lessons                     |
| 17  | The bead list follows the standing no-simulation rule                                                                                | 19             | The user's rule of 2026-10-09                                                            |

## 19. Implementation beads

To be filed under epic `pulp_wars-mch9` and implemented **after all other
queued work** (the user's direction). **Validation for every bead** follows
the standing user rule: focused unit tests of the changed code on
**hand-built states**, plus `npm run format:check`, `npm run lint`,
`npm run typecheck`, and `npm run build`. No bead plays or adds a whole
match: no `npm run check`, no full `npm test`, no
`npm run validate:ruleset6-release`, no browser smoke that plays a match,
no `play-text` run, no `runAiMatchV7`. Where the profile table of the
project instructions names one of those gates, the bead records the skip.
Every engine bead bumps the ruleset identity once and adds its own
text-harness lines and previews.

| Bead     | Scope (one line)                                                                                                                                                                                                                                               | Profile              | Depends on               |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------ |
| **E1**   | `CULT` registration: ninth faction ID, nine land roles and the three summoned role IDs, numbers, tree and display names, start, Militia (2), Scouts, giant, chest units; `F` = 9 (2–9 seats, nine-seat size rows, auto size 25); hidden from the browser setup | `ai/map/persistence` | —                        |
| **E2**   | Favour state and view; `SACRIFICE`, `SEIZE` (the broken test), `OFFERING` (`offeredPopulation`, the floor); cause `SACRIFICED`; Martyr; Score and Flawless hooks; previews                                                                                     | `ai/map/persistence` | E1                       |
| **E3**   | `SUMMON` and the Horror; `CHANNEL`; the disrupted flag from every damage, displacement, status, and ownership path; Candlelit; the Start Turn check; `BEHOLD`; `ANCHOR`; `BOO`; `previewChannelV7`                                                             | `ai/map/persistence` | E2                       |
| **E4**   | Unbound: owner to neutral, breeds `HORROR` and `HERALD` in the neutral registry, the rampage at the check and in the neutral turn, Furious, Bind again, daemon-kill Favour and Score rules, `previewRampageV7` and the eye mark                                | `ai/map/persistence` | E3                       |
| **E5**   | Rituals: the frame and Candlelit participants, Star-fall (Barricades), the Great Summoning (consume or block), the Herald (Ravage, Unstoppable and its immunities, `PROCLAIM` and Cowed)                                                                       | `ai/map/persistence` | E4                       |
| **E6**   | Hexes and tricks: `RIBBIT` and the frog, `SWITCHEROO` (no centers), `TENTACLE` (neutral breed, Grab), Pamphlets, `PICK_ME`; the hand-play lab `LAB_CULT_MID` (built, not run)                                                                                  | `engine/rules`       | E5                       |
| **A1**   | The Cult seat on the army policy: `ARMY_PLAY_FACTIONS_V7`, research order, shares, rewards, bodies first, weak links and spacing, contact with company, the back row out of reach                                                                              | `ai/map/persistence` | E1                       |
| **A2**   | Channel first (15.2), summon only what it can hold (15.3), Sacrifice, Seize, Offering, Anchor, Behold!                                                                                                                                                         | `ai/map/persistence` | A1, E4                   |
| **A3**   | Rituals and tricks: the Great Summoning, Star-fall, the Herald and Proclaim, Ribbit, Switcheroo, Tentacle, Boo!, Pick Me!, Pamphlets                                                                                                                           | `ai/map/persistence` | A2, E6                   |
| **A4**   | Every seat against the Cult: hunt the strands (idol first), stand on the X, avoid eye marks, step out from under a star, leave a bound Herald alone                                                                                                            | `ai/map/persistence` | E5                       |
| **ART1** | The Cult's art-direction fragment under [the faction art layer](../art/factions/README.md) from [its template](../art/factions/FACTION_TEMPLATE.md), and the `#00ff78` colour capture, for the user's approval                                                 | `docs/tracker`       | the user's art direction |
| **ART2** | PixelLab sample by checked-in script: Initiate, Horror, Herald, reviewed at native and enlarged scale; adds its `art:*review` command                                                                                                                          | `asset-only`         | ART1 approved            |
| **ART3** | Batches: the other units, the Thing, the Tentacle, the ships in Cult style, the frog overlay                                                                                                                                                                   | `asset-only`         | ART2                     |
| **ART4** | City and buildings, portraits, the Cult technology icons, and the effect icons (Favour candle, strand, eye, idol ring, ritual ring, Pick Me!, Boo!, Cowed, Grab, Pamphlets)                                                                                    | `asset-only`         | ART2                     |
| **U1**   | Favour in the HUD and the leaderboard; Sacrifice, Seize, Offering targeting and labels; the Pamphlets capture cue                                                                                                                                              | `ui/presentation`    | E2                       |
| **U2**   | The channel: strands, Control pips, Candlelit candles, grips, the End Turn confirmation, eye marks, Unbound and Furious cues, Behold! rings, Boo!                                                                                                              | `ui/presentation`    | E4, U1                   |
| **U3**   | Rituals, hexes, and tricks: rings, countdowns, marks, the frog, Switcheroo ghosts, Tentacle and Grab, Proclaim and Cowed, Pick Me!; Help, glossary, sounds, theme music                                                                                        | `ui/presentation`    | E6, U2                   |
| **U4**   | Nine seats and the Cult in the setup screen (eight opponents) and a nine-row leaderboard; the Cult offered once A1 to A4, U1 to U3, and ART3 and ART4 are done                                                                                                 | `ui/presentation`    | A4, U3, ART4             |
| **D1**   | Fold into the current rules as a new faction section (and section 2.1's nine seats), the Cult entry of `NORMAL_AI.md`, and the history of this spec                                                                                                            | `docs/tracker`       | every bead above         |

A hand-play fairness check against [the variance rules](#2-the-variance-rules)
with the lab is **not filed**: it runs only if the user asks for it.

## 20. Decisions and open questions

**The user's decisions (2026-10-09)**, applied above:

1. **Favour** is the economy (section 3).
2. **Any HP loss, or being Frozen and the like, breaks a strand**: the
   disrupted rule of section 6.2, with every enemy status as "the like".
3. **No area attack for the Herald**: its wacky ability is Proclaim, which
   touches no unit.
4. **"Sacrifice" and "Seize"** are the words on the buttons.
5. **Nine-player games are allowed** (section 17.8, bead E1).
6. **Wacky abilities on every unit and summon** (section 4.4).
7. **Validate before implementing** (section 17); implement after all
   other queued work; a baseline AI by judgement (section 15).

**Decided by the root in this revision** (section 18), each within the
variance rules: Behold!, the grip, Candlelit, Furious, the frog's half-HP
Seizure, the Offering floor, no Favour for daemon kills, consume or block,
no swaps on centers, Switcheroo at Scouting.

**Open:** none that blocks the engine. The art beads wait for the user's
approval of the faction's art direction (ART1), which also settles the
colour capture.

## Appendix A. The proposal's fifteen decisions, answered

| #   | The proposal's question                         | Answer under the 2026-10-09 direction                                                                                                                                                        |
| --- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Which shape?                                    | Neither the blend nor the purer shapes: **daemons on a channel**, with sacrifice and Favour as the economy and three multi-cultist rites (section 1).                                        |
| 2   | A resource of its own?                          | **Yes: Favour**, the one special economic mechanic, uncapped and public (section 3; the alternatives in 12.1).                                                                               |
| 3   | Can a wild thing capture or besiege?            | An Unbound daemon or a Tentacle: **no**, never stands on a center. A **bound** daemon: **yes**, like every land unit (the snowball).                                                         |
| 4   | Mind Control, bites, Infect on summoned things? | **No to all.** Daemons are not living and are immune to Mind Control; the Martian and Undead answers go through the channellers.                                                             |
| 5   | How many at once?                               | **No limit** (variance rule 3): Favour and channellers are the only limits. One Tentacle per Caller (the spell's shape).                                                                     |
| 6   | Who may be sacrificed, and the last unit?       | **Any own unit** except daemons, Eggs, and Plagued or Bitten units, the last unit included; enemies by **Seize** (living, broken: 5 HP or less, or a frog at half HP, held by two cultists). |
| 7   | Familiar capture after Switcheroo?              | **No longer reachable**: a swap never touches a settlement center (section 9.2).                                                                                                             |
| 8   | How easily is a controller distracted?          | **Any HP loss**, a shove, an enemy status, a capture: the one disruption rule (section 6.2); Behold! is the exception for HP loss.                                                           |
| 9   | Let a daemon loose on purpose?                  | **Yes**: stop channelling it; it is Unbound at your next Start Turn and Furious for that turn. The AI does it only when it cannot hold one (section 15.2).                                   |
| 10  | Is the Great Summoning's monster uncontrolled?  | **No: the Herald is bound** by three channellers; it is uncontrolled only when the upkeep fails. The Tentacle stays wild from birth.                                                         |
| 11  | Rain of Fish?                                   | **Cut**: the Cult has one economic mechanic. The Offering takes its place and goes the other way.                                                                                            |
| 12  | Field Defense?                                  | **No**; Fortification is Warding Circles (the Idol Bearer and Behold!).                                                                                                                      |
| 13  | The colour?                                     | **Eldritch green `#00ff78`**, after the capture check (bead ART1).                                                                                                                           |
| 14  | The name and the words?                         | **Cultists** (`CULT`); **Sacrifice** and **Seize** on the buttons (the user's words, confirmed); Unbound, not berserk (section 14.1).                                                        |
| 15  | Nine players?                                   | **Allowed** (the user, 2026-10-09); bead E1 adds the nine-seat rows and U4 the setup screen.                                                                                                 |
