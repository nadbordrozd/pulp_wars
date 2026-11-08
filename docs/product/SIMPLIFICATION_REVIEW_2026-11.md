# Simplification review: one tile, one meaning (2026-11)

> **Status** (2026-11-08). The user's direction: "I don't mean to change
> the UI of choosing alternative actions targeting the same tile. I mean
> to change the game mechanics so that it is unnecessary," and "Implement
> all the recommendations 1 to 11 except number 9."
>
> - **Done in `7r129`** (`pulp_wars-ev6q`): finding 2 (the Steam Mole
>   tunnels 2 or 3 tiles), finding 7 for the Ice Witch (her Frost Bolt
>   flies exactly 2 tiles), and finding 8 (the Brain has no attack).
> - **Done in `7r130`** (`pulp_wars-n5fa`): finding 1 (the Summoner has no
>   attack, Seize is its attack, and its Tentacle rises 2 or 3 tiles
>   away), finding 3 (no Ribbit command: the Hexer's attack frogs a target
>   it leaves alive, at Attack 1), and finding 13 (Switcheroo reaches 2 to
>   4 tiles).
> - **Done in `7r131`** (`pulp_wars-3u8d`): finding 7 for the Sled (its
>   Bolas flies exactly 2 tiles), finding 9 (the Saucer's Tractor Beam
>   pulls only enemies; the Mothership's Heavy Tractor Beam keeps own
>   units, since it does not do what Mass Beam Down does), finding 10 (no
>   Recover command: an idle unit recovers at End Turn, as before),
>   finding 12 (the Abomination's attack swallows a unit it may swallow),
>   finding 15 (a ship's attack boards a ship it may board), and finding
>   17 for the Moon Gun (it fires only to tiles the unit could not walk
>   to); the Summoner's Tentacle also replaces a Move on a road tile both
>   reach.
> - **Done in `7r132`** (`pulp_wars-y242`): finding 4 (Crack Ice), by
>   "only the Ice Folk walk on ice" rather than the proposal below: a
>   ground unit of another faction never enters ice, so a free ice tile
>   beside it means Crack Ice alone, and a walker or flyer (which crosses
>   ice) never cracks it, so its ice tile is a plain Move.
> - **Kept by the user's choice:** Sugar Rush (finding 11: "it also boosts
>   your attack").
> - **Kept as legitimate choices:** the Engineer (finding 6), the summons,
>   the placement abilities, Freeze against Attack on a ship (finding 16),
>   and the Tesla Tower (finding 17).
>
> The rest of this document is the review as written, before any of it
> was built.

A review of every faction's units for the problem the Mammoth had: one
board tile that offers two or more commands, so the player has to choose
between them, or a special that does what a plain Move or Attack already
does. This is a proposal for the user to review. Nothing here has been
built yet, and no rule or code has changed.

**The model case.** The Mammoth could Stampede 1 to 3 tiles, so a tile
next to it offered both a Move and a Stampede. That fix is handled
separately: Stampede becomes 2 to 3 tiles only, so a neighbouring tile is
only ever a Move or an Attack.

**Method.** I read the offered commands (`appendPublicUnitCommandsV7`,
`src/engine/v7/query.ts:1259` onwards), the tile planner that turns them
into badges and choosers (`src/render/canvas/tile-actions-v7.ts`), the
rules in `RULESET_7_CURRENT.md`, and the tests that pin the overlaps. I
ran no games.

---

## How the board handles a shared tile today

- When a unit is selected, every tile where one of its targeted commands
  is offered gets a badge. A tile with more than one action opens a small
  **chooser** (`tile-actions-v7.ts:843`). This is the user's 2026-10-16
  rule (`docs/ui/BOARD_TARGETING.md:84`): "when several actions apply to
  one tile, both icons show and a tap opens a small choice."
- An ability's badge on **another of your own units** also opens the
  chooser, with **Select** as an extra row, unless the ability is
  `oneTap` (only Join the Chant is).
- There is already a switch that removes an overlap: `onlyBeyondBoard`
  (`tile-actions-v7.ts:259`). An ability that has it is badged only on
  tiles the unit could not reach or hit without it. Today only Sugar Rush
  uses it (`:481`). Several of the fixes below are this switch applied to
  more abilities.
- Every ability also keeps its dock button (`BOARD_TARGETING.md:87`: "so
  there are two ways to do each action"). Pressing the button arms the
  ability, and then every tile on the board means that ability.

## Three ways to fix an overlap

| Pattern                     | What it means                                                                                                                                                                                                             | Example                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **A. Split by distance**    | The special starts where the plain Move or Attack stops. Near tiles mean Move or Attack; far tiles mean the special.                                                                                                      | The Mammoth fix. Already true of the Stargazer (Move 1, star 2 to 4) and the Troll (Move 1, toss 2 to 3). |
| **B. One verb per target**  | When a special clearly beats the plain Attack on a target, the tile means the special. The Attack comes back when the special cannot be used (on cooldown, target not eligible).                                          | A Brain next to an enemy: the tile means Mind Control while it is ready, Attack while it is cooling down. |
| **C. Arm it from the dock** | A "place something here" ability (summon, build, bake) is not badged on tiles that already mean Move. Its dock button arms it, and then the tiles mean placement. Unarmed, a free tile you can walk to always means Move. | The `onlyBeyondBoard` switch, applied to more abilities.                                                  |

A and B change rules, so the Normal AI and the rules doc change with them.
C is interface only.

C partly reverses the 2026-10-16 rule ("every action that targets a tile
gets an icon on that tile"). The user should decide that explicitly; see
the open questions at the end.

---

## Findings, ranked by how much confusion they cause in play

| #   | Unit (faction)                          | The overlap in one line                                                                   | Fix           | Effort |
| --- | --------------------------------------- | ----------------------------------------------------------------------------------------- | ------------- | ------ |
| 1   | Summoner (Cult)                         | A free neighbouring tile can show Move, Imp, Horror, Mass and Tentacle at once            | B + A + C     | M      |
| 2   | Steam Mole (Dwarves)                    | A neighbouring tile is both Move and Tunnel: the Mammoth's twin                           | A             | S      |
| 3   | Hexer (Cult)                            | Every enemy in range is both Attack and Ribbit                                            | B             | S      |
| 4   | Every non-Ice-Folk unit next to ice     | A neighbouring ice tile is both Move and Crack Ice                                        | C             | S      |
| 5   | Mothership (Martians)                   | Mass Beam Down badges almost every tile within 3, on top of Move, Attack and Tractor Beam | C             | S      |
| 6   | Engineer (Dwarves)                      | A free neighbouring tile is Move, Assemble and Barricade                                  | C             | S      |
| 7   | Sled and Ice Witch (Ice Folk)           | A neighbouring enemy is both Attack and "Frost Bolt"                                      | A             | S      |
| 8   | Brain (Martians)                        | Every neighbouring enemy is both Attack and Mind Control                                  | B             | S      |
| 9   | Saucer (Martians)                       | Your own unit 2 tiles away: Beam Down and Tractor Beam both bring it next to the Saucer   | Rule cut      | S      |
| 10  | Every unit (all factions)               | Recover, Wait and doing nothing all give the same heal                                    | Hide Recover  | S      |
| 11  | Every Candy unit                        | Armed Sugar Rush re-offers every normal Move tile as "Sugar Rush: move here"              | Stance button | S–M    |
| 12  | Abomination (Undead giant)              | A neighbouring small enemy is both Attack and Swallow                                     | B             | S      |
| 13  | Familiar (Cult)                         | A neighbouring enemy is both Attack and Switcheroo                                        | A             | S      |
| 14  | Gingerbread Giant, Confectioner (Candy) | Break Off and Re-bake badge tiles that already mean Move, Attack or Top-Up                | C             | S      |
| 15  | Any ship with Seamanship                | A badly damaged enemy ship is both Attack and Board                                       | B             | S      |
| 16  | Ice Folk line units                     | A neighbouring enemy ship is both Attack and Freeze                                       | C             | S      |
| 17  | Any unit on a Tesla Tower or Moon Gun   | Zap and Attack on one enemy; Fire and Move on one tile                                    | B / C         | S      |
| 18  | Small ones (Cult, Troll, helpers)       | Own-unit badges that add a chooser with Select                                            | Leave or C    | S      |

---

### 1. Summoner (Cult): the busiest tile in the game

**What the player sees.** The Summoner has Move 1, Attack 1 and seven
targeted abilities: Sacrifice, Seize, Summon (Imp, Horror, Mass), Channel,
Tentacle and the Great Summoning (`ruleset-v7.ts:4543`).

- **A free tile next to it** can carry Move, Summon Imp, Summon Horror,
  Summon Mass and Tentacle. With The Stars Are Right and three chanters it
  also carries the Great Summoning. The badge column holds three badges,
  so the tile shows "Move, Imp, +3" (`BOARD_TARGETING.md:197`). The test
  pins it: "The Summoner's Move and the other summons share every tile"
  (`tests/unit/cult-summons-board-v7.test.ts:263`).
- **A broken enemy next to it** (5 HP or less, held by a cultist) is both
  Attack and Seize (`query.ts:1358`, `:1745`). The Summoner's Attack is
  1 (`attack2: 2`), so a Seize always does better: a sure kill, twice the
  victim's value in Favour, and no Grave (`RULESET_7_CURRENT.md:17684`).
- **Your own cultist next to it** can show Sacrifice, plus Summon Horror
  and Summon Mass (as the helper, when several cultists could help), plus
  Select. That is a four-row chooser, and one row (Sacrifice) cannot be
  undone.

**Proposal.**

1. **Seize replaces the Attack (B).** On a target the Summoner may Seize,
   the tile means Seize, labelled with its Favour.
2. **Tentacle 2 to 3 tiles (A).** It currently works 1 to 3 tiles away
   (`TENTACLE_RANGE_V7`, `ruleset-v7.ts:4788`; rules `:18314`). A
   Tentacle slaps the weakest unit beside it, the Summoner's own side
   included, so one raised next to the Summoner (7 HP) is rarely wanted.
3. **Summons are armed from the dock (C).** The single Summon button
   already opens the Imp, Horror or Mass choice with prices
   (`BOARD_TARGETING.md:677`). After the choice, the tiles mean "place it
   here". Unarmed, a free neighbouring tile means Move. Treat the Great
   Summoning the same way.
4. **Sacrifice is armed only from its button (C).** It already never acts
   on one tap. Without its badge, an own cultist's tile is just Select.

**Result.** Unarmed, a free tile means Move, a broken enemy means Seize,
any other enemy means Attack, and an own unit means Select.

**Rule impact.** You lose the Attack on a seizable unit (never better
than the Seize) and a Tentacle right beside the Summoner (it would slap
the weakest unit next to it, often your own). Summoning loses no option;
it takes one extra tap.

**Effort.** M: one rule change (Tentacle), one planner rule (Seize hides
the Attack), and arming for the summons. The AI needs the Tentacle change.

---

### 2. Steam Mole (Dwarves): the Mammoth's exact twin

**What the player sees.** The Mole has Move 1 (`ruleset-v7.ts:3790`),
and Tunnel reaches any tile up to 3 steps away (`TUNNEL_RANGE_V7` 3,
`ruleset-v7.ts:3926`; rule 6 at `RULESET_7_CURRENT.md:14831`), including
the tiles next to it. Each neighbouring free tile is therefore both Move
and Tunnel, and gets the chooser. The Tunnel also waits for a second pick
before it digs (`BOARD_TARGETING.md:144`).

**Proposal (A).** Tunnel only to tiles 2 or 3 steps away. A neighbouring
tile means Move; anything further means Tunnel. With no Hammerer to
carry, make the Tunnel one tap, as a Move is.

**Rule impact.** You lose burrowing into the tile next door. The Mole can
still go underground 2 tiles away, so its identity (hide, then erupt) is
intact.

**Effort.** S: one predicate, its tests, the doc, and a check of the AI's
Tunnel scoring.

---

### 3. Hexer (Cult): Attack or Ribbit on every enemy in range

**What the player sees.** The Hexer has range 2 (`ruleset-v7.ts:4501`)
and Ribbit reaches 2 (`RIBBIT_RANGE_V7`, `:4769`). Every enemy it can
shoot is also a Ribbit target, so every target opens a chooser. The test
pins it: "puts an Attack and a Ribbit on the Knight a Cult Hexer may
shoot or hex" (`tests/unit/tile-actions-v7.test.ts:350`). Ribbit cannot
be used on the Hexer's next turn (`RULESET_7_CURRENT.md:18267`), so this
happens every other turn.

**Proposal (B).** While Ribbit is ready, an enemy it can frog means
Ribbit. While Ribbit is cooling down, or on a target it cannot frog (a
giant, a two-slot unit, a frog already), the tile means Attack. The
Hexer gets a natural rhythm: hex one turn, shoot the next.

**Rule impact.** You cannot shoot with the Hexer on a turn its Ribbit is
ready. Its shot is weak (Attack 1.5), and a frog takes the next hits at
Defense 0.5 with no strike back, so the cost is small. The one real loss
is finishing off a nearly dead unit with the Hexer's own shot on a Ribbit
turn.

**Effort.** S as interface only (the planner hides the Attack). It is M
if the engine also stops offering the Attack, so the AI plays the same
way.

---

### 4. Crack Ice: every non-Ice-Folk unit next to Ice Folk ice

**What the player sees.** Every unit or ship of the other factions may
Crack an ice tile next to it when nobody stands on it
(`RULESET_7_CURRENT.md:14326`; offered at `query.ts:1467`). Every land
unit may also walk onto ice (its Move ends there: "Slip", rules around
`:14171`). So each free ice tile next to a land unit is both Move and
Crack Ice, and gets the chooser. Its target list does not exclude Move
tiles (`frozen-sea-board-plan-v7.ts:157`). This happens to every faction
in every match against the Ice Folk.

**Proposal (C).** Give Crack Ice the `onlyBeyondBoard` switch. Ice you
can walk onto means Move. To break it instead, press Crack Ice in the
dock, and the tile then means Crack. A ship (which cannot enter ice) or a
unit that has already moved still gets the Crack badge directly, as
today.

**Rule impact.** None.

**Effort.** S: one flag and a test.

---

### 5. Mothership (Martians): Mass Beam Down covers the board

**What the player sees.** Mass Beam Down offers every explored tile
within 3 of the Mothership (`RULESET_7_CURRENT.md:12799`, rows 6 and 7;
`query.ts:1394`), including tiles that hold an enemy (the strike force
lands around it). With the army gathered, nearly every tile within 3
carries its badge, on top of:

- Move (Move 2): every Move tile becomes Move + Mass Beam Down;
- Attack: a neighbouring enemy becomes Attack + Mass Beam Down;
- the free Heavy Tractor Beam (2 to 3 tiles, own or hostile): those units
  become Tractor + Mass Beam Down (+ Select on your own).

**Proposal (C).** Mass Beam Down is armed only from its button. That mode
is already a full two-phase screen: passenger toggles, then the landing
tile (`RULESET_7_CURRENT.md`, "Board" paragraph of 20.7.1). Unarmed, the
Mothership's tiles mean Move, Attack or Tractor Beam, each by distance.

**Rule impact.** None.

**Effort.** S.

---

### 6. Engineer (Dwarves): three meanings on each free neighbouring tile

**What the player sees.** The Engineer has Move 1. Assemble (a Clockwork
Gunner) and Barricade both target a free tile next to it
(`RULESET_7_CURRENT.md:15224`, `:15267`; `query.ts:1500`, `:1506`). Once
Marksmanship is researched and there are Coins and a slot, every free
neighbouring tile is Move + Assemble + Barricade: a three-row chooser.
After the Engineer moves, it is still a two-row chooser.

**Proposal (C).** Assemble and Barricade are armed from their two dock
buttons. Unarmed, a free tile means Move. Armed, each tile means "build
this here".

**Rule impact.** None.

**Effort.** S.

---

### 7. Sled and Ice Witch (Ice Folk): two "Frost Bolts" that overlap the Attack

**What the player sees.**

- **Sled.** Bolas reaches 1 to 2 tiles (`withinBolasRangeV7`,
  `src/engine/v7/ice-folk.ts:353`), and the Sled attacks at 1. A
  neighbouring enemy is Attack + Frost Bolt (the interface names the
  Bolas "Frost Bolt", `ice-folk-presentation-v7.ts:175`).
- **Ice Witch.** Frost Bolt reaches 1 to 2 (`ice-folk.ts:359`), and she
  attacks at 1. A neighbouring enemy is Attack + Frost Bolt. Her Cold
  Snap button already freezes every hostile unit beside her
  (`RULESET_7_CURRENT.md:13719`), so a Frost Bolt on a neighbour is
  mostly a smaller Cold Snap: two ways to do nearly the same thing.

**Proposal (A).** Frost Bolt (both units) works at exactly 2 tiles. A
neighbouring enemy means Attack. The Witch freezes her neighbours with
Cold Snap.

**Rule impact.**

- The Sled can no longer freeze an enemy right beside it. It has Move 2
  and may throw after moving, so it can step back and throw when a tile
  is free.
- The Witch can no longer freeze exactly one neighbour without the whole
  ring. The ring also freezes water once she has Rime, which is rarely a
  problem.

**Effort.** S: two predicates, tests, the doc, and the AI's target lists.

---

### 8. Brain (Martians): Attack or Mind Control on every neighbour

**What the player sees.** Mind Control takes any enemy beside the Brain
(`RULESET_7_CURRENT.md:12888`, row 10). The Brain attacks at 1 too. The
test pins it: "badges the enemy a Martian Brain may take with Mind
Control" expects `["ATTACK", "MIND_CONTROL"]`
(`tests/unit/tile-actions-v7.test.ts:390`).

**Proposal (B).** While Mind Control is ready (no cooldown, under the
limit of 3), a neighbouring enemy means Mind Control. During its two-turn
cooldown, or at the limit, the tile means Attack.

**Rule impact.** You cannot hit with the Brain while Mind Control is
ready. Its Attack is 1 (`attack2: 2`), so almost nothing is lost.

**Effort.** S as interface only; M with the engine and AI.

---

### 9. Saucer (Martians): two ways to fetch your own unit

**What the player sees.** An own unit 2 tiles from the Saucer is a legal
Beam Down passenger (pick-up range 2, `RULESET_7_CURRENT.md:12733` row 6)
and a legal Tractor Beam target (exactly 2, own or hostile, `:13094`).
Both bring it next to the Saucer as the Saucer's primary action. Its tile
shows Beam Down + Tractor Beam + Select.

- **Beam Down:** you choose the landing tile, and the unit counts as
  moved.
- **Tractor Beam:** the tile is a straight-line step, and the unit keeps
  its whole turn.

**Proposal.** The Saucer's Tractor Beam pulls hostile units only. Own
units travel by Beam Down. The Mothership's free Heavy Tractor Beam keeps
pulling both.

**Rule impact.** You lose the Saucer's "pull an own unit and it can still
move and act" trick, which is a small mobility combo. If the user wants
to keep it, the interface-only alternative is to badge only Beam Down on
own units and keep the own-unit pull behind the Tractor Beam button.

**Effort.** S (rule, AI target list, doc).

---

### 10. Recover (every faction): three ways to the same heal

**What the player sees.** The dock offers Recover whenever a unit could
heal. The rules say idle recovery at End Turn is "the automatic form of
Recover", decided by the same predicate and giving the same amount, and
that "Wait does not prevent idle recovery" (`RULESET_7_CURRENT.md:6604`;
offered at `query.ts:1644`). Recover is a primary action, so it is
strictly worse than Wait or doing nothing: it uses up the unit's action
for the same heal.

**Proposal.** Hide the Recover button. Show the heal on the unit card or
the Wait button instead ("+4 HP at End Turn"). Keep the command for the
engine and the AI.

**Rule impact.** None.

**Effort.** S.

---

### 11. Sugar Rush (every Candy unit): a hidden "rush first?" decision

**What the player sees.** Sugar Rush gives +1 Move and +1 Attack on the
first attack, then the unit Crashes next turn
(`RULESET_7_CURRENT.md:15782`).

- Unarmed, the board is already clean: only tiles reachable only with the
  Rush get a Rush badge (`onlyBeyondBoard`).
- Armed, every normal Move tile is shown again as "Sugar Rush: move here"
  (`candy-board-plan-v7.ts:199-214`). The same tile is a plain Move
  unarmed and a Rush + Move armed. Every attack you could make anyway is
  also re-offered as "Sugar Rush, then attack".

**Proposal.** Make Sugar Rush a stance, not an aimed ability. One press
rushes the unit at once (it is free and not a primary action). The board
then simply shows the Rushed unit's Moves and Attacks, one meaning each.
The unarmed "only with the Rush" tiles stay as today: tapping one rushes
and moves.

**Rule impact.** None. The only change is that pressing the button
commits the Rush; today the armed mode can be cancelled. A hover preview
of the extended reach can replace that.

**Effort.** S–M (dock and pick handling).

---

### 12. Abomination (Undead giant): Attack or Swallow

**What the player sees.** Swallow takes a visible hostile land unit
beside the Abomination with 12 HP or less (`RULESET_7_CURRENT.md:7843`).
It can attack the same unit, so each such neighbour is Attack + Swallow.

**Proposal (B).** While its stomach is empty, a swallowable neighbour
means Swallow; anything else means Attack. A gentler variant: the tile
means Attack when the attack's preview kills (the Abomination's Infect
then raises a Zombie at once), and Swallow otherwise.

**Rule impact.** You lose wounding, rather than swallowing, a swallowable
unit. With the variant you also lose swallowing a unit you could kill
outright. Both are rare.

**Effort.** S as interface only.

---

### 13. Familiar (Cult): Attack or Switcheroo on a neighbour

**What the player sees.** Switcheroo swaps the Familiar with any visible
land unit within 4 (`SWITCHEROO_RANGE_V7`, `ruleset-v7.ts:4783`; rules
`:18295`). A neighbouring enemy is Attack + Switcheroo. Each own unit
within 4 shows Switcheroo + Select.

**Proposal (A).** Switcheroo works 2 to 4 tiles away. A neighbour means
Attack (or Select for your own unit).

**Rule impact.** You lose swapping with a unit right beside you. That
only shifts two units by one tile, so the trick's real power (pulling a
far target into your lines) is kept.

**Effort.** S.

---

### 14. Gingerbread Giant and Confectioner (Candy): placement on Move tiles

**What the player sees.**

- **Gingerbread Giant.** Break Off places two Gingerbread Men on two free
  tiles beside the Giant (`RULESET_7_CURRENT.md:7943`). Its first-tile
  badges sit on the Giant's Move tiles (Move 1), so each is Move + Break
  Off.
- **Confectioner.** Re-bake first picks Crumbs within 2, and Crumbs may
  lie under any unit (`:15876`, row 7). An empty Crumbs tile beside it
  is Move + Re-bake. Crumbs under an own unit give Top-Up + Re-bake +
  Select. Crumbs under an enemy beside it give Attack + Re-bake.

**Proposal (C).** Both are armed from their dock buttons. Unarmed tiles
mean Move, Attack or Top-Up only.

**Rule impact.** None.

**Effort.** S.

---

### 15. Board (any ship with Seamanship): Attack or capture

**What the player sees.** A ship beside an enemy ship at a third of its
HP or less may Board it (`RULESET_7_CURRENT.md:9295`) or attack it. Each
such target is Attack + Board.

**Proposal (B).** On a target it can Board, the tile means Board.

**Rule impact.** You lose sinking a ship you could capture, and the kill
credit, Slayer and Plunder that come with sinking it. A captured ship is
free: an orphan that uses no slot.

**Effort.** S.

---

### 16. Ice Folk line units: Freeze or Attack on a neighbouring ship

**What the player sees.** Every Ice Folk land unit except the Witch has
Freeze, aimed at one of the eight tiles beside it. A ship in the line is
Frozen (`RULESET_7_CURRENT.md:14273`). A neighbouring enemy boat is
therefore Attack + Freeze. The test "badges a Yeti's Freeze tiles, with
the Attack on the boat it could hit" expects `["ATTACK", "FREEZE"]`
(`tests/unit/tile-actions-v7.test.ts:374`). Empty water tiles mean only
Freeze, which is clean.

**Proposal (C, narrow).** A tile with an enemy you can attack means
Attack. A Freeze line through that tile is aimed from the Freeze button.

**Rule impact.** None.

**Effort.** S.

---

### 17. Map curiosities: Tesla Tower and Moon Gun

- **Tesla Tower.** A unit on the Tower may Zap an enemy within 2 for 16
  "instead of attacking" (`RULESET_7_CURRENT.md:4364`, `:4387`). A
  neighbouring enemy is Attack + Zap. Proposal (B): on the Tower, the
  tile means Zap. Rule impact: you lose a plain attack chosen to avoid
  the chain lightning, which can jump onto your own units. That is a real
  but rare choice; the user may prefer to leave this one.
- **Moon Gun.** It fires its unit to any free tile within 5 (`:4423`),
  including the unit's own Move tiles. Those tiles are Move + Fire, and
  firing spends the unit's whole turn. Proposal (A or C): Fire only to
  tiles the unit cannot walk to this turn (`onlyBeyondBoard`). Rule
  impact: none worth having.

**Effort.** S each.

---

### 18. Small ones, listed for completeness

These add a chooser on an own unit with Select as the extra row. That is
mild, and partly deliberate as a safety step.

- **Thing in the Cellar (Cult):** Anchor on an own cultist beside it:
  Anchor + Select.
- **Every robed cultist (Cult):** Channel on an own daemon within 3:
  Channel + Select. A neighbouring Unbound daemon can also be Attack +
  Channel (`query.ts:1807`).
- **Herald (Cult):** Proclaim on an enemy city within 3
  (`RULESET_7_CURRENT.md:18178`) can share the city centre with an Attack
  on its garrison or a Move onto an empty centre. Rare: the Herald comes
  only from the Great Summoning.
- **Troll (Goblins):** with two or more Goblins beside it, the toss
  passenger badge sits on each Goblin as Toss + Select. With one Goblin,
  the landing tiles at 2 to 3 are badged directly, which is clean.
- **Gumball Gunner, Confectioner, Shaman (Candy, Dinosaurs):** Sugar
  Toss, Top-Up and Hatch on an own unit act on one tap, so that unit
  cannot be selected with a tap while the healer is selected. One meaning
  per tile, as wanted; noted only because Select is lost.

Suggestion: leave these as they are, or give Anchor and Channel the C
treatment if the user wants own units always to mean Select.

---

## Cross-cutting notes

- **The good template already exists.** Overstride (Colossus) is folded
  into the Move. Charge!, Crush, Siege Hammer and Glacial Smash are folded
  into the Attack. The Chocolate Bunny's Hop is just part of its Move
  path. Each adds power with no extra choice, which is the style the
  Mammoth fix moves towards.
- **Choose, then choose again.** Several abilities need a second pick on
  the same tile to confirm: the Stampede (being fixed), the Tunnel, the
  Star-fall's Begin, and Mass Beam Down's "choose it again"
  (`BOARD_TARGETING.md:38` and `:144`). Where nothing else needs choosing
  (a Tunnel with no Hammerer), make it one tap like a Move. Keep the
  confirmation for the Star-fall, which is big and costly.
- **The dock and the badge.** Every ability can be started both from its
  button and from its tile badge. Once tiles have one meaning each, the
  dock buttons are needed only for C-class (placement) abilities and
  self-actions. Removing the others would be a further simplification,
  but it is a bigger UI decision for the user.
- **Shared pattern.** Fixes 4, 5, 6, 14 and 16 are all the same
  `onlyBeyondBoard`-style flag in `TILE_ABILITIES_V7`, so they can ship
  as one interface bead.

---

## Units checked and already clean

**Humans**

- Fighter, Marksman, Guard, Catapult, Champion: Move and Attack only.
- Raider: Escape is a Move after its attack.
- Captain: Rally and Tend Wounded are dock self-actions.
- Knight: Overrun is a continuation of its attack.
- Juggernaut: Crush is folded into its Attack.
- Patrol Boat (Ram is passive), Battleship, Submarine: clean apart from
  Board (finding 15).

**Undead**

- Skeleton, Zombie, Lich, Wight, Ghost Ship, Plague Galleon, Sunken
  Galley: passives only.
- Ghoul: Devour is a dock action.
- Banshee: Wail is a dock action, and it has no Attack.
- Necromancer: Rally and Raise Dead are dock actions.
- Vampire: Feast and Escape are an extra attack and a Move.
- Abomination: see finding 12.

**Goblins**

- Goblin, Wolf Rider, Bomb Chucker, Rocket Cart, Scrap Buggy, Fire Raft:
  Kaboom is a dock action, and bombs and Overrun are passive.
- Orc Brute, Orc Warboss (Rally is a dock action), Ogre: clean.
- Troll: toss landings at 2 to 3 never meet its Move 1 (pattern A); see
  finding 18 for its passengers.

**Dinosaurs**

- Caveman, Raptor (Charge is passive), Spitter, Ankylosaurus, Stegosaurus,
  T-Rex, Triceratops, Plesiosaur: clean.
- Shaman: Hatch is one tap on its own Egg; Tend Wounded is a dock action.
- Brontosaurus: Thunder Stomp is a dock action.

**Martians**

- Grunt, Ray Gunner, Shield Projector, Tripod, Shock Trooper: clean.
- Colossus: Overstride is folded into its Move.
- Brain, Saucer, Mothership: see findings 8, 9 and 5.

**Ice Folk**

- Yeti, Snow Hunter, Walrus, Snow Golem, Frost Wyrm, Frost Giant: clean,
  apart from the ship case in finding 16.
- Mammoth: being fixed separately.
- Sled and Ice Witch: see finding 7.

**Dwarves**

- Hammerer: rides the Tunnel and toggles inside the armed Tunnel only.
- Gyrocopter: Bomb Run is its only attack (target, then landing), so
  there is no overlap.
- Clockwork Gunner, Steam Cannon, Steam Tank, Brass Titan, Steam Launch,
  Ironclad, Diving Bell: clean.
- Whirligig: its Attack is the Whirl (the user's 2026-10-27 decision).
  Every neighbouring enemy tile does the same Whirl, which is one meaning,
  even if it is repeated on several tiles.
- Engineer and Steam Mole: see findings 6 and 2.

**Candy**

- Toffee Trooper, Donut Racer, Marshmallow, Pie Launcher, Jawbreaker,
  Gumdrop Tug, Pie Galleon, Choco Sub: clean apart from Sugar Rush
  (finding 11).
- Gumball Gunner: Sugar Toss is one tap on an own unit.
- Chocolate Bunny: Hop is part of its Move.
- Confectioner and Gingerbread Giant: see finding 14.

**Cult**

- Initiate, Idol Bearer: Join the Chant is one tap, and Behold! is
  passive.
- Stargazer: its star lands 2 to 4 tiles away and it moves 1, so the two
  never meet (pattern A).
- Horror (Boo! is a dock action), Imp, Gibbering Mass, Black Gondola,
  Galleon of the Eye, Kraken: clean.
- Thing in the Cellar: see finding 18.
- Hexer, Familiar, Summoner: see findings 3, 13 and 1.

---

## Open questions for the user

1. **Pattern C reverses part of the 2026-10-16 rule** ("every action that
   targets a tile gets an icon on it; several icons open a choice"). Is it
   all right to stop badging placement abilities on tiles that already
   mean Move?
2. **Pattern B removes a few Attacks while a special is ready** (Hexer,
   Brain, Summoner, Abomination, boarding ships). Interface only (the AI
   may still attack in those cases) or the rules too?
3. **Saucer:** cut the own-unit Tractor Beam (finding 9), or keep it
   behind the button?
4. **Tesla Tower:** keep the Attack-or-Zap choice (it can matter for the
   chain lightning), or make the Zap the only verb on the Tower?
