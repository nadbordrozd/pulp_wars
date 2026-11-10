# Full-strength review: half-measures a technology could finish (2026-11)

The user, 2026-11-10: "i want the raised skeletons to be raised at full
health depending on a technology - land grants but i'd consider renaming
it / i want new zombies to also spawn at full health depending on a tech /
consider if the other factions have similar half-assed abilities that
could be full-assed based on some tech" (`pulp_wars-exuo`).

The Undead Skeletons and Zombies are being built in `pulp_wars-1uof`
(Raise Dead at full HP with the Undead Planning; Infect, Bitten, and
digested Zombies at full HP with another Undead node; daemons open to
Infect and Bite). This review covers the last line: every other ability of
every faction that makes, restores, or delivers something at reduced
strength, whether a technology should finish it, and which node. It is a
proposal for the user. Nothing here has been built, and no rule or code
has changed.

**Scope.** Units created, summoned, hatched, raised, re-baked, assembled,
captured, or released below full strength; heals and repairs that restore
part; and effects that arrive weakened. Sources: the rules in
[RULESET_7_CURRENT.md](RULESET_7_CURRENT.md) at `7r138`, the tech tables
of its section 6.2, and the constants in `src/engine/rules/ruleset-v7.ts`.
Neutral curiosities (the Fountain of Youth, the Wishing Well, the Giant
Spider) belong to no faction and are left out.

**The pattern already exists.** Several faction nodes already finish a
half-measure: Nesting (+4 Egg HP), Brittle (Shatter at 4), Blasting
Charges (eruptions deal 3), Dive (bombs deal 7), Heat Sinks (no overheat
for the Ray Gunner), Deep Winter (idle recovery 6), and Steam Pumps (a
Windmill heals constructs). The proposals below follow the same shape.

**The node.** The user named Land Grants (`PLANNING`) for the Skeletons.
Planning reads the same in all nine trees (+1 capacity in every city and
the Land Grant), it sits right under Administration, which gives each
faction its support unit, and it gives the least of any tier-3 node. So
the proposals use one pattern where it fits: **Planning finishes what the
faction's support unit half does** (the Necromancer's Raise Dead, the
Captain's Tend Wounded, the Confectioner's Re-bake, the Shaman's Hatch).
Where the half-measure belongs to another unit, the proposal uses the
faction's own node that gives least. Each faction may rename its Planning
as the Undead will (for example "Fresh Batch" for the Candy).

**Principles applied.** Situational blowouts are welcome when a
technology gates them; no proposal should make a faction always win or
leave one best unit. No proposal adds a second meaning to a board tile.
Each new glossary line carries at most one number.

## Human

| Ability                         | Today                                                   | Node proposed                    | Effect               | Recommendation                                                                                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------- | -------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Captain's Tend Wounded          | heals 2 (a sixth of a Fighter, less than idle recovery) | Planning (Land Grants)           | Tend Wounded heals 4 | **Do it.** The Dinosaur pass made the same fix for the Shaman on dinosaurs ("Tend 2 on a 20-HP body was never worth the action"). The Captain becomes worth an action in a long siege; it still cures as now. One number. |
| Board (shared by every faction) | the prize has a third of its maximum HP plus 1          | none (Naval Engineering checked) | —                    | **Don't.** At full HP Board would hand over a free Battleship (25 HP) for one adjacent hit. The low prize HP is what stops boarding back and forth, and idle recovery next to an own Port already mends it (4 a turn).    |
| Disband (shared)                | refunds half the printed cost                           | none                             | —                    | **Don't.** An economic rule, not a unit made weak; a full refund would make every unit free to swap out.                                                                                                                  |

The Human Explosives is one of two Explosives nodes with no faction rule
(the Goblin's is the other). It is the spare slot if Planning ever gets
crowded.

## Undead (beyond `pulp_wars-1uof`)

| Ability                             | Today                                    | Node proposed                   | Effect                       | Recommendation                                                                                                                                                                                                                                                              |
| ----------------------------------- | ---------------------------------------- | ------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Raise Dead Skeleton                 | 5 of 10 HP                               | Planning (being renamed)        | full HP                      | In `pulp_wars-1uof`.                                                                                                                                                                                                                                                        |
| Infect, Bitten, and digested Zombie | 12 of 18 HP                              | the node `pulp_wars-1uof` picks | full HP                      | In `pulp_wars-1uof`.                                                                                                                                                                                                                                                        |
| Drowned Crews Ghost Ship            | 5 of 10 HP                               | the same node as the Zombies    | a sunk ship rises at full HP | **Do it, inside the Zombie rule.** It is "the Infect step pointed at the sea" (it already uses `UNIT_INFECTED`), so one rule, "your risings rise whole", should cover it. A separate node would teach two rules for one idea. The prize is a 10-HP Patrol Boat.             |
| Wight: Rise Again                   | 7 of 14 HP, once, and it may act at once | none (Metallurgy checked)       | —                            | **Don't.** It is already a free second life with a fresh activation, and a melee killer standing on the Grave stops it. With full-HP Skeletons and Zombies the Undead get two big upgrades this round; a third on the same theme risks an always-winning attrition faction. |
| Devour, Feast                       | full heal                                | —                               | —                            | Already full.                                                                                                                                                                                                                                                               |

## Goblin

| Ability            | Today                                  | Node proposed | Effect | Recommendation                                                                                                                                                          |
| ------------------ | -------------------------------------- | ------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Troll regeneration | 4 a turn                               | none          | —      | **Don't.** It is a reward giant's steady heal on any tile, already better than idle recovery; a full heal each turn would make the Troll unkillable without focus fire. |
| No healer          | Goblins heal by recovery and Windmills | none          | —      | **Leave.** Disposable goblins are the faction; nothing is made at reduced strength.                                                                                     |
| Disband            | refunds 0                              | none          | —      | **Leave.** Goblins are cheap; it is a price rule, not a weakened unit.                                                                                                  |

Nothing in the Goblin rules creates a unit or an effect at reduced
strength, so no Goblin proposal.

## Dinosaur

| Ability          | Today                                                               | Node proposed          | Effect                                             | Recommendation                                                                                                                                                                                                                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------- | ---------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shaman's Hatch   | the hatchling has full HP but is exhausted for the rest of the turn | Planning (Land Grants) | a Shaman-hatched dinosaur may move and act at once | **Consider.** It is the Shaman's half-measure: a Hatch saves the countdown but not the turn. The Egg still spends one enemy round on the board, so a T-Rex laid on turn N fights on N + 1, the tempo of a trained Knight, and only with a Shaman beside the nest. A tech-gated combo the user likes; check that a T-Rex rush is beatable before shipping. No number. |
| Egg              | 6 HP, 10 with Nesting                                               | none                   | —                                                  | **Leave.** Nesting already is the upgrade, and the Egg's frailty is the counterplay to cheap big dinosaurs.                                                                                                                                                                                                                                                          |
| Shaman's Tend    | 4 on a dinosaur, 2 on a Caveman or a Shaman                         | none                   | —                                                  | **Leave.** The dinosaurs, which matter, already get 4. If the Human proposal is built as a shared "Tend Wounded heals 4" rule, the Caveman gains it for free; that is harmless.                                                                                                                                                                                      |
| Hatching, growth | full HP; a growth stage heals fully                                 | —                      | —                                                  | Already full.                                                                                                                                                                                                                                                                                                                                                        |

## Martian

| Ability                               | Today                                                                                                | Node proposed             | Effect                                                                         | Recommendation                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Beam Down and Mass Beam Down delivery | a beamed ray unit counts as moved, so it fires at half power (a Ray Gunner deals a Fighter 3, not 8) | Raiding                   | **Hot Drop:** a ray unit set down by a Beam Down fires at full power that turn | **Do it.** The Saucer's whole job is delivering a shooter, and the shooter then arrives half-armed. Martian Raiding is already the Saucer's node (Strafe) and otherwise gives Pillage that the flyers cannot use. The full-power shot still overheats (Cooling), so it is one big drop, not a habit: a situational alpha strike, gated by tech. No number. |
| Ray fired after an ordinary Move      | half power                                                                                           | none                      | —                                                                              | **Leave.** Stand-still artillery is the Martian ray's identity and the reason the Tripod is not a better Catapult.                                                                                                                                                                                                                                         |
| Tripod and Colossus Cooling           | full, then half, every other turn; Heat Sinks frees only the Ray Gunner                              | none (Heat Sinks checked) | —                                                                              | **Don't.** Two turns of a Tripod deal 17 against the Catapult's 20; without Cooling it would deal 24 with Pierce on top, a one-best-unit risk.                                                                                                                                                                                                             |
| Mind Control, release                 | the unit keeps its HP                                                                                | —                         | —                                                                              | Not a reduction: nothing is lost or restored.                                                                                                                                                                                                                                                                                                              |
| Shields                               | recharge fully each turn                                                                             | —                         | —                                                                              | Already full.                                                                                                                                                                                                                                                                                                                                              |

## Ice Folk

| Ability   | Today                                                             | Node proposed | Effect | Recommendation                                                    |
| --------- | ----------------------------------------------------------------- | ------------- | ------ | ----------------------------------------------------------------- |
| No healer | recovery, Windmills, Promotion; Deep Winter makes idle recovery 6 | none          | —      | **Leave.** Deep Winter already is the upgrade.                    |
| Shatter   | at 3 HP or less, 4 with Brittle                                   | —             | —      | Already tech-upgraded, and it is damage, not something made weak. |

Nothing in the Ice Folk rules creates a unit or an effect at reduced
strength, so no Ice Folk proposal.

## Dwarf

| Ability                         | Today                                               | Node proposed          | Effect                       | Recommendation                                                                                                                                                                    |
| ------------------------------- | --------------------------------------------------- | ---------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engineer's Repair               | 4 on a machine, 2 on anything else                  | Planning (Land Grants) | Repair heals 4 on every unit | **Optional, low.** Only worth it as part of one shared "Tend Wounded heals 4" rule with the Human proposal; on its own the Dwarf gain is small, since its machines already get 4. |
| Assembled Clockwork Gunner      | full HP, but arrives as if moved: one shot, not two | none                   | —                            | **Leave.** A 2-Coin Gunner that fires twice the turn it appears would beat training it; one shot is already the `7r122` buff.                                                     |
| Constructs never mend by idling | healed only by Repair, Steam Pumps, and Promotion   | none                   | —                            | **Leave.** Steam Pumps (Milling) already lets them heal (`7r118`); the Engineer dependence is the construct identity.                                                             |
| Barricade                       | built at full 10 HP                                 | —                      | —                            | Already full.                                                                                                                                                                     |

## Candy

| Ability                | Today                                                                   | Node proposed                                    | Effect                             | Recommendation                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Confectioner's Re-bake | the copy has half its maximum HP, rounded up (a Toffee Trooper 5 of 10) | Planning (Land Grants; could read "Fresh Batch") | re-baked units come out at full HP | **Do it.** It is the Candy's Raise Dead: the support unit remakes the fallen at half strength, and the user asked for exactly this on the Undead. Keep the half price: the limits (Crumbs for 3 turns, the Confectioner's action, its city's capacity plus 1) already bound it, and Planning's +1 capacity feeds it. No number. Alternative node: Peppermint Surprise, the other Crumbs node. |
| Sugar Toss, Top-Up     | heal 2                                                                  | none                                             | —                                  | **Leave.** Top-Up's job is the cure and ending a Crash; the Toss is a ranged trickle. Re-bake is the Candy's real recovery.                                                                                                                                                                                                                                                                   |
| Break Off              | the two Gingerbread Men have full HP                                    | —                                                | —                                  | Already full.                                                                                                                                                                                                                                                                                                                                                                                 |

## Cult

| Ability                     | Today                                                           | Node proposed   | Effect                                     | Recommendation                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------- | --------------------------------------------------------------- | --------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Daemons never heal          | an Imp, Horror, Mass, or Herald keeps every wound until it dies | Warding Circles | a bound daemon heals like your other units | **Do it.** Warding Circles (the Cult Fortification) has no rule of its own: it only unlocks the Idol Bearer. The user is already making daemons "same as everyone else" for Infect and Bite; healing is the matching half. It uses the existing recovery and Windmill rules, so no new number. A Gibbering Mass resting on its doorstep becomes a real wall, a gated combo. An Unbound daemon still never heals. |
| Summon, the Great Summoning | every daemon arrives at full HP                                 | —               | —                                          | Already full.                                                                                                                                                                                                                                                                                                                                                                                                    |
| Offerings to the Deep       | half the sunk victim's value in Favour                          | none            | —                                          | **Leave.** It is a naval trickle on top of Sacrifice and Seize, under the 30 Favour cap; doubling it adds income, not strength.                                                                                                                                                                                                                                                                                  |
| The Tentacle                | 8 HP, belongs to nobody, sinks after three rounds               | none            | —                                          | **Leave.** Temporary and ownerless by design; it is a hazard, not a unit.                                                                                                                                                                                                                                                                                                                                        |

## Ranked shortlist

1. **Candy Re-bake at full HP, with Planning.** The closest twin of the
   Skeletons; the same node, the same shape, one rule.
2. **Undead Ghost Ships at full HP, folded into the Zombie rule of
   `pulp_wars-1uof`.** Same idea at sea; costs one line, avoids a second
   rule for risings.
3. **Martian Hot Drop, with Raiding:** a ray unit set down by a Beam Down
   fires at full power that turn. Fixes the Saucer's half-armed delivery
   and gives Martian Raiding a real reason.
4. **Cult daemons heal like other units, with Warding Circles.** Gives the
   one rule-less Cult node a rule and matches the user's "same as
   everyone else" for daemons.
5. **Human Tend Wounded heals 4, with Planning.** Makes the Captain worth
   its action; mirrors the Shaman's `7r53` fix.
6. **Dinosaur Shaman's hatchling acts at once, with Planning.** Strong
   tempo; build only after checking that a T-Rex rush has an answer.
7. **Dwarf Repair heals 4 on every unit, with Planning**, only if item 5
   is built as one shared Tend Wounded rule.

Items 1, 5, 6, and 7 make Planning the "support unit, finished" node in
the Undead, Candy, Human, Dinosaur, and Dwarf trees. The Goblin, Martian,
Ice Folk, and Cult Planning stay plain Land Grants (their support units
have no half-measure).

## Deliberately left at reduced strength

- **The Wight's Rise Again (7 of 14 HP).** Already a free second life
  that may act at once; the Undead get two full-strength upgrades this
  round, and a third risks an always-winning attrition faction.
- **Board prizes (a third of maximum HP plus 1).** Full HP would make a
  boarding a free capital ship; the low HP is what prevents boarding back,
  and a Port mends it.
- **Dinosaur Eggs (6 HP).** Nesting already raises them to 10; the frail
  Egg is the counterplay to cheap big dinosaurs.
- **The Martian ray after an ordinary Move, and Tripod and Colossus
  Cooling.** The stand-still rule is the faction's identity; removing
  Cooling would make the Tripod a better Catapult.
- **Constructs that do not mend by idling, and the assembled Gunner's
  single shot.** Steam Pumps and the `7r122` Assemble buff already
  addressed them.
- **Partial heals that are a faction's texture:** idle recovery (4, 2
  away from home, Restless for the Undead), Windmills (6), Troll
  regeneration (4), the Abomination's digest heal (4), Sugar Toss and
  Top-Up (2), and the healer-less Goblin, Martian, and Ice Folk.
- **Prices and refunds:** Disband at half (Goblins 0), the Re-bake at half
  price, and Offerings to the Deep at half value. These are economy, not
  strength.
- **The Tentacle.** Temporary and ownerless by design.
