# Ruleset 7: Candy faction

**Any unit can capture** (`pulp_wars-ke95`, user direction 2026-10-09):
every land unit of every faction now has `CAPTURE`, so wherever this
document says a unit has no capture, cannot capture, or lists the
capture-capable units, read that every land unit captures under the
ordinary capture rule. Flyers (Saucer, Mothership, Gyrocopter) and the
Prowling Sabretooth included: wherever this document says a flyer or a
Sabretooth never ends a Move, lands, or advances on a village or a foreign
center, read that it may, and then besieges and captures like any land
unit (only a Dwarf rider on its surfacing turn still avoids foreign
centers). Boats, Eggs, embarked and burrowed units, and neutral
curiosities still never capture. See
[current rules section 4.7](RULESET_7_CURRENT.md#47-siege-and-capture).

**Name change (`pulp_wars-w49.3`, `pulp-wars-poc-7r46`):** the Candy
`FIGHTER`-role unit is displayed as **Toffee Trooper** (it was the Gumdrop;
its sprite has been a wrapped toffee since `pulp_wars-2o7.3`). Only the
display name changed, and it is replaced throughout this document; the role,
its numbers and rules, the asset ids and file names (`gumdrop`), and the
Normal AI constant `THREATENED_GUMDROP_BIAS_V7` are the same. In the same
identity the `KNIGHT`-role unit is displayed as **Chocolate Bunny** (it was
the Gummy Bear) and the `JUGGERNAUT`-role unit as **Gingerbread Giant** (it
was the Rock Candy Golem), after their sprites changed in
`pulp_wars-jdb.10`; again only the display names changed (the asset ids
stay `gummy-bear` and `rock-candy-golem`), and this document uses the new
names, "the Bunny" and "the Giant" where it wrote "the Bear" and "the
Golem". The battle
tables of section 11 were computed before
[tuning 1](RULESET_7_TUNING_1.md) and no longer hold where they involve a
retaliation against a fortified or covered unit, the Human Catapult
(Attack 3), or the Human Knight (13 HP);
`tests/unit/ruleset-v7-candy-numbers.test.ts` has the current values.

**Redesigned (`pulp_wars-jdb.12`):** the
[Candy redesign](RULESET_7_CANDY_REDESIGN.md) is built: Sticky Toffee,
Glaze Trail, Ricochet, Bunny Hop and Thump, Toothache, and the
Confectioner's Top-Up in place of Frosting; no Rush perks (Sugar Frenzy and
the Rushed Racer's Escape are gone); Crumbs on settlement sites; and the
reworked Re-bake. Where this document describes Frosting, the Rush perks,
or the old Re-bake, it is history; the rules are
[current rules section 23](RULESET_7_CURRENT.md#23-candy-faction-rules).

**Status:** **folded into [Ruleset 7: current rules](RULESET_7_CURRENT.md)
(kept as history)** by `pulp_wars-jdb.8` at `pulp-wars-poc-7r41`: the
current rules describe the running eight-faction game, with the Candy in
their [section 23](RULESET_7_CURRENT.md#23-candy-faction-rules), and win
wherever this document differs; [section 25](#25-fold-notes-pulp_wars-jdb8)
here and their
[known discrepancies](RULESET_7_CURRENT.md#25-known-discrepancies) list
where the build differs from this text and what is still open. Contract
(`pulp_wars-jdb.2`, epic `pulp_wars-jdb`), with every step built:

- **the engine** (`pulp_wars-jdb.3`, identity `pulp-wars-poc-7r38`: `7rNN`
  below is `7r38`, `v7rNN` is `v7r38`, and "the previous identity" is
  `pulp-wars-poc-7r37`), with its notes in
  [section 23](#23-implementation-notes-pulp_wars-jdb3);
- **the Normal AI** (`pulp_wars-jdb.4`:
  [Candy play](../architecture/NORMAL_AI.md#candy-play-pulp_wars-jdb4) has
  its rules, its measurements, and what it reads narrowly;
  [section 14.1](#141-implementation-status-pulp_wars-jdb4) lists what it
  left out);
- **the art** (`pulp_wars-jdb.5`: the
  [Candy art fragment](../art/factions/CANDY.md));
- **the UI** (`pulp_wars-jdb.6`, with that art wired in), with its notes in
  [section 24](#24-implementation-notes-pulp_wars-jdb6);
- **the coarse balance** (`pulp_wars-jdb.7`), **closed on a small sample
  with no number changed**: 20 wins in 42 games against the other seven
  factions at `7r38`
  ([section 19.5](#195-balance-record-pulp_wars-jdb7)). The sample is
  small (six games per opponent) and predates the changes of `7r39` to
  `7r41` (the Martian Grunt at 8 HP, the village density, and the 3
  starting Coins with the cheaper tier 3 technologies), so it is a sanity
  check, not a measurement.

**Still future:** the unlock achievement ("Sweet Tooth",
[section 20](#20-the-future-unlock-a-proposal)); until then the Candy are
an ordinary faction offered in every setup. **Open polish**
(`pulp_wars-jdb.9`): the Confectioner's portrait, a public "why not" query
for a Re-bake, the Rush's +1 in the Move stat, and a Candy badge for the
Classic look.

It turns the approved design (`pulp_wars-jdb.1`, commit
`0dd3686`: a first draft, a hard critique, a redraft, a second critique, and
a final redraft, kept as [appendix A](#appendix-a-the-first-draft-and-its-critique)
and [appendix B](#appendix-b-second-critique)) and the root rulings of
2026-10-03 ([section 21.4](#214-root-rulings)) into exact rules, state,
commands, events, errors, previews, and queries, and re-runs every battle
number of the design against the engine
([section 11](#11-per-unit-battle-analysis);
[section 21.1](#211-numbers-corrected-by-the-engine-re-run) lists the
corrections). It was written as an overlay over the rules in force when
`pulp_wars-jdb.3` started: at the time of writing that was
[Ruleset 7: current rules](RULESET_7_CURRENT.md) at `pulp-wars-poc-7r35`
(seven factions and map curiosities I), plus whatever identities landed
first (the root queued the Candy engine behind the Giant Spider of
[map curiosities](RULESET_7_MAP_CURIOSITIES.md#8-the-monster), auto-Recover,
[map scale](RULESET_7_MAP_SCALE.md), and the
[naval branch](RULESET_7_NAVAL_BRANCH.md), whose designs are on `main` at
`50de0bf`; whatever of them lands first, the Candy registration takes part
in it like every other faction: [sections 2.4](#24-setup) and
[16](#16-naval-branch)).

**Ruleset ID:** `pulp-wars-poc-7r38` (the engine bead's identity; the
current identity is `pulp-wars-poc-7r46`). The contract was written when
`main` was at `pulp-wars-poc-7r35` and named no number: **`7rNN` and `v7rNN`
stand for `7r38` and `v7r38` everywhere below, and "the previous identity"
for `pulp-wars-poc-7r37`.**

**Map-generation revision:** unchanged by this revision. Faction choice
never affects generation.

**Scope:** an eighth playable faction, `CANDY` (displayed "Candy"; the
faction ID ruling and its evidence are in
[section 2.3](#23-the-faction-id-audit)). The overlay changes only
identity, faction registration, setup, the Candy roster, the Candy rules
(Sugar Rush and the Crash; Crumbs, Re-bake, and Peppermint Surprise; Splat;
Bounce; Frosting and Sugar Toss; Home Sweet Home), the substitutions for
the starting unit, rewards, and treasure, and the commands, events,
queries, UI, and Normal AI needed to play them. Economy, map rules, the
technology graph, and the boats' rules are the Human ones. Every
unmentioned rule stays in force for every faction. Rulesets 5 and 6 (which
have their own, unrelated Candy faction) and historical Ruleset 7 fixtures
remain frozen. The user wants the faction to become an achievement-unlocked
easter egg later; for now it is an ordinary faction offered in setup
([section 20](#20-the-future-unlock-a-proposal) keeps the proposal).

**Identity of the faction:** Humans are sustain, Undead are attrition,
Goblins are a reckless horde, Dinosaurs are few, big, and growing,
Martians are a small high-tech invasion force, the Ice Folk are the things
from the peaks, the Dwarves are heavy, slow, and built to last, and the
Candy are **a sugar rush**: a kingdom of living sweets that charge in hyper
and hit hard, crash flat on the next turn, crumble when they are hit, and
are baked again from their crumbs. A pie in the face stops an enemy from
hitting back, and the soft ones bounce attackers away. They are strong on
the turn they choose to spend, against fortified defenders, and over a long
fight in which their crumbs are not eaten; they are weak in the turn after
a Rush, against area damage and packs that kill fragile 10-HP bodies,
against enemies that walk over their crumbs, and when their Confectioners
die. Every Candy rule is visible on the board and fits in one sentence
([section 15.3](#153-help-text)).

Attack and Defense are shown in whole units; the code stores half-units
(`attack2`, `defense2`), which the roster table also lists.

## 1. Sources and decided direction

The user's request (2026-10-03, epic `pulp_wars-jdb`): "design and
implement a special candy faction. inspired by the candy kingdom in
adventure time. this will be a special easter egg faction players will
unlock through some kind of achievement. for now make it just another
faction. it can be a bit wacky - not that the other factions are dead
serious."

The user's standing direction for new factions: "Before you start
implementing make sure they have a bunch of unique mechanics, some cool
useful abilities and not just slightly different stats from everyone else.
and think a bit about each unit - how would it work in a battle, would it
be useful, would it be too strong. e.g. the t rex with rampage turned out
too powerful in a way that could have been predicted and the triceratops
the opposite."

| #   | Requirement or standing lesson                                                                                                                                                             | Where                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| U1  | A candy faction inspired by the vibe of a sweet kingdom of living confections, wacky but readable.                                                                                         | [section 2.1](#21-theme-and-tone)                                                                                  |
| U2  | Original characters and names only: inspired by, not copying, the show's characters, likenesses, and trademarks.                                                                           | [sections 2.1](#21-theme-and-tone) and [15.4](#154-what-the-art-bead-must-draw)                                    |
| U3  | A bunch of unique mechanics and cool, useful abilities, not slightly different stats; each rule fits in one sentence and is visible on the board; a memorable "wow" event.                 | [sections 5](#5-sugar-rush-and-the-crash) to [9](#9-frosting-and-sugar-toss)                                       |
| U4  | Every unit is thought through in battle before implementation: useful, not too strong, not dead (the T-Rex with Rampage was predictably dominant, the first Triceratops predictably weak). | [section 11](#11-per-unit-battle-analysis)                                                                         |
| U5  | The same mechanical roles and technology graph; no dead technology; reward, Militia, and treasure substitutions.                                                                           | [sections 3](#3-candy-roster), [4](#4-technology), and [12.16](#1216-starting-units-rewards-and-treasure)          |
| U6  | No attack from hiding and no hard locks (no rooting, no illegal-to-attack zones, no permanent denial); every penalty can be played through.                                                | [sections 5.3](#53-the-crash-and-home-sweet-home) and [8](#8-bounce), [appendix A](#a2-the-critique) items 3 and 4 |
| U7  | The identity works in the first 20 rounds (the Normal AI rarely reaches expensive late units), and the Normal AI can play it with simple rules.                                            | [sections 5](#5-sugar-rush-and-the-crash) and [14](#14-normal-ai-requirements)                                     |
| U8  | Balance is checked coarsely on Dry Land only; the identity is complete without water.                                                                                                      | [section 19](#19-headless-support-measurement-tuning-bounds-and-balance-acceptance)                                |
| U9  | Every player plays a different faction; faction looks and a permanent faction colour identify the owner.                                                                                   | [sections 12.17](#1217-one-faction-per-player) and [15.4](#154-what-the-art-bead-must-draw)                        |
| U10 | Its naval branch follows the naval branch expansion designed in parallel (epic `pulp_wars-5ti`), with tweaks only where necessary.                                                         | [section 16](#16-naval-branch)                                                                                     |
| U11 | Later an achievement unlocks it as an easter egg; for now it is an ordinary faction.                                                                                                       | [section 20](#20-the-future-unlock-a-proposal)                                                                     |
| U12 | A change to AI strategy comes with a modest head-to-head test, not only telemetry.                                                                                                         | [section 14](#14-normal-ai-requirements)                                                                           |

**The decided direction** is the design's final redraft (`pulp_wars-jdb.1`)
with the root rulings of 2026-10-03:

| #   | Decision (summary)                                                                                                                                                                                  | Where                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| D1  | Four pillars: Sugar Rush and the Crash; Crumbs and Re-baking; Splat; Bounce. Two support abilities (Frosting, Sugar Toss) and two technology effects (Home Sweet Home, Peppermint Surprise).        | [sections 5](#5-sugar-rush-and-the-crash) to [9](#9-frosting-and-sugar-toss) |
| D2  | The roster of the final redraft: Toffee Trooper, Donut Racer, Gumball Gunner, Marshmallow, Confectioner, Pie Launcher, Chocolate Bunny, Gingerbread Giant, with the Human boats.                    | [section 3](#3-candy-roster)                                                 |
| D3  | Rush gives +1 Move and +1 Attack on the **first** attack only and never adds to Charge; only the Donut Racer (Escape) and the Chocolate Bunny (Sugar Frenzy) have a Rush perk.                      | [section 5](#5-sugar-rush-and-the-crash)                                     |
| D4  | Re-bake costs half the printed cost, rounded up, returns half the maximum HP, rounded up, needs a home-city slot, and works only on own Crumbs for three Candy turns; enemies eat Crumbs by a Move. | [section 6](#6-crumbs-and-re-baking)                                         |
| D5  | Root ruling: Splat lasts for the rest of the Candy turn (the one-strike-back version is a named lever).                                                                                             | [section 7](#7-splat)                                                        |
| D6  | Root ruling: the faction colour is cotton-candy pink `#ffb8d8`.                                                                                                                                     | [section 15.4](#154-what-the-art-bead-must-draw)                             |
| D7  | Root ruling: the unlock achievement ("Sweet Tooth") is a later bead; the Candy are an ordinary unlocked faction now.                                                                                | [section 20](#20-the-future-unlock-a-proposal)                               |
| D8  | Root ruling: the engine waits in the identity queue behind the Spider, auto-Recover, map scale, and naval engines.                                                                                  | the Ruleset ID above                                                         |

## 2. Identity, factions, and compatibility

### 2.1 Theme and tone

The Candy are the silliest faction, and the rules stay as plain as every
other faction's. The jokes live in names, animations, and Help text: a
gumdrop soldier with a candy-cane spear, a donut that rolls into battle
with a rider on top, a pie that lands on a knight's face, a marshmallow
that goes "boing", a gummy bear on a sugar high that tramples a line and
then lies on its back with spinning eyes. Under the jokes every rule is a
one-sentence, deterministic, previewable game rule. Wackiness that would
hurt readability is out: no random effects (combat stays PRNG-free), no
hidden traps, no rule that depends on an animation.

The faction is inspired by the general idea of a sugary kingdom of living
confections ruled by a scientist monarch, with candy soldiers. It uses no
character, name, likeness, place name, or catchphrase from the show:

- **Faction display name:** "Candy". The realm, for flavour text only, is
  the **Kingdom of Sugarcrest**; the lore names no ruler (the units are
  generic sweets, like every other faction's units).
- **Unit names** are generic confection words: Toffee Trooper, Donut Racer,
  Gumball Gunner, Marshmallow, Confectioner, Pie Launcher, Chocolate Bunny, Gingerbread
  Giant.
- **Avoided on purpose:** banana-shaped guards; giant gumball-headed
  guardian statues (the Juggernaut is a rock-candy golem instead of a
  gumball machine); a pink-haired princess in a lab coat (the Confectioner
  is a round caramel sweet in an apron and goggles with a whisk); a
  peppermint butler; lemon-headed characters; any name of the show's
  kingdom, land, or characters. The art bead puts these in the faction's
  negative prompt ([section 15.4](#154-what-the-art-bead-must-draw)).

**The wow events.** A Chocolate Bunny on a Sugar Rush tramples through a back
line (Fighter, Catapult, Captain) and is left Crashed in the middle of the
enemy army; next turn a Confectioner bakes it back out of its crumbs. A Pie
lands on a Walled Guard and two Rushed Toffee Troopers beat it without a blow in
return.

### 2.2 Identity

| Boundary                                   | Candy revision                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ruleset                                    | `pulp-wars-poc-7rNN`                                                                                                                                                                                                                                                                                                                                                               |
| Game-state schema                          | `7`                                                                                                                                                                                                                                                                                                                                                                                |
| Command/event/save/replay numeric versions | `7`                                                                                                                                                                                                                                                                                                                                                                                |
| Browser autosave                           | `pulpWars.save.v7rNN.current`                                                                                                                                                                                                                                                                                                                                                      |
| Map revision                               | unchanged by this revision                                                                                                                                                                                                                                                                                                                                                         |
| Frozen `FactionId` order                   | `ORIGINAL`, `UNDEAD`, `GOBLIN`, `DINOSAUR`, `MARTIAN`, `ICE_FOLK`, `DWARF`, `CANDY`                                                                                                                                                                                                                                                                                                |
| Frozen `FactionTreeId` order               | the seven existing trees, then `CANDY_BASELINE_V1`                                                                                                                                                                                                                                                                                                                                 |
| Faction to tree binding                    | the seven existing bindings, plus `CANDY` → `CANDY_BASELINE_V1`                                                                                                                                                                                                                                                                                                                    |
| Display names                              | the seven existing names, plus `CANDY` is "Candy"                                                                                                                                                                                                                                                                                                                                  |
| `COMMAND_KIND_ORDER_V7`                    | three more kinds than the previous identity: `SUGAR_RUSH`, `REBAKE`, `SUGAR_TOSS`, inserted in that order immediately after `ASSEMBLE`                                                                                                                                                                                                                                             |
| `DOMAIN_EVENT_KIND_ORDER_V7`               | seven more kinds: `UNITS_CRASHED` and `CRUMBS_STALE`, in that order, immediately before `INCOME_PREVIEWED`; `UNIT_REBAKED` immediately after `UNIT_ASSEMBLED`; `UNIT_SUGAR_RUSHED` immediately after `UNITS_CHILLED`; `SUGAR_TOSSED` immediately after `WOUNDED_TENDED`; `CRUMBS_EATEN` immediately after `UNIT_MOVE_INTERRUPTED`; `CRUMBS_LEFT` immediately after `GRAVE_CREATED` |

- The previous identity is appended to `PRIOR_RULESET_7_IDS` (the list stays
  gap-free). A reader of this revision rejects it and every earlier Ruleset
  7 identity in setups, states, saves, replays, and release artifacts; there
  is no migration.
- Current-route startup deletes the known obsolete Ruleset 7 autosave keys,
  now through the previous identity's key, and preserves the Ruleset 6
  save, settings, the art-set preference, and unrelated storage.
- The identity changes once, in `pulp_wars-jdb.3`, which also fixes every
  serialized **shape** of this revision and implements every rule.
  `pulp_wars-jdb.4` (AI) and `jdb.6` (UI) change behaviour under the same
  identity; `jdb.7` (coarse balance) takes one more identity only if it
  changes a number after other identities have moved on (the Dwarf
  precedent).
- **Shape changes** (all with neutral values in a match without a Candy
  seat):
  - `GameStateV7` gains four lists, in this order, after the last list the
    previous identity has (today `bombedThisTurn`; after the Spider's own
    list if it lands first): `sugarRush`
    ([section 5.3](#53-the-crash-and-home-sweet-home)), `crumbs`
    ([section 6.1](#61-crumbs)), `splattedThisTurn`
    ([section 7](#7-splat)), and `tossedThisTurn`
    ([section 9](#9-frosting-and-sugar-toss)). **They are the only new
    stored state.** No unit key and no activation key is added: Rushed and
    Crashed are entries of `sugarRush`, and the Rush attack bonus is read
    from the existing `attacksUsed`;
  - `PlayerViewV7` gains the same four lists, filtered by visibility
    ([section 12.14](#1214-fog-and-observation));
  - three commands, seven events, one `UNIT_DIED` cause (`PEPPERMINT`),
    one `noRetaliationReason` (`SPLATTED`), four error codes, four
    combat-preview fields, one combat option, the per-unit stat flags, and
    the `candy` block of the public unit stats
    ([section 13](#13-commands-events-errors-state-and-queries));
  - three technology unlock kinds (`CONFECTIONER_SUPPORT`,
    `HOME_SWEET_HOME`, `PEPPERMINT_SURPRISE`), two capabilities
    (`homeSweetHome`, `crumbsBite`), five ability literals (`SUGAR_RUSH`,
    `BOUNCE`, `SPLAT`, `REBAKE`, `SUGAR_TOSS`), and two role mechanics
    (`rushPerk`, `leavesCrumbs`);
  - `MIND_CONTROLLED_LOST_ABILITIES_V7` gains `REBAKE`
    ([section 12.5](#125-martian-rules-and-mind-control)).

### 2.3 The faction ID audit

The design asked whether the Ruleset 7 faction can be `CANDY`, since
Rulesets 5 and 6 already have a faction of that name in shared code
(`src/headless/cli.ts`, `src/render/dom/app-view.ts`,
`src/app/controller.ts`, `src/ai/index.ts`, art bindings), or must be named
`CONFECTION`. **Ruling: `CANDY`** (display "Candy", tree
`CANDY_BASELINE_V1`, headless word `candy`, pairing letter `C`), checked
against `main` at `0dd3686`:

1. **The faction types are separate.** Ruleset 5 has `FactionId`
   (`src/engine/model/types.ts`: `ORIGINAL`, `CANDY`), Ruleset 6
   `FactionIdV6` (`src/engine/v6/types.ts`: `ORIGINAL`, `CANDY`), and
   Ruleset 7 `FactionIdV7` (`src/engine/v7/types.ts`). No Ruleset 7 module
   imports the Ruleset 5 or 6 list, and no file under `src/engine/v7`,
   `src/ai/v7*.ts`, `src/render/*v7*`, `src/render/dom/app-view-v7.ts`,
   `src/app/v7-*.ts`, or `src/assets/chibi-*` mentions `CANDY`.
2. **The four named shared files are Ruleset 5 and 6 paths.**
   `src/headless/cli.ts` parses `--factions` per ruleset: its
   `parseFactionValues` (`original` or `candy`) serves only the Ruleset 5
   and 6 commands (`factionsArgV5`, `factionsArgV6`, and the two batch
   helpers), while Ruleset 7 uses its own `factionsArgV7` with its own
   words (`original`/`human`, `undead`, `goblin`, `dinosaur`, `martian`,
   `ice`/`ice_folk`, `dwarf`). `src/render/dom/app-view.ts`,
   `src/app/controller.ts`, and `src/ai/index.ts` are the Ruleset 5 shell,
   controller, and policy, typed by `FactionId`; Ruleset 7 has
   `app-view-v7.ts`, `v7-controller.ts`, and `src/ai/v7*.ts`.
3. **Routing and saves never mix rulesets.** The route is chosen from
   `?ruleset` before any storage is touched
   (`src/app/browser-routing.ts`), saves use per-identity keys, and every
   state, save, and replay is dispatched by its exact ruleset ID, so a
   Ruleset 6 save with a `CANDY` seat never reaches a Ruleset 7 parser.
4. **The art namespaces do not collide.** The Ruleset 5 and 6 Candy art is
   in `public/assets/pixellab/` with IDs `unit-candy-*`,
   `building-candy-city-*`, `terrain-candy-*`, and `portrait-candy-*`,
   reviewed by `art:candy-terrain-review`, `art:candy-city-review`,
   `art:ruleset6-candy-unit-review`, and `art:square-candy-terrain-review`.
   Ruleset 7 art is in `public/assets/chibi/` with IDs
   `chibi-direction-<faction>-*` and subjects `UNIT:<FACTION>:<ROLE>`, so
   the new art is `chibi-direction-candy-*` and `UNIT:CANDY:FIGHTER` and so
   on, reviewed by a new `art:chibi-candy-direction-review`. Faction
   colours are a `Record<FactionIdV7, string>`
   (`src/render/canvas/faction-colours-v7.ts`).
5. **The balance letter `C` is free** (`FACTION_INITIAL` in
   `scripts/ruleset7-undead-balance-matrix.ts`: `H`, `U`, `G`, `D`, `M`,
   `I`, `W`).

**The one cost:** seven Ruleset 7 tests use `"CANDY"` as their example of an
**unregistered** faction and would fail once it is registered:
`tests/unit/ruleset-v7-foundation.test.ts`,
`tests/unit/ruleset-v7-unique-factions.test.ts`,
`tests/unit/ruleset-v7-dinosaur-faction.test.ts`,
`tests/unit/ruleset-v7-undead-faction.test.ts` (three places), and
`tests/integration/ruleset7-browser-controller.test.ts`.
`pulp_wars-jdb.3` moves those assertions to another unregistered literal
(for example `"NOT_A_FACTION"`) without changing their meaning. The two DOM
tests that assert the page text never contains `"CANDY"`
(`tests/integration/ruleset7-preview-route.test.ts`,
`tests/integration/ruleset7-dom-shell.test.ts`) stay true: the display
name is "Candy", and option values are not text. `scripts/browser-smoke.ts`
and `scripts/validate-candy.ts` drive the Ruleset 5 engine and are
unchanged.

`CONFECTION` was rejected: it would only spare those seven fixtures, while
every player-facing and tool surface says "Candy", and the tree, art, and
telemetry names would then differ from the display name. The fold
(`jdb.8`) reworded the current rules' phrase "the Ruleset 6 Candy
precedent" (faction model, section 1) so that it cannot be read as this
faction.

### 2.4 Setup

- `MatchSetupV7.factions` is a dense per-seat array; each entry is one of
  the eight factions, no two seats alike (`DUPLICATE_FACTION`, except with
  the test-only `allowDuplicateFactions` option). With eight factions and at
  most four seats the rule is always satisfiable. The
  [map-scale design](RULESET_7_MAP_SCALE.md) (`pulp_wars-ykw.1`, on `main`)
  allows up to `F` seats, `F` being the number of registered factions (8
  with the Candy), and requires each new faction to register an owner
  colour distinct from every other (the Candy's is `#ffb8d8`,
  [section 15.4](#154-what-the-art-bead-must-draw)); whichever of the two
  engines lands second keeps `F` and those tests right. Nothing here
  assumes a seat count.
- Faction choice never affects map generation, capital placement, turn
  order, treasure placement, curiosity placement, or any PRNG draw.
- **Starting units.** A Candy seat starts with one Toffee Trooper (the `FIGHTER`
  role) on its capital at full HP, 3 Coins (5 in hand on its first turn,
  after that Start Turn's income of 2; the contract said 5 Coins, the value
  before `pulp-wars-poc-7r41`), and no technology, exactly like every other
  seat (`STARTING_FIGHTERS_V7` is 1).
- The headless tools accept `candy` in Ruleset 7 `--factions` (next to
  `original`/`human`, `undead`, `goblin`, `dinosaur`, `martian`, `ice`, and
  `dwarf`) and the pairing letter **`C`**. Without `--factions` the default
  distinct factions are still taken in registration order, so default
  setups of up to four seats are unchanged.

### 2.5 Faction model

This revision follows the revision-13 model as extended by Mind Control:
the frozen mechanical role order is unchanged, state and events serialize
the mechanical role, and every rule, view, preview, UI surface, and AI
decision resolves a unit through its **kind** (`unitFactionV7`: the
original owner's faction while it is mind-controlled, otherwise its
owner's) with no cross-faction fallback; seat rules (Coins, cities,
research, hostility, "own") follow its owner (its controller)
([current rules section 20.9](RULESET_7_CURRENT.md#209-mind-controlled-units)).

- **A Candy unit** is a unit whose kind is `CANDY`. The Candy rules apply to
  the **land roles in land form** only: never to a boat, and never to an
  embarked unit, except where a rule says so.
- **A Candy seat** is a player whose faction is `CANDY`. Seat rules
  (Crumbs ownership, Re-bake's Coins and slots, Home Sweet Home and
  Peppermint Surprise research) read the seat.
- Every Candy unit is **living** (`isLivingUnitV7` is true: its kind is not
  `UNDEAD` and no Candy role is a construct). Every Candy land unit is a
  ground unit (the Human movement mode): no flyer, walker, or
  Mountain-born unit.

| Mechanical role | Human       | Undead      | Goblin       | Dinosaur     | Martian          | Ice Folk     | Dwarf            | Candy (`CANDY`)   |
| --------------- | ----------- | ----------- | ------------ | ------------ | ---------------- | ------------ | ---------------- | ----------------- |
| `FIGHTER`       | Fighter     | Skeleton    | Goblin       | Caveman      | Grunt            | Yeti         | Hammerer         | Toffee Trooper    |
| `RAIDER`        | Raider      | Ghoul       | Wolf Rider   | Raptor       | Saucer           | Sled         | Gyrocopter       | Donut Racer       |
| `MARKSMAN`      | Marksman    | Banshee     | Bomb Chucker | Spitter      | Ray Gunner       | Snow Hunter  | Clockwork Gunner | Gumball Gunner    |
| `GUARD`         | Guard       | Zombie      | Orc Brute    | Ankylosaurus | Shield Projector | Mammoth      | Steam Mole       | Marshmallow       |
| `CAPTAIN`       | Captain     | Necromancer | Orc Warboss  | Shaman       | Brain            | Ice Witch    | Engineer         | Confectioner      |
| `CATAPULT`      | Catapult    | Lich        | Rocket Cart  | Triceratops  | Tripod           | Boulder Yeti | Steam Cannon     | Pie Launcher      |
| `KNIGHT`        | Knight      | Vampire     | Scrap Buggy  | T-Rex        | Mothership       | Sabretooth   | Steam Tank       | Chocolate Bunny   |
| `JUGGERNAUT`    | Juggernaut  | Abomination | Troll        | Brontosaurus | Colossus         | Frost Giant  | Brass Titan      | Gingerbread Giant |
| `PATROL_BOAT`   | Patrol Boat | Patrol Boat | Patrol Boat  | Patrol Boat  | Patrol Boat      | Patrol Boat  | Patrol Boat      | Patrol Boat       |
| `BATTLESHIP`    | Battleship  | Battleship  | Battleship   | Battleship   | Battleship       | Battleship   | Battleship       | Battleship        |

Tactical-role metadata equals that of the same mechanical role
(`assertRuleset7Registry` requires it): the Pie Launcher is `SIEGE`, the
Confectioner `SUPPORT`, the Marshmallow `DEFENDER`, the Gumball Gunner
`RANGED`, the Donut Racer `SKIRMISHER`. The Normal AI judges Candy units by
their abilities, not by these labels ([section 14](#14-normal-ai-requirements)).

### 2.6 Showcase

A `SHOWCASE` setup ([current rules section 2.5](RULESET_7_CURRENT.md#25-showcase-setup))
accepts a Candy seat with no board change: the same strips, cities,
ledger, unit tiles, forms, homes, and entity IDs as any other faction.

- The ten units are the Candy roster's, one per role, at full HP with zero
  kills and the fresh setup activation. `sugarRush`, `crumbs`,
  `splattedThisTurn`, and `tossedThisTurn` are empty.
- All 23 technologies are researched, so Home Sweet Home and Peppermint
  Surprise apply from the first turn. Every Candy role uses one slot, so
  capacity is the Human one.
- Sugar Rush, Frosting (once a unit is damaged), Sugar Toss (likewise), a
  Pie shot with Splat, and a Bounce are reachable in the first turns of
  contact. A Re-bake needs Crumbs, which the Showcase does not start with;
  the UI bead's browser smoke creates them with a scripted death
  ([section 18](#18-implementation-split-and-test-expectations)).

## 3. Candy roster

"Slots" is the city capacity the unit uses. Every Candy role uses one slot.

| Unit              | Role          | Tech              | Cost | Slots |  HP | Attack (`attack2`) | Defense (`defense2`) | Move | Range | Sight | Attack after Move | Capture | Its own thing                                                      |
| ----------------- | ------------- | ----------------- | ---: | ----: | --: | ------------------ | -------------------: | ---: | ----: | ----: | ----------------- | ------- | ------------------------------------------------------------------ |
| Toffee Trooper    | `FIGHTER`     | start             |    2 |     1 |  10 | 2 (4)              |                2 (4) |    1 |     1 |     1 | yes               | yes     | Sugar Rush; no Field Defense                                       |
| Donut Racer       | `RAIDER`      | Scouting          |    3 |     1 |  10 | 2 (4)              |                1 (2) |    2 |     1 |     2 | yes               | yes     | Sugar Rush (Rushed: Escape); Charge (Raiding); no Escape otherwise |
| Gumball Gunner    | `MARKSMAN`    | Marksmanship      |    3 |     1 |   8 | 2 (4)              |                1 (2) |    1 |   1–2 |    1¹ | yes               | yes     | Sugar Rush; Sugar Toss                                             |
| Marshmallow       | `GUARD`       | Drill             |    4 |     1 |  18 | 1.5 (3)            |              2.5 (5) |    1 |     1 |     1 | no                | yes     | Sugar Rush; Bounce; no Field Defense                               |
| Confectioner      | `CAPTAIN`     | Administration    |    5 |     1 |  10 | 1 (2)              |                1 (2) |    1 |     1 |     1 | yes               | no      | Sugar Rush; Frosting; Re-bake; no Rally                            |
| Pie Launcher      | `CATAPULT`    | Sawmilling        |    8 |     1 |  10 | 3 (6)              |              0.5 (1) |    1 |   2–3 |     1 | no                | no      | Sugar Rush; Splat; never advances                                  |
| Chocolate Bunny   | `KNIGHT`      | Chivalry          |    9 |     1 |  14 | 3 (6)              |              1.5 (3) |    2 |     1 |     1 | yes               | no      | Sugar Rush (Rushed: Sugar Frenzy); no Overrun otherwise            |
| Gingerbread Giant | `JUGGERNAUT`  | reward only       |    — |     1 |  40 | 4 (8)              |              3.5 (7) |    1 |     1 |     1 | yes               | yes     | Sugar Rush; Push; Bounce                                           |
| Patrol Boat       | `PATROL_BOAT` | Shorecraft        |    5 |     1 |  10 | 2 (4)              |                2 (4) |    2 |     1 |     2 | yes               | no      | naval                                                              |
| Battleship        | `BATTLESHIP`  | Naval Engineering |   16 |     1 |  25 | 6 (12)             |                4 (8) |    2 |   1–3 |     3 | no                | no      | naval; splash                                                      |

¹ Gumball Gunner Sight becomes 2 with Fieldcraft.

These are the design's numbers, checked against the registry of commit
`0dd3686` (`pulp-wars-poc-7r35`); [section 11](#11-per-unit-battle-analysis)
re-ran every exchange with the engine and found no unit dead or dominant,
so **no roster number is changed**
([section 21.1](#211-numbers-corrected-by-the-engine-re-run)).

- **Toffee Trooper** (a gumdrop soldier with a candy-cane spear and a wafer
  shield) has Fighter parity for cost, Attack, Defense, Move, capture,
  Pillage with Raiding, Disband, Promotion (15 HP promoted), and the
  advance after a melee kill, with 10 HP like the Skeleton and the Caveman.
  It cannot build Field Defense. It is the start unit and the Militia.
- **Donut Racer** (a candy-corn kid riding a frosted donut that rolls like a
  wheel) has Raider parity for Move 2, Sight 2, Charge with Raiding,
  Pillage, capture, the advance, and Fieldcraft Forest freedom. It has
  **Escape only while Rushed** ([section 5.4](#54-rush-perks-escape-and-sugar-frenzy)).
  It costs 3 and has 10 HP (the Ghoul, Wolf Rider, and Sled precedent for a
  Raider without innate Escape). It is the treasure unit.
- **Gumball Gunner** (a jellybean with a gumball blaster) has Marksman
  parity (range 1–2, capture, Pillage, Disband, Fieldcraft Forest freedom
  and Sight, the advance after an adjacent kill), 8 HP, and **Sugar Toss**
  ([section 9](#9-frosting-and-sugar-toss)).
- **Marshmallow** (a big square marshmallow with a graham-cracker shield)
  has Guard parity for "cannot attack after moving", capture, and the
  advance, with 18 HP, Attack 1.5, Defense 2.5, cost 4, no Field Defense,
  and **Bounce** ([section 8](#8-bounce)).
- **Confectioner** (a round caramel sweet in an apron and brass goggles,
  with a whisk) has the Captain's body (5 Coins, 10 HP, Attack 1, Defense
  1, Move 1, no capture). It has **no Rally** (`RALLY` is never offered and
  is rejected with `UNIT_ROLE_INVALID`); its primary actions are Attack,
  **Frosting** (its Tend Wounded), and **Re-bake**
  ([sections 9](#9-frosting-and-sugar-toss) and
  [6.4](#64-the-re-bake-command)).
- **Pie Launcher** (a gingerbread catapult flinging cream pies) has Catapult
  parity (range 2–3, cannot attack after moving, no capture, never
  advances, Field Defense destruction on the target tile with reason
  `CATAPULT`) with Attack 3 instead of 3.5, plus **Splat**
  ([section 7](#7-splat)).
- **Chocolate Bunny** (a big translucent gummy bear brawler) has Knight parity
  for cost, Attack, no capture, and the advance after a melee kill, with 14
  HP, Defense 1.5, and **Move 2** (the Knight has Move 3; Rushed, the Bunny
  has the Knight's 3). It has **no Overrun except while Rushed** (Sugar
  Frenzy, [section 5.4](#54-rush-perks-escape-and-sugar-frenzy)).
- **Gingerbread Giant** (a hulking golem of rock-candy crystals bound with
  caramel) has Juggernaut parity (reward only, capture, Push on an adjacent
  surviving target, the advance, no Pillage, no Disband) with Defense 3.5
  (the Juggernaut's 4), and **Bounce**. It Rushes and Crashes like every
  Candy land unit.
- **Patrol Boat and Battleship** have the Human units' rules and numbers;
  no Candy rule applies to them. Once naval step I exists, the Candy
  registration also has the Human `SUBMARINE` role ([section 16](#16-naval-branch)).
- **Every Candy land role has Sugar Rush.** **No Candy unit builds Field
  Defense** (`buildsFieldDefense` false for every role; the tree replaces
  Fortification, [section 4](#4-technology)).
- **Disband refunds** are `floor(cost / 2)`: Toffee Trooper, Donut Racer, and
  Gumball Gunner 1; Marshmallow and Confectioner 2; Pie Launcher and Chocolate
  Bunny 4. The Giant cannot Disband.
- **Re-bake price and HP** (`rebakePriceV7` = `ceil(cost / 2)`,
  `rebakeHpV7` = `ceil(maxHp / 2)`; [section 6.4](#64-the-re-bake-command)):

  | Role            | Price | HP of the copy |
  | --------------- | ----: | -------------: |
  | Toffee Trooper  |     1 |              5 |
  | Donut Racer     |     2 |              5 |
  | Gumball Gunner  |     2 |              4 |
  | Marshmallow     |     2 |              9 |
  | Confectioner    |     3 |              5 |
  | Pie Launcher    |     4 |              5 |
  | Chocolate Bunny |     5 |              7 |

- **Arms Industry** lowers training costs as for every faction and never a
  Re-bake price.
- An **embarked** Candy land unit follows the ordinary embarked rules (Move
  2, Defense 1, Sight 1, no Attack, no retaliation, no ZOC, no ability); it
  cannot Rush.
- **Public abilities** (the role rule's `abilities` list): Toffee Trooper
  `ATTACK`, `CAPTURE`, `SUGAR_RUSH`; Donut Racer `ATTACK`, `CAPTURE`,
  `CHARGE`, `SUGAR_RUSH`; Gumball Gunner `ATTACK`, `CAPTURE`, `SUGAR_RUSH`,
  `SUGAR_TOSS`; Marshmallow `ATTACK`, `CAPTURE`, `SUGAR_RUSH`, `BOUNCE`;
  Confectioner `ATTACK`, `TEND_WOUNDED` (labelled Frosting), `REBAKE`,
  `SUGAR_RUSH`; Pie Launcher `ATTACK`, `SUGAR_RUSH`, `SPLAT`; Chocolate Bunny
  `ATTACK`, `SUGAR_RUSH`; Gingerbread Giant `ATTACK`, `CAPTURE`, `PUSH`,
  `SUGAR_RUSH`, `BOUNCE`; boats `ATTACK`. Role mechanics: `rushPerk`
  `"ESCAPE"` (Donut Racer), `"SUGAR_FRENZY"` (Chocolate Bunny), otherwise null;
  `leavesCrumbs` true for the seven trainable land roles and false for the
  Giant and the boats; `advancesAfterKill` false for the Pie Launcher only.

## 4. Technology

The graph, tiers, prerequisites, costs, free opening technology, Dry Land
Naval rule, and technology IDs of `CANDY_BASELINE_V1` are identical to
`ORIGINAL_BASELINE_V5` ([current rules section 6](RULESET_7_CURRENT.md#6-technology)).
The Candy registration differs in four unlock entries and two display
names:

- `ADMINISTRATION` grants `CONFECTIONER_SUPPORT` (a label for the
  Confectioner's Frosting and Re-bake, like `ENGINEER_SUPPORT`) instead of
  `CAPTAIN_SUPPORT` (no Rally).
- `CHIVALRY` grants no `OVERRUN` (the Undead, Martian, Ice Folk, and Dwarf
  precedent); the Chocolate Bunny's Sugar Frenzy is a role rule.
- `FORTIFICATION` is displayed as **Home Sweet Home** and replaces
  `COMMAND BUILD_FIELD_DEFENSE` with `HOME_SWEET_HOME`
  ([section 5.3](#53-the-crash-and-home-sweet-home)).
- `EXPLOSIVES` is displayed as **Peppermint Surprise**, keeps both of its
  unlocks (Blast Mountain and melee Field Defense demolition), and adds
  `PEPPERMINT_SURPRISE` ([section 6.3](#63-eaten-and-peppermint-surprise)).

`TECHNOLOGY_DISPLAY_NAME_OVERRIDES_V7` gains
`CANDY: { FORTIFICATION: "Home Sweet Home", EXPLOSIVES: "Peppermint Surprise" }`.
The effects are read through the technology capabilities `homeSweetHome`
(boolean) and `crumbsBite` (0, or `PEPPERMINT_DAMAGE_V7` 3), never through a
raw technology test. Raiding keeps `CHARGE_BONUS` (the Donut Racer's
Charge).

**Audit.** Every technology, and what it gives a Candy seat. "Same" means
the Human unlock applies unchanged and is useful to a Candy seat as it is
to a Human one.

| Technology        | Tier | What a Candy seat gets                                                                                               | Dead part for the Candy                 |
| ----------------- | ---: | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Gathering         |    1 | same: reveal Fertile Ground; Harvest Fruit                                                                           | —                                       |
| Farming           |    2 | same: Farm                                                                                                           | —                                       |
| Milling           |    3 | same: Windmill                                                                                                       | —                                       |
| Administration    |    2 | **Confectioner** (Frosting, Re-bake); Market; Disband                                                                | —                                       |
| Planning          |    3 | same: +1 capacity in every city (also for Re-bake); Land Grant                                                       | —                                       |
| Hunting           |    1 | same: Hunt Game                                                                                                      | —                                       |
| Forestry          |    2 | same: Lumber Camp; Clear Forest                                                                                      | —                                       |
| Sawmilling        |    3 | Sawmill; **Pie Launcher** (Splat)                                                                                    | —                                       |
| Marksmanship      |    2 | **Gumball Gunner** (Sugar Toss)                                                                                      | —                                       |
| Fieldcraft        |    3 | Replant Forest; the Donut Racer and the Gunner ignore Forest movement stops; Gunner Sight 2                          | —                                       |
| Scouting          |    1 | **Donut Racer**; Donut Racer Sight 2                                                                                 | —                                       |
| Roads             |    2 | same: Build Road; Road population; half-cost Road movement (a Rushed Move gets the Road discount too)                | —                                       |
| Commerce          |    3 | same: land trade                                                                                                     | —                                       |
| Raiding           |    2 | Pillage; the Donut Racer's Charge                                                                                    | —                                       |
| Chivalry          |    3 | **Chocolate Bunny** (Sugar Frenzy while Rushed); Cultivate Forest                                                    | Overrun (not granted)                   |
| Drill             |    1 | reveal Ore; **Marshmallow** (Bounce); first-hostile-capture Spoils                                                   | —                                       |
| Engineering       |    2 | same: Mountain entry; +1 Sight on a Mountain; Mine; Workshop; Redevelop                                              | —                                       |
| Metallurgy        |    3 | same: Forge; Arms Industry (training only, never a Re-bake price)                                                    | —                                       |
| Fortification     |    2 | **Home Sweet Home:** a Rushed unit that ends its turn on or next to one of your city centers does not Crash          | Field Defense (no Candy unit builds it) |
| Explosives        |    3 | **Peppermint Surprise:** Blast Mountain; melee attacks destroy Field Defense; an enemy that eats your Crumbs takes 3 | —                                       |
| Shorecraft        |    1 | same: Harvest Fish; Build Port; embarkation; Patrol Boat                                                             | —                                       |
| Navigation        |    2 | same: Deep Water; Gather Pearls; sea trade                                                                           | —                                       |
| Naval Engineering |    3 | same: Battleship; Shipyard; naval discount                                                                           | —                                       |

No technology is a dead purchase: each row has at least one live unlock,
and the two renamed technologies have a faction effect of their own. Re-bake
and Sugar Rush need no technology beyond the unit that uses them.

The tree, research offers, and Help render names and unlock text from the
**viewer's** faction:

| Technology     | Candy name          | Candy unlock text                                                                        |
| -------------- | ------------------- | ---------------------------------------------------------------------------------------- |
| Administration | same                | Confectioner (Frosting, Re-bake); Market; Disband                                        |
| Sawmilling     | same                | Sawmill; Pie Launcher (Splat)                                                            |
| Marksmanship   | same                | Gumball Gunner (Sugar Toss)                                                              |
| Fieldcraft     | same                | Replant Forest; Donut Racers and Gunners ignore Forest movement stops; Gunner Sight 2    |
| Scouting       | same                | Donut Racer; Donut Racer Sight 2                                                         |
| Raiding        | same                | Pillage; Donut Racer Charge                                                              |
| Chivalry       | same                | Chocolate Bunny (Sugar Frenzy while Rushed); Cultivate Forest                            |
| Drill          | same                | reveal Ore; Marshmallow (Bounce); first-hostile-capture Spoils (2 Coins)                 |
| Fortification  | Home Sweet Home     | Rushed units that end the turn on or next to your city centers don't Crash               |
| Explosives     | Peppermint Surprise | Blast Mountain; melee attacks destroy Field Defense; enemies that eat your Crumbs take 3 |

The other technologies read the same for every faction.

## 5. Sugar Rush and the Crash

**One sentence:** before it moves, a Candy unit may Sugar Rush for +1 Move
and +1 Attack on its first attack this turn; on its owner's next turn it
Crashes and cannot act.

No faction borrows power from its own next turn. Inspired and Charge are
free bonuses; the Ice Folk's sluggish is inflicted by the enemy and means
"move or act". The Crash is self-inflicted and means "move but do not act":
the opposite shape, and a decision every turn. It needs no technology and
works from turn 1 on every Candy land unit.

### 5.1 The Sugar Rush command

`SUGAR_RUSH { kind, unitId }`. It is not a primary action and not a Move;
it costs nothing and cannot be undone. Legality, in this order (all
rejections atomic; a pending city reward blocks it like every command):

| #   | Requirement                                                                                                 | Rejection                                     |
| --- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | `unitId` is the actor's own unit on the board.                                                              | the ordinary unit errors                      |
| 2   | Its role, under its kind, has `SUGAR_RUSH` (every Candy land role).                                         | `UNIT_ROLE_INVALID { role }`                  |
| 3   | It is in land form.                                                                                         | `SUGAR_RUSH_NOT_LEGAL { reason: "EMBARKED" }` |
| 4   | It is not Crashed (no `CRASHED` entry in `sugarRush`).                                                      | `UNIT_CRASHED { unitId }`                     |
| 5   | It is not already Rushed (no `RUSHED` entry).                                                               | `SUGAR_RUSH_NOT_LEGAL { reason: "RUSHED" }`   |
| 6   | It has not moved (a landing is a Move), has used no primary action, and is not handled (it has not Waited). | `UNIT_ALREADY_ACTED`                          |

A sluggish (Chilled) unit may Rush; the sluggish rule still applies, so if
it then moves it cannot act. A mind-controlled Candy unit Rushes for its
controller (Rush is a body rule; [section 12.5](#125-martian-rules-and-mind-control)).

**Result.** The entry `{ unitId, phase: "RUSHED" }` is inserted into
`sugarRush` (sorted by unit ID). Event:
`UNIT_SUGAR_RUSHED { playerId, unitId, move }`, where `move` is the unit's
Rushed Move (its role's Move plus 1). Nothing else changes: no Coins, no
reveal, no activation flag.

### 5.2 Rushed

A unit with a `RUSHED` entry is **Rushed** for the rest of its owner's
turn:

- **+1 Move.** Its ordinary `MOVE` this turn has a budget of
  `2 × (Move + SUGAR_RUSH_MOVE_BONUS_V7)` half-points
  (`SUGAR_RUSH_MOVE_BONUS_V7` 1). Every other movement rule applies
  unchanged: Road half steps (a Rushed Donut Racer moves up to six tiles
  along a Road), Forest, Mountain, and deep-snow stops, ZOC stops,
  unexplored-cell stops, occupancy, and a dock that ends the Move by
  embarking. A Move is still one per turn. The Donut Racer's Escape Move has
  the ordinary budget of its role's Move (2), not 3.
- **+1 Attack on its first attack.** The unit's **first** `ATTACK` this turn
  (its `activation.attacksUsed` is 0) gets `SUGAR_RUSH_ATTACK2_V7` (2
  half-units) added to `attack2`, at any range, **unless** Charge or
  Inspired applies to that attack: the Rush bonus never adds to either (a
  Rushed Donut Racer that charges attacks at 3, not 4; a controlled Candy
  unit given Psychic Command gets +1, not +2). It never applies to
  retaliation, to an Overrun or Sugar Frenzy continuation (`attacksUsed` is
  then at least 1), or to anything that is not an `ATTACK`. The combat
  preview carries `sugarRushApplied`.
- Rush adds nothing else: no Defense, no Sight, no range, no healing.
- A Rushed unit that never moves or attacks still Crashes. Rush does not
  stop idle recovery: a Rushed unit that neither moved nor acted recovers at
  End Turn under the ordinary rule, then Crashes.

### 5.3 The Crash and Home Sweet Home

**State.** `GameStateV7.sugarRush: { unitId, phase: "RUSHED" | "CRASHED" }[]`,
sorted by unit ID, at most one entry per unit, empty in a match without a
Candy seat.

- **Crashed.** A unit with a `CRASHED` entry **cannot use a primary
  action** (`ATTACK`, `CAPTURE`, `RECOVER`, `PILLAGE`, `TEND_WOUNDED`,
  `REBAKE`, `SUGAR_TOSS`, and every other primary action its role has),
  rejected with `UNIT_CRASHED { unitId }` and never offered, and cannot
  `SUGAR_RUSH` (row 4 above). Where a command checks that the unit has not
  acted (`UNIT_ALREADY_ACTED`), the Crash is checked immediately before it,
  so a Crashed unit that also acted reports `UNIT_CRASHED`. It **may**
  Move, Wait, Promote, Disband, embark, and land. It keeps its zone of
  control, retaliates, Bounces, besieges, and recovers idle at End Turn if
  it did not move. A Crashed unit that moves onto a treasure chest, a
  Fountain, or a Shrine gets them as usual (none of them is an action).
- **The Crash step** runs at every seat's End Turn, for the active seat
  `P`, after the Dwarf per-turn lists are emptied
  ([section 10](#10-resolution-order)):
  1. every `CRASHED` entry of a unit `P` owns is removed (its Crash turn is
     over);
  2. every `RUSHED` entry (whoever owns the unit now) becomes `CRASHED`,
     **unless Home Sweet Home spares it**, in which case it is removed;
  3. if step 2 had at least one entry: event
     `UNITS_CRASHED { playerId: P, crashedUnitIds, sparedUnitIds }` (each
     sorted by unit ID).
- **Frequency.** A unit can Rush at most every other turn: Rush on its
  owner's turn `N`, Crashed during `N + 1`, Rush again on `N + 2`. With Home
  Sweet Home next to an own center it can Rush every turn.
- **Home Sweet Home** (`homeSweetHome`, from Fortification in the unit's
  kind's tree): in step 2, a Rushed unit is spared when its owner has the
  capability (`unitCapabilitiesV7`: the owner's research read through the
  kind's tree) and the unit stands, in any form, on or next to (Chebyshev
  distance at most `HOME_SWEET_HOME_RADIUS_V7` 1) a city center its owner
  owns. The radius is Dig In's. It makes Rush a defensive tool at the cities
  without making it free in the field.
- **Ownership changes.** Entries belong to units, not seats, so they survive
  Mind Control and release, and step 1 ends a Crash at the End Turn of
  whoever owns the unit then: a Crashed Candy unit taken by a Brain during
  the Martian turn loses its entry at that Martian End Turn (it has the
  exhausted activation of a fresh Mind Control anyway); a unit a Martian
  Rushed and that is released during the Martian turn is Crashed at that
  End Turn and recovers from it at its owner's next End Turn.
- An entry is removed when its unit leaves the board (death, Disband,
  removal, elimination), with no event.

### 5.4 Rush perks: Escape and Sugar Frenzy

Two roles get one more thing while Rushed (role mechanic `rushPerk`); no
other role has a perk.

- **Donut Racer (`"ESCAPE"`):** after an accepted `ATTACK` that it survives
  while Rushed, it is granted the Human Raider's **Escape**
  ([current rules section 12.2](RULESET_7_CURRENT.md#122-activation)): one
  more ordinary `MOVE` with a fresh budget of its role's Move (2). Every
  Escape rule applies (never for a sluggish unit; declined by Wait or End
  Turn; it is handled afterwards). The combat preview's `escapeAvailable`
  reports it.
- **Chocolate Bunny (`"SUGAR_FRENZY"`):** while Rushed it has the Knight's
  **Overrun**, displayed as **Sugar Frenzy**
  ([current rules section 13.4](RULESET_7_CURRENT.md#134-after-combat)):
  after it kills (an Egg counts) and advances, if a visible hostile unit is
  adjacent to its new cell it may `ATTACK` again, repeating until a
  non-kill, its death, no target, or **the cap**: at most
  `SUGAR_FRENZY_MAX_CONTINUATIONS_V7` (**2**) continuations, so at most
  three attacks per Rushed turn (root ruling,
  [section 21.4](#214-root-rulings)). The cap reads the existing
  `attacksUsed`: a continuation is granted only while `attacksUsed` is
  below 3, so no state is added. The Human Knight's Overrun and every other
  Overrun stay uncapped. The continuation attacks are at its base Attack 3
  (the Rush bonus was spent on the first attack). The preview's
  `overrunAdvance` reports it, and `overrunContinues` is false on the third
  attack. When not Rushed it has no Overrun.

### 5.5 Rush worked examples

Engine numbers at `0dd3686` ([section 11](#11-per-unit-battle-analysis)),
full HP, open Grass:

- A Toffee Trooper deals a Fighter 5 and takes 5; Rushed, 8 and takes 4. One
  Rushed Toffee Trooper and any second Toffee Trooper (plain is enough: 4 kills the
  4-HP Fighter) kill a full Fighter in one turn; plain Toffee Troopers need three
  attacks.
- **Rush trades total damage for burst.** Over two turns a Toffee Trooper's two
  plain attacks on fresh Fighters deal 10 (5 + 5); a Rush and a Crash deal 8. On the **same** Fighter a lone Toffee Trooper's second plain attack deals 4
  and takes 5, so it dies (5 + 5 of its 10 HP) where the Rushed Toffee Trooper took
  4: the Crash's price is tempo (no capture, no finishing blow, no answer to
  a new threat on the Crash turn), not damage.
- A Rushed Donut Racer moves three tiles (up to six along a Road), charges
  or not at Attack 3 (8 to a Fighter, 10 to a Marksman, a kill on a Catapult,
  a Captain, a Sled, or a Ray Gunner through its Shield of 2), and may
  Escape two tiles.
- A Rushed Pie Launcher hits a Walled Guard with Field Defense for 7 (5
  plain) from range 2 or 3 without moving.
- A Rushed Giant deals a Guard 14 and takes 5 (10 and 6 plain).

## 6. Crumbs and Re-baking

**One sentence:** a fallen Candy unit leaves Crumbs for three turns, and a
Confectioner next to them can bake that unit back at half price and half
HP.

Raise Dead turns any death into a free Skeleton; Assemble builds one fixed
construct from Coins. Re-bake brings back **the same role** that died, only
the seat's own, only for a price, only for three turns, and the enemy can
deny it by walking onto the Crumbs.

### 6.1 Crumbs

**State.** `GameStateV7.crumbs: { at, role, ownerId, turnsLeft }[]`, sorted
by `(y, x)`, at most one entry per tile, empty in a match without a Candy
seat. `role` is the dead unit's mechanical role, `ownerId` a Candy seat,
`turnsLeft` 1 to 3.

A death leaves **Crumbs** when all of these hold:

1. the dead unit is **owned by a Candy seat and is not mind-controlled**
   (so its kind is `CANDY` and its owner is that seat; a controlled Candy
   unit leaves none, [section 12.5](#125-martian-rules-and-mind-control));
2. its role has `leavesCrumbs` (the seven trainable land roles: never the
   Giant, never a boat);
3. it died in **land form** on a **land** tile (never water, an ice tile
   of the naval design included) that is not a settlement site (village or
   city center), not a Rift, and holds no treasure chest and no map
   curiosity (Fountain or Shrine);
4. it died by `UNIT_DIED` cause `ATTACK` (the Giant Spider's attacks
   included), `RETALIATION`, `SPLASH`, `WAIL`, `PLAGUE`, `EXPLOSION`,
   `SHATTER`, `BOMB`, `ERUPTION`, or `PEPPERMINT`, and **did not rise** (an
   Infect or Bitten rising leaves no Crumbs).

Removals leave none: Disband, reward displacement, elimination
(`ELIMINATION`), and `BRAIN_LOST`.

**Result.** Any Crumbs on the tile are replaced by
`{ at, role, ownerId, turnsLeft: CRUMBS_TURNS_V7 (3) }`. Event
`CRUMBS_LEFT { playerId: ownerId, at, role }`, immediately after the
death's `UNIT_DIED` and, when the death also made one, its `GRAVE_CREATED`
(Crumbs and a Grave may share a tile). Several deaths in one command leave
their Crumbs in the order of their deaths.

Crumbs occupy nothing: units stand on them, move through them, end Moves
on them, and are placed on them; they block no placement, no Move, no
Grave, and no sight, and exert no ZOC. They block only Re-bake while a
unit, an Egg, or a mound stands on them.

When a Candy seat is eliminated, its Crumbs are removed with its units (no
event).

### 6.2 Going stale

In the Crumbs step of every End Turn of a Candy seat `P`
([section 10](#10-resolution-order)), each of `P`'s Crumbs loses one turn;
those at 0 are removed. Event `CRUMBS_STALE { playerId: P, tiles }` (sorted
by `(y, x)`) when at least one was removed; the countdown itself has no
event (the Chill precedent).

Crumbs left during the Candy turn therefore last the rest of that turn and
two more Candy turns; Crumbs left during an enemy turn last three Candy
turns.

### 6.3 Eaten, and Peppermint Surprise

A unit **eats** Crumbs when it ends a `MOVE` (the final tile of an accepted
Move, an interrupted Move's final tile included, and the Donut Racer's or
Raider's Escape Move) or a `DISEMBARK` on their tile, and:

- it is in land form afterwards;
- its movement mode is not `FLY` (a Martian Saucer or Mothership and a Dwarf
  Gyrocopter never eat Crumbs; walkers do);
- its owner is **hostile** to the Crumbs' owner (`arePlayersHostileV7`).
  Own and allied units never eat them; the neutral owner (the Giant Spider)
  never eats them.

Nothing else eats Crumbs: passing over them inside a Move, an advance, Push,
Knockback, Bounce, the Tractor Beam's pull, a Charge! follow, an Overrun
continuation, rising, Raise Dead, Beam Down, hatching, surfacing, a tunnel
destination, a bombing-run landing, a Monster step, and every unit
placement. Such a unit just stands on them; if it later leaves by a Move it
ends elsewhere, so the Crumbs survive.

**Result.** The Crumbs are removed. If the Crumbs' owner has `crumbsBite` >
0 (**Peppermint Surprise**, `PEPPERMINT_DAMAGE_V7` 3), the eater takes that
fixed damage: Armoured takes 1 off (an Ankylosaurus takes 2), Plated caps
it, a Martian Shield absorbs first, and the rest comes off HP (capped at
HP). No cover, fortification, Snow, or Blizzard changes it. Event
`CRUMBS_EATEN { playerId: ownerId, at, role, unitId, damage, shieldDamage, dies }`
(all 0 and false without Peppermint Surprise). A death is an ordinary death
with `UNIT_DIED` cause `PEPPERMINT`: a Grave where the Grave rules allow, a
Bitten eater rises, an exploding Goblin unit explodes (with its chain),
credited to the Crumbs' owner with **no unit kill credit** (the
`EXPLOSION` precedent of
[current rules section 18.9](RULESET_7_CURRENT.md#189-kill-credit-plunder-and-friendly-fire)).
A Peppermint Surprise death of a Candy-kind unit owned by a Candy seat (only
possible in a test mirror) leaves its own Crumbs.

The eating step comes right after the Move's (or landing's) own events
(`UNIT_MOVED` or `UNIT_DISEMBARKED`, `UNIT_MOVE_INTERRUPTED`,
`TILES_REVEALED`, and Field Defense destroyed by occupation) and before the
rest of its tail (the economy, reward, and achievement events). A tile with
Crumbs never holds a chest or a curiosity, so eating and taking treasure or
claiming a Shrine never meet.

`crumbsBite` is public: on each Crumbs entry of the view (`bite`) and in the
`candy` block of a visible Candy unit's stats (the Ice Folk precedent for
the Shatter threshold), so the Move preview of an eater is exact.

### 6.4 The Re-bake command

`REBAKE { kind, unitId, at }` is a primary action of the Confectioner (it
may follow a Move). Legality, in this order (all rejections atomic):

| #   | Requirement                                                                                                                                                                                            | Rejection                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| 1   | `unitId` is the actor's own unit on the board.                                                                                                                                                         | the ordinary unit errors                   |
| 2   | Its role, under its kind, has `REBAKE` (a mind-controlled Confectioner's role rule drops it).                                                                                                          | `UNIT_ROLE_INVALID { role }`               |
| 3   | It is not Crashed.                                                                                                                                                                                     | `UNIT_CRASHED { unitId }`                  |
| 4   | It has not used a primary action and has not landed this turn; a sluggish Confectioner has not moved.                                                                                                  | `UNIT_ALREADY_ACTED`                       |
| 5   | It is in land form.                                                                                                                                                                                    | `REBAKE_NOT_LEGAL { reason: "EMBARKED" }`  |
| 6   | It has a home city owned by the actor (an orphaned Confectioner cannot Re-bake).                                                                                                                       | `REBAKE_NOT_LEGAL { reason: "NO_HOME" }`   |
| 7   | `at` is one of the eight tiles around it and holds Crumbs owned by the actor.                                                                                                                          | `REBAKE_NOT_LEGAL { reason: "NO_CRUMBS" }` |
| 8   | `at` holds no unit of any owner or form (an Egg included) and no mound, is enterable by the Crumbs' role (`canEnterTerrainV7` with the actor's research), and is not in territory allied to the actor. | `REBAKE_NOT_LEGAL { reason: "TILE" }`      |
| 9   | The home city has a free slot for the role (`used + 1 <= capacity`, [current rules section 4.4](RULESET_7_CURRENT.md#44-unit-capacity)).                                                               | `CITY_CAPACITY_FULL`                       |
| 10  | The actor has at least the price in Coins: `rebakePriceV7(role)` = `ceil(cost / 2)` of the role's printed cost (Arms Industry never applies).                                                          | `INSUFFICIENT_COINS`                       |

**Result.** The Coins are spent and the Crumbs removed. A new unit of the
Crumbs' role with the next entity ID stands on `at`: owned by the actor,
homed to the Confectioner's home city, at `rebakeHpV7(role)` =
`ceil(maxHp / 2)` HP of the role's maximum HP, with zero kills, not a
veteran, no status of the dead unit, the exhausted activation (it cannot
move, act, or Rush until its owner's next Start Turn), and
`captureEligible` false. Field Defense on `at` is destroyed when the tile's
territory belongs to a player hostile to the actor (reason `OCCUPATION`,
the Assemble and Beam Down precedent). The new unit reveals its sight. The
Confectioner has used its primary action and is handled. Events:
`UNIT_REBAKED { playerId, unitId, rebakedUnitId, role, at, cityId, cost, hp }`,
`FIELD_DEFENSE_DESTROYED`, `TILES_REVEALED`, then the economy, reward, and
achievement tail. It spends **no city action**, a siege of the home city
does not block it, and every tile around the Confectioner is explored by
its owner, so the command is exact.

### 6.5 Crumbs worked examples

- A Chocolate Bunny dies to retaliation next to a Fighter it attacked. Its
  Crumbs (`turnsLeft` 3) lie on its tile. On the next Candy turn a
  Confectioner steps next to them and Re-bakes a 7-HP Bunny for 5 Coins (a
  trained one costs 9), homed to the Confectioner's city; the Bunny can act
  the turn after.
- The Fighter instead ends its Move on the Crumbs: they are gone; with
  Peppermint Surprise it takes 3.
- The Fighter stands on the Crumbs because it advanced there after killing
  the Bunny: it did not eat them, and the Confectioner cannot Re-bake while
  it stands there; if the Fighter moves away, the Crumbs are still there.
- A Re-baked unit is fragile: a 5-HP Toffee Trooper dies to one Fighter hit (5),
  and a 9-HP Marshmallow takes 6 from a Fighter. A Re-bake is best made
  outside the enemy's reach or right before Home Sweet Home covers it.

## 7. Splat

**One sentence:** a unit hit by a Pie Launcher cannot strike back for the
rest of the Candy turn.

**State.** `GameStateV7.splattedThisTurn: UnitId[]`, sorted, the units
Splatted during the active seat's turn, emptied at its End Turn
([section 10](#10-resolution-order)); empty in a match without a Candy
seat.

- **Splatting.** After an `ATTACK` by a land-form unit whose role, under its
  kind, has `SPLAT` (the Pie Launcher), the target is added to
  `splattedThisTurn` if it is still on the board after the attack's deaths
  (it survived; a rising is a new unit), in any form, whether the hit went
  to HP or wholly to a Martian Shield, and even if it took 0. The **Giant
  Spider** (the neutral registration, on which no status sticks) is never
  Splatted ([section 12.9](#129-map-curiosities)). The Pie's own
  retaliation never Splats.
- **Splatted.** A unit in `splattedThisTurn` does not retaliate against any
  `ATTACK`: the exchange's `damageToAttacker` and `attackerShieldDamage` are
  0, `retaliation` is false, and `noRetaliationReason` is `SPLATTED` when
  the ordinary rules would have let it retaliate (otherwise the ordinary
  reason: `DEFENDER_DIED`, `UNANSWERED`, or `OUT_OF_RANGE`). With no
  retaliation there is no retaliation Lifesteal, bite, Infect, or kill. It
  keeps its Defense, fortification, cover, Shield, and every other rule; it
  still Bounces, Kabooms on its own turn, and exerts ZOC.
- **Order.** The Pie's own target is Splatted after the Pie's exchange, so a
  target that can reach the Pie (a Marksman at range 2) strikes back at the
  Pie that time; every later attack on it this turn is unanswered.
- An entry is removed when its unit leaves the board.
- The list belongs to the active seat's turn (a mind-controlled Pie's
  Splats help its controller on the controller's turn). Every attacker that
  benefits acts during that turn, so in a match of three or more players
  Splat helps only the Pie's owner.
- Splat belongs to a target, and every attacker benefits; the Vampire's
  Unanswered belongs to one attacker. It is the Candy answer to fortified
  defenders: it removes the price of attacking them, not their Defense.

## 8. Bounce

**One sentence:** a melee attacker that hits a Marshmallow or a Gingerbread
Giant and survives is bounced one tile back.

- **When.** An `ATTACK` made from distance 1 bounces its attacker when, after
  the exchange's deaths, the attacker and the defender are both on the
  board, the defender is in land form and its role, under its kind, has
  `BOUNCE` (the Marshmallow and the Giant), and the attacker's mechanical
  role is not `JUGGERNAUT` (so never a Juggernaut, Abomination, Troll,
  Brontosaurus, Colossus, Frost Giant, Brass Titan, Gingerbread Giant, or
  the Giant Spider). Two-slot units, flyers, and boats attacking from
  distance 1 are bounced. A Splatted or Crashed Marshmallow still Bounces.
- **Where.** After the Push, Knockback, advance, and Charge! follow steps,
  if the attacker is still at Chebyshev distance 1 from the defender, it is
  moved to `attacker.at + (attacker.at − defender.at)` (both read after
  those steps) when that tile passes the Push conditions for the attacker
  (`displacementDestinationLegalV7`: on the board, not a settlement site,
  the same land or water kind as the attacker's form, enterable by the
  attacker under its owner's research and movement mode, no unit and no
  mound, not in territory allied to the attacker) and holds no treasure
  chest (the Knockback precedent). Otherwise nothing happens (a blocked
  Bounce). The tile is always within the attacker's own sight, so there is
  no exploration condition and the attacker's preview is exact.
- **Not a Move.** The attacker keeps its `moved` flag, `movedPathLength`,
  `attacksUsed`, Escape, Chill, Plague, and Bitten; it takes no chest,
  claims no Shrine or Wreck, eats no Crumbs, destroys no Field Defense, and
  ignores ZOC and Snow. It loses Forest, Field Defense, Walls, or Dig In
  cover by leaving the tile (Dig In is read on its new tile). It reveals its
  sight at the new tile, like a pushed unit.
- **Event.** `UNIT_PUSHED { sourceUnitId: defender, targetUnitId: attacker, from, to }`
  (Bounce reuses the Push event, as Knockback does), then the attacker's
  `TILES_REVEALED`. The combat preview carries `bounce` and `bounceTo`.
- **Example.** A Triceratops's Charge! pushes a Marshmallow one tile and
  follows; the Triceratops is then bounced back to the tile its follow
  started from.
- Push and Knockback move the defender; Bounce moves the attacker. It
  breaks the attacker's next turn without a lock: a bounced Guard, Zombie,
  Orc Brute, or Ankylosaurus (which cannot attack after moving) cannot
  attack the Marshmallow on its next turn without walking back first, a
  bounced Goblin leaves the Gang Up ring, and a bounced unit loses its cover.

## 9. Frosting and Sugar Toss

- **Frosting** is the Confectioner's Tend Wounded under a Candy label
  (command `TEND_WOUNDED`, event `WOUNDED_TENDED`, `previewTendWoundedV7`),
  with every rule of
  [current rules section 10](RULESET_7_CURRENT.md#10-recovery-and-support):
  every adjacent own land-form unit other than the Confectioner, not yet
  tended this turn, that is damaged, plagued, bitten, or Chilled heals
  `min(2, maxHp − hp)`, is cured of Plague and Bitten, and a Chill entry
  becomes thawing. It does not end a Crash or a Splat. It is the Candy's
  only cure.
- **Sugar Toss** (`SUGAR_TOSS { kind, unitId, targetUnitId }`) is a primary
  action of the Gumball Gunner instead of an attack: a ranged heal, which
  no other faction has. **State:** `GameStateV7.tossedThisTurn: UnitId[]`,
  sorted, the units healed by a Sugar Toss during the active seat's turn,
  emptied at its End Turn. Legality, in this order (all rejections atomic):

  | #   | Requirement                                                                                     | Rejection                                           |
  | --- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------- |
  | 1   | `unitId` is the actor's own unit on the board.                                                  | the ordinary unit errors                            |
  | 2   | Its role, under its kind, has `SUGAR_TOSS`.                                                     | `UNIT_ROLE_INVALID { role }`                        |
  | 3   | It is not Crashed.                                                                              | `UNIT_CRASHED { unitId }`                           |
  | 4   | It has not used a primary action and has not landed this turn; a sluggish Gunner has not moved. | `UNIT_ALREADY_ACTED`                                |
  | 5   | It is in land form.                                                                             | `SUGAR_TOSS_NOT_LEGAL { reason: "EMBARKED" }`       |
  | 6   | `targetUnitId` is a unit on the board, other than the Gunner, in land form (never an Egg).      | `HEAL_TARGET_NOT_FOUND`                             |
  | 7   | The target is the actor's own unit.                                                             | `HEAL_TARGET_NOT_OWNED`                             |
  | 8   | The target is within Chebyshev distance `SUGAR_TOSS_RANGE_V7` (2) of the Gunner.                | `SUGAR_TOSS_NOT_LEGAL { reason: "OUT_OF_RANGE" }`   |
  | 9   | The target is not in `tossedThisTurn`.                                                          | `SUGAR_TOSS_NOT_LEGAL { reason: "ALREADY_TOSSED" }` |
  | 10  | The target is damaged (`hp < maxHp`).                                                           | `HEAL_TARGET_FULL`                                  |

  **Result.** The target heals `min(SUGAR_TOSS_HEAL_V7 (2), maxHp − hp)`
  and is added to `tossedThisTurn`; it cures nothing, does not use the
  target's action, and never heals a Shield. The Gunner has used its
  primary action and is handled. Event
  `SUGAR_TOSSED { playerId, unitId, targetUnitId, amount, hpAfter }`. Own
  units are always visible, so the command is exact. A unit can be healed
  by one Sugar Toss per turn (from any Gunner) and by one Frosting per turn,
  plus its ordinary recovery.

## 10. Resolution order

**An attack** is the ordinary resolution of
[current rules section 13](RULESET_7_CURRENT.md#13-combat-and-fortification)
with the Ice Folk and Dwarf steps, and these Candy steps in bold:

1. Attack value: base Attack and the existing bonuses; **+1 Sugar Rush**
   (a Rushed land-form attacker's first `ATTACK` this turn, unless Charge or
   Inspired applies). Defense: fortification, then cover.
2. Damage both ways from pre-combat HP (**no retaliation from a Splatted
   defender**: `damageToAttacker` 0, reason `SPLATTED`); the Blizzard;
   Armoured; Plated; Martian Shields absorb.
3. The Shatter test; Lifesteal; Sweep; kill credit; growth.
4. Field Defense destroyed on the target tile under the ordinary reasons
   (`CATAPULT` for a Pie Launcher).
5. Deaths in order, each with its Grave or rising **and then its Crumbs**
   (`UNIT_DIED`, `GRAVE_CREATED`, `CRUMBS_LEFT`); a Brain's releases.
6. **Splat:** a Pie Launcher's surviving target joins `splattedThisTurn`.
7. The Push and Knockback, then the advance and the Charge! follow.
8. **Bounce** of a surviving distance-1 attacker of a surviving Marshmallow
   or Giant (`UNIT_PUSHED`, `TILES_REVEALED`).
9. Death-blast chains (each death with its Crumbs), Plunder, reveals, and
   the ordinary tail; then the Overrun or **Sugar Frenzy** continuation
   (Sugar Frenzy only while `attacksUsed` is below 3) and
   **Escape** of a Rushed Donut Racer are available (a bounced attacker made
   no kill, so it has no continuation).

**The end of a Move or a landing:** the Move's own events, then **eating
Crumbs** ([section 6.3](#63-eaten-and-peppermint-surprise):
`CRUMBS_EATEN`, then a Peppermint Surprise death with its Grave, rising,
blast chain, and Plunder), then the rest of the tail.

**Start Turn** has no Candy step.

**End Turn,** for the active seat:

```text
idle recovery → Inspired and Overrun expire → Cooling → Force Fields →
Chill countdown → empty surfacedThisTurn and bombedThisTurn →
THE CRASH (end the active seat's Crashes; Rushed → Crashed or spared; UNITS_CRASHED) →
CRUMBS COUNTDOWN (the active seat's Crumbs; CRUMBS_STALE) →
EMPTY splattedThisTurn AND tossedThisTurn → income preview → next seat's Start Turn
```

The two new events come after the idle-recovery events and before
`INCOME_PREVIEWED`. If the Spider's neutral turn has landed, it runs after
the last seat's End Turn as its spec says, so it never sees a `RUSHED`
entry or a Splatted unit.

## 11. Per-unit battle analysis

### 11.1 Method

- **The engine, not a port.** Every number below was computed by the
  engine's `calculateCombatPreviewV7` on `main` at commit `0dd3686`
  (`pulp-wars-poc-7r35`), from a scratch Vitest file (not checked in) that
  builds hand-made states and replaces the role rule of a Candy unit
  (`unitRoleRuleV7`, through `vi.mock`) with the roster values of
  [section 3](#3-candy-roster) on the Human registration of its mechanical
  role. **Sugar Rush** is modelled by the activation's `inspired` flag,
  which adds the same 2 half-units to the same first attack; **Splat** by
  setting the retaliation aside; **Charge** by a Move of two tiles with
  Raiding; **Gang Up** by Goblin helpers around the target; Shields by
  `shields` entries; Walls and Field Defense by a Walled city center in the
  defender's territory. The Giant Spider is modelled as a 24-HP, Defense-2
  unit (its spec's stats; the Spider's own example "a Fighter deals 5 and
  takes 5" was reproduced).
- **The design's numbers** came from a port of the formula; the re-run
  agrees with every one of them except the readings listed in
  [section 21.1](#211-numbers-corrected-by-the-engine-re-run) (none is a
  roster number).
- **Reading the tables.** Opponents are at full HP on open Grass with no
  fortification and **no Snow** unless stated (an Ice Folk unit in its own
  territory stands on Snow and has cover: a Toffee Trooper then deals a Yeti 4 and
  takes 4, Rushed 8 and takes 3, no kill). "Deals / takes" is damage dealt
  and the retaliation taken back; "+2 sh" is what a Martian Shield absorbed;
  "kill" means the defender dies (no retaliation). Human Fighter, Raider, and
  Marksman have 12 HP, the Guard 17, the Knight 10.
- **The scratch file** is kept outside the repository, in the session
  scratchpad (`candy/spec/candy-numbers.test.ts`); `pulp_wars-jdb.3` re-runs
  the tables from this section with the real registration before coding
  ([section 18](#18-implementation-split-and-test-expectations)).

### 11.2 Toffee Trooper

_Fighter, 2 Coins, 10 HP, 2 / 2._

| Toffee Trooper attacks   | Plain       | Rushed (+1 first attack) |
| ------------------------ | ----------- | ------------------------ |
| Fighter                  | 5 / 5       | 8 / 4                    |
| Marksman or Raider       | 6 / 2       | 10 / 1                   |
| Catapult (10 HP)         | 7 / —       | 10, kill                 |
| Captain or Knight (10)   | 6 / 2       | 10, kill                 |
| Hammerer, Caveman, Skel. | 5 / 5       | 8 / 4                    |
| Yeti (9 HP, no Snow)     | 5 / 3       | 9, kill                  |
| Goblin (6 HP)            | 6, kill     | 6, kill                  |
| Grunt (Shield 2)         | 3 +2 sh / 3 | 7 +2 sh / 2              |
| Guard                    | 4 / 8       | 7 / 7                    |
| Zombie                   | 5 / 5       | 8 / 4                    |
| Fighter on Field Defense | 4 / 8       | 7 / 7                    |

| Attacker on a Toffee Trooper     | Deals / takes    |
| -------------------------------- | ---------------- |
| Fighter, Skeleton, Caveman, Yeti | 5 / 5            |
| Knight, Sabretooth, Scrap Buggy  | 8 / 4            |
| Raider or Wolf Rider with Charge | 8 / 4            |
| Raptor with Pounce               | 10, kill         |
| Goblin with Gang Up +2 (+1)      | 10, kill (6 / 4) |
| Catapult                         | 10, kill         |
| Lich (then splash 4 around it)   | 8 / —            |
| Vampire                          | 8, unanswered    |
| Marksman, Snow Hunter from 2     | 5 / —            |
| Ray Gunner (full power) from 2   | 8 / —            |

- **In a fight** the Toffee Trooper is a Skeleton that can spend its next turn for
  one strong hit ([section 5.5](#55-rush-worked-examples)). Its 10 HP is
  the faction's weak spot: a pouncing Raptor, a Catapult, or a Goblin with
  two helpers kills it outright.
- **Counters:** packs and area damage (Goblins, the Lich's splash, Bomb
  Chuckers), and attacking it in its Crash turn, when it answers only by
  retaliation.
- **Too strong?** No: at 2 Coins with 10 HP it loses an even trade to a
  12-HP Fighter unless it spends a Rush, and a Rush costs the next turn.
  **Too weak?** It is the cheapest Re-bake (1 Coin for 5 HP). The lever if
  it is too weak is HP 11.

### 11.3 Donut Racer

_Raider, 3 Coins, 10 HP, 2 / 1, Move 2._

| Donut Racer attacks      | Plain       | Charge (Raiding) or Rushed |
| ------------------------ | ----------- | -------------------------- |
| Fighter or Hammerer      | 5 / 5       | 8 / 4                      |
| Marksman or Raider       | 6 / 2       | 10 / 1                     |
| Catapult or Captain      | 7 or 6      | 10, kill                   |
| Sled (10 HP)             | —           | 10, kill (Charge)          |
| Ray Gunner (8, Shield 2) | 4 +2 sh / 2 | 8 +2 sh, kill              |

- Plain, it is a Wolf Rider or a Sled: Move 2, Sight 2, Charge +1 after
  moving two tiles. **Rushed** it moves three tiles (up to six along a
  Road) and may Escape after the attack: a hit-and-run raider every other
  turn. Because Rush and Charge do not add up, a Rushed charge is still
  Attack 3; the Rush buys reach and the getaway. Its attack equals the Human
  Raider's charge (8 / 4 on a Fighter).
- **Too strong?** In the first draft the bonuses added up (Attack 4 after a
  Rushed charge) and a 4-Coin unit killed a full 12-HP Fighter, Marksman,
  Raider, or Hammerer in one blow ([appendix A](#a2-the-critique) item 1).
  Now it equals the Human Raider (Escape every turn, 12 HP, 4 Coins) on its
  Rush turn and is a weaker raider on the Crash turn, when it can still
  move. **Too weak?** It captures villages like any raider (a Rush to reach
  a village does not help capture, because the Crash blocks the capture
  next turn; the reach still helps block a rival). Cost 3 keeps it the
  scouting buy.
- **Counters:** zones of control (it has no Prowl), a fortified line, and
  anything that kills 10 HP (a Knight deals it 10).

### 11.4 Gumball Gunner

_Marksman, 3 Coins, 8 HP, 2 / 1, range 1–2._

- It shoots like a 3-Coin Marksman with 8 HP: 5 to a Fighter from 2 (no
  answer), 6 / 2 against a Marksman at range 2; Rushed it moves 2 and shoots
  at 3 (10 / 1 against a Marksman, 8 to a Fighter). A Marksman deals it
  6 / 2; a Knight or a Catapult kills it in one blow (8).
- **Sugar Toss** heals one own unit within 2 by 2 instead of shooting. Two
  Gunners keep a Marshmallow or a Giant topped up from behind it; the
  once-per-turn limit stops five Gunners from healing one unit by 10.
- **Too strong or weak?** It is a Marksman with a second job; the heal is
  the Captain's per-unit amount, at range, on one unit. The tuning bound is
  heal 2–3.

### 11.5 Marshmallow

_Guard, 4 Coins, 18 HP, 1.5 / 2.5._

| Attacker on a Marshmallow           | Deals / takes | Then                                      |
| ----------------------------------- | ------------- | ----------------------------------------- |
| Fighter, Skeleton, Hammerer, Zombie | 4 / 6         | bounced 1 tile                            |
| Orc Brute                           | 4 / 6         | bounced                                   |
| Guard                               | 3 / 7         | bounced                                   |
| Knight                              | 7 / 5         | bounced (no Overrun: no kill)             |
| Raptor with Pounce                  | 9 / 5         | bounced                                   |
| Goblin with Gang Up +2              | 9 / 5         | bounced (out of the Gang Up ring)         |
| Mammoth                             | 6 / 6         | bounced (its Sweep still hits the flanks) |
| T-Rex                               | 11 / 4        | bounced (two-slot units are bounced)      |
| Catapult from 2                     | 9 / —         | no Bounce (not distance 1)                |
| Marksman from 2                     | 4 / —         | no Bounce                                 |
| Juggernaut                          | 11 / 4        | never bounced (`JUGGERNAUT`)              |

- It hits weakly: 3 / 5 against a Fighter (6 / 4 Rushed), the same as a
  Human Guard. A Human Guard takes 4 / 8 from a Fighter where the
  Marshmallow takes 4 / 6.
- **In a fight** it is a Guard that does not stay hugged: every melee
  attacker that does not kill it ends one tile away, so it cannot be ganged
  up on from the same ring twice, Guards and Zombies that bounce lose their
  next attack, and a line of Marshmallows in front of Gunners and a Pie
  keeps melee away from them for a turn per hit.
- **Its weakness:** ranged attackers ignore the Bounce, and a Bounce can
  save a fragile attacker from the Candy counterattack by throwing it out of
  reach. A player attacks a Marshmallow with ranged units first.
- **Too strong?** It has a Guard's body with less Defense (2.5 against 3)
  and a cost of 4 against 3; it cannot be fortified by Field Defense and
  cannot stop an attack, only move the attacker afterwards. Nothing is
  locked: the bounced unit acts normally next turn.

### 11.6 Confectioner

_Captain, 5 Coins, 10 HP, 1 / 1._

- **Frosting** is the Captain's Tend Wounded. It keeps the Confectioner
  useful before anything has died, and gives the Candy their only cure.
- **Re-bake** turns a death into a half-price, half-HP copy at the front.
  Per Coin it is strongest on the Chocolate Bunny (5 Coins for a 7-HP Bunny
  instead of 9 for a 14-HP one) and the Pie Launcher (4 for 5 HP).
- **In a fight** it stands one tile behind the line where its units die. A
  Vampire, a Knight, a pouncing Raptor, or a Lich kills it in one blow (10);
  a Fighter deals it 6 / 2. The Normal AI already hunts support units
  ([current rules section 16](RULESET_7_CURRENT.md#16-normal-ai-summary)).
  Killing the Confectioner is the main answer to the faction.
- **Too strong?** The loop "Rush, die, Re-bake" is the faction's engine,
  limited four ways: the Confectioner must survive next to the Crumbs, the
  Crumbs go stale in three turns, the enemy eats them by walking on them,
  and the copy comes back at half HP, which halves its attack force.

### 11.7 Pie Launcher

_Catapult, 8 Coins, 10 HP, 3 / 0.5, range 2–3._

| Target (from range 2)                     |      Pie | Pie Rushed | Catapult (3.5) |
| ----------------------------------------- | -------: | ---------: | -------------: |
| Fighter                                   |        8 |   12, kill |             10 |
| Guard (open)                              |        7 |         10 |              8 |
| Guard on Field Defense                    |        6 |          9 |              7 |
| Guard on Walls with Field Defense (3 lvl) |        5 |          7 |              6 |
| Ankylosaurus (Armoured)                   |        6 |          9 |              7 |
| Juggernaut                                |        6 |          9 |              7 |
| T-Rex                                     |        8 |         12 |             10 |
| Zombie                                    |        8 |         12 |             10 |
| Steam Mole                                |        7 |         11 |              9 |
| Shield Projector (Shield 3)               |  4 +3 sh |    8 +3 sh |        6 +3 sh |
| Captain                                   | 10, kill |   10, kill |       10, kill |

**Splat is the point.** The cracking of a Walled Guard (17 HP, Walls and
Field Defense):

| Step                | Candy                                        | Human, for comparison         |
| ------------------- | -------------------------------------------- | ----------------------------- |
| Siege shot          | Pie: 5, the Guard is Splatted (12 left)      | Catapult: 6 (11 left)         |
| First melee attack  | Rushed Toffee Trooper: 6, no answer (6 left) | Fighter: 3, takes 12 and dies |
| Second melee attack | Rushed Toffee Trooper: 6, kill               | —                             |

Without the Rush the Toffee Troopers deal 3 each; without the Pie a Rushed Toffee Trooper
deals 5 and takes 10 (it dies). Three Candy units kill the hardest defender
in the game in one turn without a loss. The brakes: the two Toffee Troopers are
Crashed next turn, the one that advanced onto the center cannot capture
until the turn after, the Pie is an 8-Coin, 10-HP, Defense-0.5 unit that a
Raider or a Knight kills in one blow, and the city's next defender walks
in. The same pair kills a full Zombie: Pie 8, then a Rushed Toffee Trooper 10
(kill), with no strike-back, so no bite and no Infect. The tuning lever, if
Splat proves too strong, is "Splat stops one strike-back"
([appendix B](#appendix-b-second-critique) item 1).

**Too weak?** Its own damage is lower than a Catapult's, so a Pie alone is
a worse Catapult; it is good only with followers, which is the intended
identity.

### 11.8 Chocolate Bunny

_Knight, 9 Coins, 14 HP, 3 / 1.5, Move 2 (Rushed 3)._

Rushed: Move 3, Attack 4 on the first attack, then Sugar Frenzy at 3, at
most two continuations (three attacks in all).

| Rushed chain (all targets fresh)                                 | Result (capped at three attacks)                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Fighter, Catapult, Captain, Marksman                             | kills Fighter (12), Catapult, Captain; the cap stops it; Bunny 14 HP                       |
| Marksman, Catapult, Knight, Skeleton                             | kills Marksman (12), Catapult, Knight; the cap stops it; Bunny 14 HP                       |
| Catapult, Captain, Lich, Necromancer, Yeti, Sled, Shaman, Knight | kills three (Catapult, Captain, Lich); the cap stops it (uncapped: all eight); Bunny 14 HP |
| Raider, Raider                                                   | kills one; the second 10 of 12; Bunny 13 HP                                                |
| Hammerer, Fighter                                                | kills the Hammerer (12); the Fighter 8 of 12; Bunny 10 HP                                  |
| Guard on Field Defense                                           | 9 of 17, takes 9                                                                           |
| Guard (open)                                                     | 10 of 17, takes 6                                                                          |
| Re-baked Bunny (7 of 14 HP), Fighter                             | 9 of 12, takes 5                                                                           |

So a Rushed Bunny kills at most three units a turn, and three only when the
second and third are soft. The uncapped engine runs (the same exchanges,
the chain simply continuing) went on to wound the Marksman (10 of 12, Bunny
13 HP) and the Skeleton (8 of 10, Bunny 10 HP), and killed all eight of a
soft line without a scratch: the predictable T-Rex chain the cap removes.

Within the cap, at Attack 3 a full-HP Bunny's continuation **kills** every unit of 10 HP or
less with Defense 1 or less: Catapult, Captain, Knight, Lich, Necromancer,
Vampire, Ghoul, Banshee, Shaman, Spitter, Yeti and Sled (no Snow), Snow
Hunter, Wolf Rider, Bomb Chucker, Rocket Cart, Scrap Buggy, Goblin, Brain,
Saucer, and Ray Gunner (through a Shield of 2), Gyrocopter, Clockwork
Gunner, Engineer, Steam Cannon. It **stops** on every 12-HP unit (Fighter
8 / 4, Marksman or Raider 10 / 1, Hammerer 8 / 4, Ice Witch 9 / 2, Orc
Warboss 10 / 1), every Defense-2 unit (Skeleton, Caveman 8 / 4), and a
shielded Grunt (7 +2 sh / 2).

| Attacker on a Chocolate Bunny | Deals / takes |
| ----------------------------- | ------------- |
| Fighter                       | 5 / 3         |
| Knight                        | 9 / 2         |
| Ray Gunner (full) from 2      | 9 / —         |
| Ray Gunner (full) from 1      | 9 / 2         |
| Catapult                      | 11 / —        |
| T-Rex                         | 13 / 2        |

- **The T-Rex lesson, checked.** The T-Rex was predictably dominant because
  three things stacked: 28 HP, unlimited Rampage at Attack 4 (which
  one-shot every 12-HP unit, so the chain never stopped on a line), and
  growth that fully healed it on a kill. The Bunny has half the HP, no
  growth or heal, Attack 4 only on its **first** attack, and at most two
  continuations; the continuation at 3 also stops on any 12-HP or
  Defense-2 unit. Then it is
  Crashed in the enemy's lines, where a Fighter and a Knight together kill
  it (at 13 HP: 5, then 8; at 10 HP: 6, then 4). The first draft gave +1 on
  every attack of the chain and one Bunny killed a Marksman, a Catapult, a
  Captain, and a Fighter without a scratch
  ([appendix A](#a2-the-critique) item 2).
- **The soft-line chain is capped.** Uncapped, a line of soft units only
  (Catapult, Captain, Lich, Necromancer, Yeti, Sled, Shaman, Knight in a
  row) died whole without a scratch, because a killed unit never strikes
  back: the same failure as the T-Rex's Rampage. The root capped Sugar
  Frenzy at two continuations ([section 21.4](#214-root-rulings)): three
  soft kills a turn at most, then the Crash.
- **The Triceratops lesson, checked.** The first Triceratops was weak
  because its power was in a separate lane command on a Move-1 body that
  trailed the army. The Bunny's power is the ordinary attack after one extra
  click, on a Move-2 (3 Rushed) body that leads the army.
- **Off its Rush turn** it is a 14-HP, Attack-3 brawler with no Overrun and
  Move 2: better than a Knight at holding a tile, worse at sustained
  killing and at reach.
- **Counters:** keep a full-HP Fighter or Guard in front of the soft units
  (the chain stops there), punish the Crash turn, and eat its Crumbs.

### 11.9 Gingerbread Giant

_Juggernaut, reward, 40 HP, 4 / 3.5._

- Juggernaut parity with Defense 3.5 (the Juggernaut's 4, the Troll's 3
  plus regeneration, the Titan's 3 plus Unflinching, the Colossus 2.5 plus a
  ray). A Juggernaut deals it 10 and takes 7; it deals a Juggernaut 9 / 9
  (Rushed 13 / 8), a Fighter 12 (kill), and a Guard 10 / 6 (Rushed 14 / 5).
  A Fighter deals it 3 / 10, a Knight 6 / 8.
- **Bounce** makes it the city anchor: melee units that hit it are thrown
  back, so a besieging ring keeps breaking.
- **Rush:** Move 2 and Attack 5 on a first attack, then a Crash. A Giant
  that Rushes off its city to kill something leaves the city without its
  attack next turn; next to its own center, Home Sweet Home makes the Rush
  free (the named lever "Home Sweet Home off the Giant" watches it).

### 11.10 The faction as a whole

- **Early (rounds 1–10):** Toffee Troopers and Donut Racers expand like any
  faction; Rush matters from the first contact (a Rushed Toffee Trooper and any
  second Toffee Trooper kill a Fighter), and the Crash makes the Candy predictable
  for one turn. Drill (Marshmallow) or Marksmanship (Gunner) are the second
  technologies.
- **Mid (rounds 10–20):** Administration (Confectioner) turns deaths into
  Re-bakes; Sawmilling (Pie) opens fortified cities. The identity is
  complete by round 15 without Chivalry, which matters because the Normal
  AI reaches tier-3 units late.
- **Strong against:** fortified, slow, high-retaliation defenders (Guards on
  Walls, Zombies, dug-in Hammerers and Moles, Ankylosaurs), melee-heavy
  armies (Bounce), soft back lines (the Bunny).
- **Weak against:** area damage and packs (Goblins, the Lich, Bomb
  Chuckers, the Mammoth's Sweep: 10-HP bodies), armies that punish the
  Crash turn, fast units that reach Crumbs and Confectioners (a Raptor or a
  Sabretooth eats Crumbs; a Saucer or a Gyrocopter cannot eat them but kills
  Confectioners), and Shields (a Shield 2 absorbs more than a Rush adds).
- **Too many mechanics?** Four pillars, two support abilities, and two
  technology effects, against the Dwarves' tunnel, mound, eruption, ride,
  bombing run, clockwork, twin shot, Dig In, Repair, Assemble, Knockback,
  and Plated. Every Candy rule fits in one sentence
  ([section 15.3](#153-help-text)).

## 12. Interactions with existing rules

Every Candy rule needs a Candy unit or a Candy seat; in a match without a
Candy seat no Rush, Crash, Crumbs, Splat, Bounce, or Toss exists and no
Candy command is offered ([section 17](#17-unchanged-behaviour-of-the-other-factions)).

### 12.1 Human abilities

| Rule                 | Interaction                                                                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Field Defense, Walls | Count fully against Candy attacks; only Splat removes the retaliation. Field Defense that already stands in territory a Candy seat captures fortifies Candy units as usual. |
| Catapult             | Destroys Field Defense; out-ranges every Candy unit but the Pie Launcher; deals a Toffee Trooper or a Confectioner 10 (kill) and a Marshmallow 9.                           |
| Juggernaut, Push     | Never bounced (`JUGGERNAUT`). Pushes Candy units under the ordinary conditions; a pushed unit keeps its `sugarRush` entry and eats nothing.                                 |
| Knight, Overrun      | A Knight that hits a Marshmallow without killing it is bounced and has no continuation. Overrun after killing a Candy unit is ordinary.                                     |
| Raider               | Charge and Escape are ordinary; a bounced Raider may still Escape. A Raider that ends its Escape Move on Candy Crumbs eats them.                                            |
| Captain              | Its Tend Wounded heals Human units only (own units); it ends no Crash. Rally is Human only; the Confectioner has none.                                                      |

### 12.2 Undead rules

| Rule       | Interaction                                                                                                                                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graves     | Candy units are living: a Candy death leaves a Grave where the Grave rules allow **and** its Crumbs (same tile; event order `UNIT_DIED`, `GRAVE_CREATED`, `CRUMBS_LEFT`).                                                    |
| Raise Dead | Raises onto the tile as usual (a placement: the Skeleton stands on the Crumbs, eats nothing, and blocks Re-bake until it leaves). Re-bake does not consume the Grave, and a re-baked unit blocks Raise Dead until it leaves. |
| Devour     | Ordinary. A Ghoul that ends its Move on the Grave's tile eats the Crumbs there.                                                                                                                                              |
| Infect     | A Candy unit killed by a Zombie rises as the Zombie's owner's Zombie and leaves no Crumbs. A Splatted Zombie never retaliates, so it neither infects nor bites by retaliation.                                               |
| Bitten     | Candy units are bitten as usual; Frosting cures it. A Bitten Candy unit that dies rises and leaves no Crumbs; a Bitten eater killed by Peppermint Surprise rises.                                                            |
| Plague     | Applies to Candy units; Plague deaths leave Crumbs; Frosting cures it.                                                                                                                                                       |
| Wail       | Not an attack: no Bounce, no Splat interplay; Wail deaths leave Crumbs.                                                                                                                                                      |
| Lich       | Its shot and splash are ordinary (8 to a Toffee Trooper, splash 4 around it; 10 to a Confectioner); splash deaths leave Crumbs.                                                                                              |
| Vampire    | Its attacks are unanswered anyway; Splat on a Vampire stops its Lifesteal retaliation. A Vampire that hits a Marshmallow without killing it is bounced.                                                                      |
| Restless   | An Undead rule only.                                                                                                                                                                                                         |
| Frenzy     | Ordinary.                                                                                                                                                                                                                    |

### 12.3 Goblin rules

| Rule         | Interaction                                                                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gang Up      | Ordinary (a Goblin with two helpers kills a Toffee Trooper: 10). A bounced Goblin leaves the target's ring and no longer helps Gang Up there.                                                     |
| Kaboom       | Fixed damage; Kaboom deaths of Candy units are `EXPLOSION` deaths and leave Crumbs. A Splatted goblin-crewed unit may still Kaboom on its own turn (Splat stops retaliation only).                |
| Death blasts | A Sugar Frenzy that kills an exploding unit takes its blast like any Overrun; a Peppermint Surprise death of an exploding unit explodes with its chain; blast deaths of Candy units leave Crumbs. |
| Plunder      | A Goblin seat earns 1 Coin for each Candy unit its units or blasts kill. Peppermint Surprise deaths are credited to the Candy seat, which never has Plunder.                                      |
| Troll        | A `JUGGERNAUT`: never bounced.                                                                                                                                                                    |
| Ram          | The Scrap Buggy's Ram is Overrun: a Buggy that hits a Marshmallow without killing it is bounced.                                                                                                  |
| Eating       | Goblin ground units eat Crumbs like any hostile ground unit.                                                                                                                                      |

### 12.4 Dinosaur rules

| Rule              | Interaction                                                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eggs              | Targets for every Candy unit; a Sugar Frenzy may continue after destroying an Egg. An Egg on Crumbs blocks Re-bake; laying or hatching is a placement and eats nothing. |
| Charge!           | The Triceratops ignores fortification as usual; after its push and follow it is bounced by a surviving Marshmallow or Giant ([section 8](#8-bounce)).                   |
| Two-slot bodies   | The T-Rex and the Triceratops are bounced; the Brontosaurus (`JUGGERNAUT`) is not. A T-Rex's Rampage after a non-kill is over anyway.                                   |
| Armoured          | Takes 1 off a Peppermint Surprise (the Ankylosaurus takes 2) and off Candy hits as usual.                                                                               |
| Acid, Wallbreaker | Ordinary against Candy units and cities.                                                                                                                                |
| Growth            | A dinosaur grows from killing Candy units as from any kill. Peppermint Surprise credits no unit, so it never grows anyone.                                              |
| Alpha             | A Splatted Alpha does not retaliate.                                                                                                                                    |
| Eating            | Dinosaurs eat Crumbs.                                                                                                                                                   |

### 12.5 Martian rules and Mind Control

| Rule                  | Interaction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shields               | Absorb Candy hits and Peppermint Surprise first. Splat applies when the Shield took the whole hit. A Shield of 2 absorbs more than a Rush adds.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Flyers, walkers       | Saucers and Motherships never eat Crumbs; Tripods and Colossi (walkers, on the ground) do. A Mothership that attacks a Marshmallow from distance 1 is bounced (under the Push conditions for a flyer).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Tractor Beam          | May pull a Crashed unit or one standing on Crumbs; a pull eats nothing; the pulled unit keeps its `sugarRush` entry.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Beam Down             | A placement: never eats Crumbs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Psychic Command       | On a controlled Candy unit: Inspired, and then the Rush bonus does not add.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Mind Control          | A Candy unit at 6 HP or less is a target under the ordinary conditions; the Gingerbread Giant (`JUGGERNAUT`) is immune. A taken unit keeps its `sugarRush` entry ([section 5.3](#53-the-crash-and-home-sweet-home)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Controlled Candy unit | By the kind and controller rules of [current rules section 20.9](RULESET_7_CURRENT.md#209-mind-controlled-units): **body rules follow the kind**, so it Rushes and Crashes for its controller (Home Sweet Home read through `unitCapabilitiesV7` from the controller's research and its centers), keeps its Rush perk, Bounces, Splats (into the controller's turn list), and Tosses and Frosts the controller's units; **seat rules follow the controller**, so it is hostile to the Candy seat and **eats Candy Crumbs**; **no spawning under control**, so its role rule drops `REBAKE` (`MIND_CONTROLLED_LOST_ABILITIES_V7`). **It leaves no Crumbs when it dies:** Crumbs are a Candy seat's resource for spawning, and its owner is the Martian seat ([section 21.2](#212-precise-readings-of-the-design) reading 6). A released unit returns with its entries and the exhausted activation. |
| Thralls               | Retired by the Mind Control overlay; nothing to rule.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Disintegrator, rays   | Ordinary; a full-power Ray Gunner deals a Chocolate Bunny 9.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

### 12.6 Ice Folk rules

| Rule                         | Interaction                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Snow                         | Deep snow stops a Candy ground unit's Move on entering Snow, Rushed or not (the extra Move does not cross Snow). Ice Folk defenders on Snow have cover against Candy attacks (a Rushed Toffee Trooper deals a Yeti on Snow 8 and takes 3). |
| Chill, sluggish              | A sluggish unit may Rush and then either moves or acts; a Crashed unit cannot act anyway, so the two combine harmlessly. Frosting thaws Chill.                                                                                             |
| Shatter                      | A shattered Candy unit leaves Crumbs (no Grave).                                                                                                                                                                                           |
| Blizzard                     | Halves a Gunner's or a Pie's hit from distance 2 or more on an Ice Folk unit of the Witch's seat in her Blizzard (after the Rush bonus).                                                                                                   |
| Mammoth                      | A Mammoth that hits a Marshmallow without killing it is bounced after its Sweep; its Trample destroys Field Defense as usual.                                                                                                              |
| Sabretooth, Bolas, Cold Aura | Ordinary.                                                                                                                                                                                                                                  |
| Eating                       | Ice Folk ground units eat Crumbs.                                                                                                                                                                                                          |

### 12.7 Dwarf rules

| Rule               | Interaction                                                                                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bombs, eruptions   | Fixed damage; their Candy deaths leave Crumbs.                                                                                                                                         |
| Gyrocopter         | A flyer: never eats Crumbs; a bombing-run landing is not a Move anyway.                                                                                                                |
| Tunnel, mound      | A tunnel may end on a Crumbs tile; the mound blocks Re-bake; surfacing is not a Move, so a surfaced Mole or rider standing on Crumbs did not eat them (a later Move away leaves them). |
| Dig In             | Counts against Candy attacks; Splat stops a dug-in unit's retaliation.                                                                                                                 |
| Steam Tank, Plated | A Tank that hits a Marshmallow without killing it is bounced; Plated caps Peppermint Surprise (no effect at 3).                                                                        |
| Brass Titan        | A `JUGGERNAUT`: never bounced.                                                                                                                                                         |
| Knockback          | Moves a Candy unit like any (it keeps its entries; it eats nothing).                                                                                                                   |
| Steam Mole         | A Mole that hits a Marshmallow without killing it is bounced; its advance after a kill on a Candy unit stands on the Crumbs without eating them.                                       |
| Engineer           | Repair is Dwarf only.                                                                                                                                                                  |

### 12.8 Rift

- No Candy unit enters a Rift. A ground attacker is never bounced onto one
  (`canEnterTerrainV7`), so no Candy unit dies there and no Crumbs lie
  there. A flyer bounced off a Marshmallow may land on a Rift (flyers stand
  there).

### 12.9 Map curiosities

| Curiosity              | Interaction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fountain of Youth      | Heals a Candy unit like any unit (not Frosting: it ends no Crash). Crumbs are never left on a Fountain.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Shrine                 | Promotes an eligible Candy unit that ends a Move on it, a Crashed unit included. Crumbs are never left on a Shrine.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Sunken Wreck           | Salvaged by Candy afloat units as by any.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Giant Spider (Monster) | When it lands ([its spec](RULESET_7_MAP_CURIOSITIES.md#86-what-affects-the-monster)): its attacks are ordinary `ATTACK`s, so Candy deaths leave Crumbs. It is `JUGGERNAUT`-role, so it is **never bounced**. **No status sticks to it, so it is never Splatted** (`splatApplied` false). It never eats Crumbs (the neutral owner is not a seat, and its step is not a Move) and may stand on them, blocking Re-bake while it does. Candy units provoke it and earn its bounty as usual; a Rushed Toffee Trooper deals it 8 and takes 4 (plain 5 / 5). |

### 12.10 Missions and the campaign

- A `MISSION` setup accepts a Candy seat once the faction is registered; the
  mission builder starts the four Candy lists empty. The teaser chapter
  does not use the Candy.
- Mission-forbidden technologies work as for every faction: forbidding
  Administration removes the Confectioner (Frosting and Re-bake),
  Fortification Home Sweet Home, Explosives Peppermint Surprise.
- The campaign AI's mission directive `RUSH` is an AI job word, unrelated
  to Sugar Rush; no player-facing text may use "Rush" for it.

### 12.11 Cities, siege, capture, and capacity

- **Capture-capable Candy units:** every Candy land unit since
  `pulp_wars-ke95` (before it: Toffee Trooper, Donut Racer, Gumball Gunner,
  Marshmallow, Gingerbread Giant). A Crashed unit cannot capture (Capture is a
  primary action): a unit that Rushed onto a center captures two turns later
  at the earliest.
- **Siege.** A Candy unit on a hostile center besieges it like any unit, a
  Crashed one included.
- **Capacity.** Every Candy role uses one slot; a Re-baked unit needs and
  takes a slot in the Confectioner's home city, so Re-bake never exceeds
  capacity; Candy cities have no capacity bonus; a reward Giant may exceed
  capacity.
- **Training.** Every Candy land unit except the Giant is trained on the city
  center with `TRAIN`, with the ordinary gates.
- Crumbs never lie on a settlement site. Re-bake spends no city action. A
  city's Candy look changes with its owner (art only).

### 12.12 Movement, zone of control, and Roads

- The Rushed budget is the only movement change: every stop, cost, and
  pass-through rule is unchanged, and the public movement query offers the
  Rushed destinations once the unit is Rushed.
- Crashed units exert and suffer ZOC. Bounce ignores ZOC. Crumbs exert none
  and occupy nothing.

### 12.13 Boats, embarking, and water

- Candy boats are the Human Patrol Boat and Battleship (drawn in the Candy
  style); they cannot Rush and leave no Crumbs.
- An embarked unit cannot Rush; a Rushed unit that embarks still Crashes; a
  Crashed embarked unit may land. A unit landing with `DISEMBARK` on hostile
  Crumbs eats them.
- A boat attacking a Marshmallow from distance 1 is bounced onto water under
  the Push conditions. Splat applies to boats and embarked units (which do
  not retaliate when embarked anyway).

### 12.14 Fog and observation

- **Crumbs** are public on every explored tile (`{ at, role, ownerId, turnsLeft, bite }`),
  as Graves are; `CRUMBS_LEFT` and `CRUMBS_STALE` (its tiles filtered) are
  projected like `GRAVE_CREATED`, to viewers who explored the tile before or
  after the command.
- **`sugarRush`, `splattedThisTurn`, and `tossedThisTurn`** are public for
  visible units (like `chilled`). `UNIT_SUGAR_RUSHED` is projected like
  `UNIT_MOVED` (to viewers who see the unit); `UNITS_CRASHED` like
  `UNITS_RALLIED` (results filtered to visible units); `SUGAR_TOSSED` like
  `WOUNDED_TENDED`; `UNIT_REBAKED` like `UNIT_ASSEMBLED`.
- **`CRUMBS_EATEN`** is projected to the Crumbs' owner always (with
  `unitId` null and `damage`, `shieldDamage`, and `dies` null when it cannot
  see the eater) and to every viewer who sees the eater or explored the
  tile.
- `homeSweetHome` and `crumbsBite` are public in the `candy` block of a
  visible Candy unit's stats, and `bite` on each Crumbs entry, so every
  Candy preview is exact: Rush reach reads explored tiles and public Snow,
  Re-bake and Toss read own units and own Crumbs next to own units, and an
  eater's Move preview reads the public bite.
- No Candy rule reveals or hides a unit. Capacity, city actions, research,
  and Coins stay owner-private.

### 12.15 Promotion, Disband, achievements

- **Promotion** is the ordinary rule for every Candy unit (a Crashed unit
  may Promote; a promoted Toffee Trooper has 15 HP); a Re-baked unit starts with 0
  kills. Peppermint Surprise credits no unit kill.
- **Disband:** every trainable Candy unit, Crashed or not; never the Giant.
- **Achievements** are unchanged and name no faction rule. Muster counts the
  Candy trainable roles owned on the board (a Re-baked unit counts at once);
  Slayer never counts Peppermint Surprise deaths (no unit credit).

### 12.16 Starting units, rewards, and treasure

| Source                             | Human      | Undead      | Goblin      | Dinosaur     | Martian   | Ice Folk    | Dwarf        | Candy                           |
| ---------------------------------- | ---------- | ----------- | ----------- | ------------ | --------- | ----------- | ------------ | ------------------------------- |
| Starting units                     | Fighter    | Skeleton    | one Goblin  | one Caveman  | one Grunt | one Yeti    | one Hammerer | one Toffee Trooper              |
| Level-3 Militia reward (`MILITIA`) | Fighter    | Skeleton    | two Goblins | one Caveman  | one Grunt | one Yeti    | one Hammerer | one Toffee Trooper              |
| Level-5+ reward (`JUGGERNAUT`)     | Juggernaut | Abomination | Troll       | Brontosaurus | Colossus  | Frost Giant | Brass Titan  | Gingerbread Giant               |
| Treasure chest unit                | Knight     | Vampire     | Scrap Buggy | Raptor       | Saucer    | Sled        | Gyrocopter   | **Donut Racer** (role `RAIDER`) |

Reward and treasure units arrive at full HP, exhausted until their owner's
next Start Turn. `treasureUnitRole` is `RAIDER` for the Candy registration
(the Dinosaur, Martian, Ice Folk, and Dwarf precedent); a treasure Donut
Racer needs a city with a free slot, otherwise the chest gives 5 Coins.
Faction rules: `restless` false, `cityCapacityBonus` 0, `gangUpMaximum` 0,
`treasureUnitRole` `RAIDER`, `snow` false.

### 12.17 One faction per player

- `pulp_wars-jdb.3` adds `CANDY` to every list the one-faction-per-player
  rule keeps: the distinct-faction defaults (setups, AI seats, the headless
  tools, the Showcase) and the option lists (the setup select, the headless
  `--factions` words, any validation that enumerates factions), with a test
  that a setup with a Candy seat and three others is legal and a duplicate
  Candy seat is `DUPLICATE_FACTION`.
- **There is no Candy mirror** in the browser or the balance matrix, but
  every rule here is written per seat or per unit (`splattedThisTurn` and
  `tossedThisTurn` belong to the active seat; Crumbs have an `ownerId`;
  hostility decides eating), so a test mirror with `allowDuplicateFactions`
  stays correct.
- **Ownership is shown by the Candy look alone** (plus borders and
  pennants): the art must not be confused with another faction at 32 px
  ([section 15.4](#154-what-the-art-bead-must-draw)).

## 13. Commands, events, errors, state, and queries

**Commands.** `COMMAND_KIND_ORDER_V7` inserts `SUGAR_RUSH`, `REBAKE`, and
`SUGAR_TOSS`, in that order, immediately after `ASSEMBLE`:

- `SUGAR_RUSH { kind, unitId }` ([section 5.1](#51-the-sugar-rush-command));
- `REBAKE { kind, unitId, at }` ([section 6.4](#64-the-re-bake-command));
- `SUGAR_TOSS { kind, unitId, targetUnitId }` ([section 9](#9-frosting-and-sugar-toss)).

`MOVE` uses the Rushed budget for a Rushed unit; every primary action is
refused for a Crashed unit with `UNIT_CRASHED`; `ATTACK` applies the Rush
bonus, Splat, and Bounce; `TEND_WOUNDED` is the Confectioner's Frosting;
`RALLY` and `BUILD_FIELD_DEFENSE` are never offered to a Candy seat. A
pending city reward blocks the new commands like every command.

**State.** Four new lists, hashed, saved, and replayed like `chilled`:

```text
sugarRush:        { unitId, phase: "RUSHED" | "CRASHED" }[]   // sorted by unitId
crumbs:           { at, role, ownerId, turnsLeft: 1 | 2 | 3 }[] // sorted by (y, x)
splattedThisTurn: UnitId[]                                    // sorted
tossedThisTurn:   UnitId[]                                    // sorted
```

State parsing rejects:

- an unsorted list or a duplicate entry (a unit or a tile twice), and any
  entry in a match without a Candy seat;
- a `sugarRush` entry whose unit is not on the board, is not of kind
  `CANDY`, or is not in land or embarked form;
- a `splattedThisTurn` entry whose unit is not on the board or is a neutral
  Monster;
- a `tossedThisTurn` entry whose unit is not on the board or is not in land
  form;
- a `crumbs` entry whose tile is not a land tile of the board, or is a
  settlement site, a Rift, a chest tile, or a curiosity tile; whose
  `ownerId` is not an active Candy seat; whose `role` does not have
  `leavesCrumbs` under the Candy registration; or whose `turnsLeft` is
  outside 1 to 3.

**Domain events.** `DOMAIN_EVENT_KIND_ORDER_V7` inserts seven kinds:

```text
UNITS_CRASHED     { playerId, crashedUnitIds, sparedUnitIds }                     // before INCOME_PREVIEWED
CRUMBS_STALE      { playerId, tiles }                                             // after UNITS_CRASHED
UNIT_REBAKED      { playerId, unitId, rebakedUnitId, role, at, cityId, cost, hp }  // after UNIT_ASSEMBLED
UNIT_SUGAR_RUSHED { playerId, unitId, move }                                      // after UNITS_CHILLED
SUGAR_TOSSED      { playerId, unitId, targetUnitId, amount, hpAfter }              // after WOUNDED_TENDED
CRUMBS_EATEN      { playerId, at, role, unitId, damage, shieldDamage, dies }       // after UNIT_MOVE_INTERRUPTED
CRUMBS_LEFT       { playerId, at, role }                                          // after GRAVE_CREATED
```

- `playerId` is the acting seat for `UNIT_REBAKED`, `UNIT_SUGAR_RUSHED`, and
  `SUGAR_TOSSED`, the active seat for `UNITS_CRASHED` and `CRUMBS_STALE`,
  and the Crumbs' owner for `CRUMBS_EATEN` and `CRUMBS_LEFT`.
- `UNIT_DIED.cause` gains `PEPPERMINT`.
- Bounce reuses `UNIT_PUSHED` (source the defender, target the attacker);
  Frosting reuses `WOUNDED_TENDED`; Splat has no event (it is in the
  attack's `COMBAT_RESOLVED` preview).
- The Crash ending and the Crumbs countdown have no event of their own.

**Combat preview.** `CombatPreviewV7` (and therefore `COMBAT_RESOLVED`)
gains four fields, neutral for every attack with no Candy unit:

| Field              | Meaning                                                                                                                                               | Neutral  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `sugarRushApplied` | the attacker's Rush bonus (2 half-units) is in `attack2`                                                                                              | false    |
| `splatApplied`     | the attack Splats its surviving target ([section 7](#7-splat))                                                                                        | false    |
| `bounce`           | `"NONE"` (no Bounce applies), `"WILL_BOUNCE"`, `"BLOCKED"`, or `"UNKNOWN_BEHIND_FOG"` (only in an estimate by a viewer who has not explored the tile) | `"NONE"` |
| `bounceTo`         | the attacker's tile after the Bounce for `"WILL_BOUNCE"`, otherwise null                                                                              | null     |

`noRetaliationReason` gains `SPLATTED`; `escapeAvailable` reports a Rushed
Donut Racer's Escape and `overrunAdvance` a Rushed Chocolate Bunny's Sugar
Frenzy. `CombatOptionsV7` gains `assumeSugarRush` (estimate the attacker as
Rushed, for the AI and the Rush preview; the bonus then applies under the
ordinary first-attack conditions).

**Errors.** `RuleErrorCodeV7` gains `UNIT_CRASHED { unitId }` (every primary
action and `SUGAR_RUSH` of a Crashed unit), `SUGAR_RUSH_NOT_LEGAL` (reasons
`EMBARKED`, `RUSHED`), `REBAKE_NOT_LEGAL` (`EMBARKED`, `NO_HOME`,
`NO_CRUMBS`, `TILE`), and `SUGAR_TOSS_NOT_LEGAL` (`EMBARKED`,
`OUT_OF_RANGE`, `ALREADY_TOSSED`). Re-bake and Toss also use the existing
`UNIT_ROLE_INVALID`, `UNIT_ALREADY_ACTED`, `CITY_CAPACITY_FULL`,
`INSUFFICIENT_COINS`, `HEAL_TARGET_NOT_FOUND`, `HEAL_TARGET_NOT_OWNED`, and
`HEAL_TARGET_FULL`.

**Registration.** Faction `CANDY`, tree `CANDY_BASELINE_V1`, display name
"Candy"; unlock kinds `CONFECTIONER_SUPPORT`, `HOME_SWEET_HOME`, and
`PEPPERMINT_SURPRISE`; capabilities `homeSweetHome` and `crumbsBite`;
abilities `SUGAR_RUSH`, `BOUNCE`, `SPLAT`, `REBAKE`, and `SUGAR_TOSS`
(Frosting keeps the `TEND_WOUNDED` literal); role mechanics `rushPerk` and
`leavesCrumbs`, with `capacitySlots` 1 and `buildsFieldDefense` false for
every role and `advancesAfterKill` false for the Pie Launcher; faction
rules of [section 12.16](#1216-starting-units-rewards-and-treasure);
`MIND_CONTROLLED_LOST_ABILITIES_V7` gains `REBAKE`; and the constants
`SUGAR_RUSH_MOVE_BONUS_V7` 1, `SUGAR_RUSH_ATTACK2_V7` 2,
`HOME_SWEET_HOME_RADIUS_V7` 1, `CRUMBS_TURNS_V7` 3, `PEPPERMINT_DAMAGE_V7`
3, `SUGAR_TOSS_HEAL_V7` 2, `SUGAR_TOSS_RANGE_V7` 2, and
`SUGAR_FRENZY_MAX_CONTINUATIONS_V7` 2, with
`rebakePriceV7(role)` = `ceil(cost / 2)` and `rebakeHpV7(role)` =
`ceil(maxHp / 2)`. Internal field names are the implementer's choice; the
serialized literals of this section are normative. (As built,
`"UNKNOWN_BEHIND_FOG"` is also the `bounce` of a Triceratops's Charge!
whose own push is unknown, and a Rushed unit's Attack stat carries a
`SUGAR_RUSH` modifier: [section 25](#25-fold-notes-pulp_wars-jdb8).)
`assertRuleset7Registry` must accept the eighth tree unchanged (same node
IDs, tiers, branches, prerequisites, and tactical-role labels).

**Derived queries** for canonical state and for a view:

- `unitIsRushedV7`, `unitIsCrashedV7`, and `unitIsSplattedV7`;
- `crumbsAtV7(state | view, at)`; `crumbsBiteV7(state | view, ownerId)`;
- `homeSweetHomeSparesV7(state, unit)` (the End Turn test, also used by the
  UI's "won't Crash here" chip on the owner's view).

**Public queries.**

```text
previewSugarRushV7(view, unitId) → null | { unitId, move, destinations: CoordV7[], newDestinations: CoordV7[],
                                            homeSweetHome: boolean }
previewRebakeV7(view, unitId)    → null | { unitId, cityId, usedSlots, capacity,
                                            options: [{ at, role, cost, hp }] }
previewSugarTossV7(view, unitId) → null | { unitId, targets: [{ unitId, amount, hpAfter }] }
previewCrumbsEatV7(view, unitId, to) → null | { at, ownerId, role, damage, shieldDamage, dies }
```

- `queryPlayerCommandsV7` offers, for a Candy seat: `SUGAR_RUSH` for every
  legal unit, `REBAKE` for every legal `(Confectioner, at)`, `SUGAR_TOSS`
  for every legal `(Gunner, target)`, the Rushed `MOVE` destinations once a
  unit is Rushed, a Rushed Donut Racer's Escape Moves, and a Rushed Chocolate
  Bunny's Sugar Frenzy attacks. It never offers a primary action or
  `SUGAR_RUSH` for a Crashed unit, `SUGAR_RUSH` for a moved or embarked
  unit, `RALLY`, or `BUILD_FIELD_DEFENSE` to a Candy seat. Every offered
  command is accepted.
- `previewSugarRushV7` (null unless `SUGAR_RUSH` is offered) gives the
  destinations of the unit's Move if it Rushes (the movement query with the
  Rushed budget) and those it cannot reach without the Rush;
  `previewRebakeV7` the price, HP, slot, and legal tiles;
  `previewSugarTossV7` the legal targets and their heals;
  `previewCrumbsEatV7` (null unless a `MOVE` or `DISEMBARK` of the unit to
  `to` is offered and would eat Crumbs) the exact Peppermint Surprise.
- `queryCombatPreviewV7` and `estimateCombatV7` include the Rush bonus (from
  the attacker's `sugarRush` entry, or `assumeSugarRush`), Splat (from
  `splattedThisTurn`), and Bounce.
- `queryThreatenedTilesV7` gives a visible Candy unit that is **not Crashed
  and not Rushed** its reach as if Rushed (Move + 1) with +1 on its first
  attack, and a Crashed or Rushed one no attack reach for the next turn (a
  Rushed unit will be Crashed then, unless Home Sweet Home spares it, which
  is read from the public capability and its tile at query time).
- `publicUnitStatsV7` carries, for every unit when a Candy seat is in the
  match, `rushed`, `crashed`, `splatted`, and `tossedThisTurn` (booleans),
  and for Candy units a `candy` block: `sugarRush` (true for land roles),
  `rushPerk` (`"ESCAPE"`, `"SUGAR_FRENZY"`, or null), `bounces`, `splats`,
  `rebake` (`{ cost, hp }` for a role that leaves Crumbs, otherwise null),
  and the owner's `homeSweetHome` and `crumbsBite`.
- `PublicPlayerV7` and the leaderboard carry `CANDY` and
  `CANDY_BASELINE_V1`.
- Every preview equals the resolution.

## 14. Normal AI requirements

Normal AI plays as and against the Candy (`pulp_wars-jdb.4`) with every
existing guarantee: deterministic and PRNG-free, only the public view,
public commands, and public previews, at most 128 accepted commands per
owner turn through bounded resumable work, and no change to decisions in
matches without a Candy seat (every Candy heuristic is gated on a match
with a Candy seat, in a new `src/ai/v7-candy.ts`, or reads a fact only such
a match has: a `candy` stat block, a Crumbs entry, a `sugarRush` entry). It
builds on the campaign plan of
[`pulp_wars-9s0.1`](../architecture/NORMAL_AI.md#campaign-expansion-exploration-and-standing-pressure-pulp_wars-9s01).

From `pulp_wars-jdb.3` on, a Candy seat must already play complete headless
matches without a policy error or stall, using the ordinary policy on the
Candy registration (it never Rushes, Re-bakes, or Tosses there; Frosting is
the ordinary Tend Wounded).

**The user's rule for AI changes.** A change to a strategy heuristic comes
with a modest head-to-head or win-tendency test: the same seeds, mirrored
seats, a few dozen decided games. For this bead: the Candy policy against
the ordinary policy playing the Candy registration (the `jdb.3` baseline),
against the same opponents, and each "against the Candy" rule against the
policy without it. A rule that does not tend to win is dropped, however
sensible it reads. `CandyPolicyOptionsV7` switches the groups on and off
for these tests; with all off the policy decides as the `jdb.3` baseline,
byte for byte.

As the Candy it must at least:

- **Rush for a reason.** Consider Rush only for a unit that is not Crashed,
  has not moved, and has a visible hostile unit within its Move + 1 + its
  maximum range (Chebyshev), or is on the way to a threatened own city (an
  own center with a visible hostile unit within 2); this bounds the extra
  queries. For such a unit compare its best plain plan with its best Rushed
  plan (the same attack choice over `previewSugarRushV7` destinations and
  `estimateCombatV7` with `assumeSugarRush`). Rush (one `SUGAR_RUSH`, then
  the plan's Move and Attack) when:
  1. the Rushed plan kills a target that no plain plan of this unit kills,
     **and** the unit does not end in visible lethal reach
     (`queryThreatenedTilesV7` damage at least its HP plus Shield) unless
     the kill is a `CATAPULT`, `CAPTAIN`, or `KNIGHT`-role unit; or
  2. the Rushed Move reaches a threatened own city center (empty of own
     units) that the plain Move cannot; or
  3. the seat has Home Sweet Home and the unit attacks from a tile on or
     next to an own center (the Rush is free there).
     The Chocolate Bunny Rushes only under rule 1 and only when, after the first
     kill and its advance, a Sugar Frenzy target is adjacent, or the first kill
     is a `CATAPULT`, `CAPTAIN`, or `KNIGHT`-role unit.
- **Crashed units step back.** A Crashed unit with a visible hostile melee
  unit adjacent moves to the reachable tile with the lowest threat
  (`queryThreatenedTilesV7`) when it is lower than where it stands,
  otherwise it holds (Wait). Crashed units are not counted as attackers in
  the wave plan of their Crash turn.
- **Re-bake.** A Confectioner ranks own Crumbs within 3 of it (Chebyshev):
  the most expensive role first, then the lowest `turnsLeft`, then `(y, x)`.
  It moves next to the best one it can reach this turn (the ordinary Move
  choice, avoiding tiles in visible lethal reach) and Re-bakes when the
  command is offered. A Re-bake comes before `TRAIN` in its city's
  production that turn. Between deaths it Frosts like a Captain tends.
- **Pie first.** Order the wave so a Pie Launcher that can hit the target
  the melee units will attack shoots it first, preferring targets with
  fortification 1 or more, Defense 2.5 or more, or a previewed retaliation
  of at least half the first melee attacker's HP; the melee attacks then
  see `noRetaliationReason: "SPLATTED"` in their previews.
- **Sugar Toss.** A Gunner Tosses when it has no offered `ATTACK`, or its
  best `ATTACK` neither kills nor deals at least 3; the target is the
  offered one with the highest role cost (a Giant counts 12), then the
  lowest HP, then the lowest unit ID.
- **Marshmallows to the front:** positioned like a Guard in the wave's front
  row; the Giant garrisons the most threatened own city.
- **Avoid fragile Re-bakes:** never Re-bake onto a tile in visible lethal
  reach of the copy's HP unless Home Sweet Home or an own unit would cover
  it (the preview gives the copy's HP).
- **Produce every role:** the ordinary production value plus a
  first-of-role bias for the Marshmallow, the Gunner, the Confectioner, the
  Pie Launcher, and the Chocolate Bunny; Toffee Troopers first under threat.
- **Research toward its roles:** the ordinary free opener; then Drill when a
  hostile unit is in sight, else Marksmanship; Administration at two cities;
  Sawmilling against a visible Walled city or at three cities; Home Sweet
  Home once an own city has been threatened (a visible hostile unit within
  3 of a center); then Chivalry; Peppermint Surprise late.

Against the Candy it must at least:

- **read the Crash:** `queryThreatenedTilesV7` already gives a Crashed or
  Rushed Candy unit no attack reach next turn and a free one its Rushed
  reach; prefer attacking a Crashed unit over an equal target (a tie-break
  of the ordinary attack score);
- **eat Crumbs:** end a routine Move on hostile Crumbs when the tile is
  otherwise no worse for the job (within the ordinary tie of the Move
  score), unless `previewCrumbsEatV7` says the bite kills or the tile is in
  visible lethal reach;
- **hunt Confectioners** in the support-unit hunt of the second pass (the
  `SUPPORT` label already puts them there);
- **respect Bounce:** a melee attack whose preview says `"WILL_BOUNCE"` is
  scored as if the attacker ended one tile back (its route progress minus
  1), and a ranged attack on the same target is preferred when both score
  within 1;
- **Martian seats:** nothing new (Shields already absorb in the previews).

Headless matches of the Candy against each faction must finish without
stalls or policy errors, and unit tests (`tests/unit/ruleset-v7-candy-ai.test.ts`)
cover: a Toffee Trooper that Rushes for a kill it could not make plain; one that
does not Rush into lethal reach for a non-key kill; a Crashed unit that
steps back; a Confectioner that walks to Chocolate Bunny Crumbs and Re-bakes; a
Pie that shoots before the melee; a Gunner that Tosses when its shot is
weak; a Chocolate Bunny that does not Rush without a continuation or key kill;
an opponent that eats Crumbs; an opponent that kills the Confectioner
first; an opponent that prefers a Crashed target.

### 14.1 Implementation status (`pulp_wars-jdb.4`)

Implemented in `src/ai/v7-candy.ts`, with ten switchable groups in
`CandyPolicyOptionsV7`: `rush`, `crashRetreat`, `rebake`, `pieFirst`,
`sugarToss`, `production`, and `research` for the Candy seat, and
`readCrash`, `eatCrumbs`, and `respectBounce` for every seat against it.
[Candy play](../architecture/NORMAL_AI.md#candy-play-pulp_wars-jdb4)
describes the rules as built, with their priorities and the head-to-head
results (27 to 13 in the Candy mirror against the `jdb.3` policy). Where it
differs from the list above:

- **Not implemented** (no bead yet): the wave plan still counts
  Crashed units as attackers, and Marshmallows and the Giant use the generic
  Guard and Juggernaut placement (no "Marshmallows to the front", no Giant
  garrison rule).
- **Narrower:** the Home Sweet Home Rush (rule 3) is never taken by a
  Confectioner or for a chip by a unit below half its HP; a Gunner does not
  Toss while it has an offered attack on a unit that threatens an own city;
  a fragile Re-bake is allowed next to an own center or beside an own
  fighting unit (the technology is not read); Crumbs are not eaten when the
  bite would be taken for a role that costs less than 4 or would take half
  the eater's HP.
- **Simpler:** a `WILL_BOUNCE` melee attack loses 1 on its score, which is
  also what makes an equal ranged attack win (there is no separate
  ranged-preference rule); a Crashed hostile unit adds nothing to the
  danger estimate and wins a tie of the attack score.
- **Research order:** Drill with a hostile unit in sight, else
  Marksmanship; Home Sweet Home once a visible hostile unit is within 3 of
  an own center; Administration at two cities; Sawmilling against a visible
  Walled city or at three cities; then Drill, Chivalry, and Peppermint
  Surprise.
- **Dropped after its head-to-head test:** adding the Rush bonus of every
  free hostile Candy unit to the danger estimate (11 to 18; it was not in
  this contract).

## 15. UI requirements

### 15.1 Surfaces

The browser UI (`pulp_wars-jdb.6`) must, at requirement level, and under
the [no-coordinates, minimal-text rule](../ui/SCREEN_FLOW.md#no-coordinates-minimal-text-bead-pulp_wars-b5f8)
(no text names a tile; aiming panels are the ability's icon and name, a
`?`, the unit buttons, and the confirm, Back, and Cancel buttons; the board
carries targets, numbers, ghosts, and dots):

- offer "Candy" in every seat's faction select under the
  one-faction-per-player rule;
- label every unit by its kind's registration and render the technology
  tree (Home Sweet Home, Peppermint Surprise), research offers, action
  chips, and Help in the viewer's faction text ([section 4](#4-technology));
- **Sugar Rush:** a dock button on an own unit that may Rush. Pressing it
  arms the Rush: the board shows the Rushed reach (the destinations of
  `previewSugarRushV7`, the new ones in a sparkle tint) and attack previews
  with the +1; choosing a destination or a target dispatches `SUGAR_RUSH`
  and then the `MOVE` or `ATTACK` (an `ATTACK` in place sends `SUGAR_RUSH`
  then `ATTACK`); pressing it again, Back, or Cancel disarms it and sends
  nothing. The aiming panel is the Rush icon, "Sugar Rush", `?`, Back;
- **markers** (code-drawn first, art later): Rushed (a sparkle trail and a
  small lollipop-lightning chip), Crashed (a dizzy swirl over the head and a
  droopy tint of the sprite), Splatted (a cream pie on the face), Crumbs (a
  crumb pile on the tile with the role icon and up to three pips for
  `turnsLeft`), Bounce (a spring "boing" animation and, in the attack
  preview, an arrow to `bounceTo`), Home Sweet Home (on the owner's view, a
  small house chip on a Rushed unit that will not Crash where it stands);
- **Re-bake:** a Confectioner command; choosing it highlights the offered
  Crumbs tiles with a ghost of the unit, its price, and its HP; a click
  confirms. Disabled with a reason (no Crumbs next to it, city full, Coins,
  no home, Crashed). The animation is a whisk, an oven puff, and the unit
  popping out;
- **Sugar Toss:** a Gunner command; the targets in range are highlighted with
  "+n"; a click confirms; the animation is a sweet thrown in an arc;
- **Frosting:** the Confectioner's Tend Wounded button, relabelled, with the
  targets highlighted;
- **previews:** the attack preview shows "Sugar Rush +1", "Splat" when the
  attack Splats, "No strike-back: Splatted", "Bounces back" or "Bounce
  blocked" (the board's arrow shows where); a Move preview onto hostile
  Crumbs shows "Eats Crumbs" and the Peppermint damage;
- **unit info and Help:** the one-liners of [section 15.3](#153-help-text),
  the role table, and the technology names;
- **log lines** for a Rush, the Crash (a count), a Re-bake, Crumbs eaten
  (with the Peppermint damage), Crumbs gone stale, a Sugar Toss, a Splat, and
  a Bounce;
- look identical to the previous revision in matches without a Candy seat,
  apart from the extra faction option.

### 15.2 Labels and text

No text names a tile; `{unit}`, `{owner}`, `{city}`, and `{n}` are names
and numbers.

| Surface                          | Text                                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| Faction option                   | Candy                                                                                    |
| Sugar Rush command               | Sugar Rush                                                                               |
| Sugar Rush `?`                   | +1 Move and +1 Attack on its first attack this turn. Next turn it Crashes and can't act  |
| Rushed (chip)                    | Rushed: +1 Move, +1 Attack on its first attack                                           |
| Rushed Donut Racer (chip)        | Rushed: may move again after attacking                                                   |
| Rushed Chocolate Bunny (chip)    | Sugar Frenzy: attacks again after a kill, twice at most                                  |
| Home Sweet Home (chip)           | Home Sweet Home: won't Crash here                                                        |
| Crashed (chip, its owner's turn) | Crashed: can move, can't act this turn                                                   |
| Crashed (chip, otherwise)        | Crashed: can't act on its next turn                                                      |
| Sugar Rush unavailable           | Crashed; Already moved; Already rushed                                                   |
| Crumbs (tile info)               | {unit} Crumbs: {n} turns left                                                            |
| Crumbs bite (tile info)          | Peppermint Surprise: an enemy that eats them takes {n}                                   |
| Move preview onto Crumbs         | Eats Crumbs; Eats Crumbs: −{n}                                                           |
| Re-bake command                  | Re-bake                                                                                  |
| Re-bake `?`                      | Bake the unit in adjacent Crumbs back at half price and half HP. Uses a slot in its city |
| Re-bake target (name)            | Re-bake {unit}: {n} Coins, {n} HP                                                        |
| Re-bake unavailable              | No Crumbs next to it; {city} is full; Not enough Coins; No home city; Crashed            |
| Sugar Toss command               | Sugar Toss                                                                               |
| Sugar Toss `?`                   | Heal an own unit within 2 tiles by 2. Each unit once a turn                              |
| Sugar Toss target (name)         | Toss to {unit}: +{n}                                                                     |
| Sugar Toss unavailable           | No wounded unit within 2 tiles; Crashed                                                  |
| Frosting command                 | Frosting                                                                                 |
| Frosting tooltip                 | Heal adjacent units by 2. Cures Plague, bites, and frost                                 |
| Attack preview (Rush)            | Sugar Rush +1                                                                            |
| Attack preview (Splat)           | Splat: no strike-back this turn                                                          |
| Attack preview (Splatted target) | No strike-back: Splatted                                                                 |
| Attack preview (Bounce)          | Bounces back; Bounce blocked                                                             |
| Splatted (chip)                  | Splatted: can't strike back this turn                                                    |
| Bouncy (unit info)               | Bouncy: melee attackers spring back                                                      |
| Field Defense unavailable        | Candy can't build Field Defense                                                          |
| Log (Rush)                       | {owner} {unit} went on a Sugar Rush                                                      |
| Log (Crash)                      | {owner}: {n} unit(s) crashed                                                             |
| Log (Re-bake)                    | {owner} Confectioner re-baked a {unit}                                                   |
| Log (eaten)                      | {unit} ate {owner}'s Crumbs; Peppermint Surprise: {unit} −{n}                            |
| Log (stale)                      | {owner} Crumbs went stale                                                                |
| Log (Toss)                       | {owner} Gumball Gunner tossed sugar to a {unit} (+{n})                                   |
| Log (Splat)                      | {unit} was Splatted                                                                      |
| Log (Bounce)                     | {unit} bounced back                                                                      |

### 15.3 Help text

One sentence per rule, shown in Help for every viewer:

- **Sugar Rush:** before it moves, a Candy unit may Rush: +1 Move and +1
  Attack on its first attack this turn, but next turn it is Crashed and
  can't act.
- **Crashed:** this unit can move but can't attack, capture, or use
  abilities this turn; it still strikes back.
- **Crumbs:** a fallen Candy unit leaves Crumbs for three turns; enemies
  that walk onto them eat them.
- **Re-bake:** the Confectioner bakes the unit in adjacent Crumbs back, at
  half its price and half its HP.
- **Splat:** a unit hit by a Pie Launcher can't strike back for the rest of
  the Candy turn.
- **Bounce:** a melee attacker that hits a Marshmallow or a Gingerbread Giant
  and survives is bounced one tile back.
- **Sugar Toss:** the Gumball Gunner heals an own unit within 2 tiles by 2,
  once per unit per turn.
- **Frosting:** the Confectioner heals adjacent units by 2 and cures Plague,
  bites, and Chill.
- **Sugar Frenzy:** a Rushed Chocolate Bunny attacks again after a kill, up to
  three attacks in a turn.
- **Donut Racer:** a Rushed Donut Racer may move again after attacking.
- **Home Sweet Home:** a Rushed unit that ends its turn on or next to your
  city center doesn't Crash.
- **Peppermint Surprise:** an enemy that eats your Crumbs takes 3 damage.

### 15.4 What the art bead must draw

`pulp_wars-jdb.5` makes the art direction fragment
`docs/art/factions/CANDY.md` from [the faction template](../art/factions/FACTION_TEMPLATE.md)
under the shared [art direction](../art/ART_DIRECTION.md) and the
[chibi direction](../art/CHIBI_ART_DIRECTION.md), with user approval of the
fragment and subject lines, then the production art under the PixelLab
workflow of the project instructions (needs PixelLab access). **Faction
looks replace the coloured base plates**: every Candy piece is registered
with fixed colours, no owner area and no mask, and the look alone must say
"Candy" at 32 px. Until the art exists, a Candy unit draws the Human sprite
of its role with a Candy badge (a wrapped sweet), and the markers are
code-drawn.

**Faction colour (root ruling).** Cotton-candy pink **`#ffb8d8`** (L\* 82),
measured by the design with the method and grounds of
[FACTION_COLOURS.md](../art/FACTION_COLOURS.md) (CIE76, Machado 2009 at
severity 1):

| Against            | Normal | Deuteranopia | Protanopia |
| ------------------ | -----: | -----------: | ---------: |
| Human `#d01c3a`    |   64.0 |         53.4 |       51.9 |
| Undead `#a221ee`   |   92.5 |         79.4 |       78.0 |
| Goblin `#fdd20f`   |   95.5 |         84.9 |       94.6 |
| Dinosaur `#fe7500` |   82.2 |         76.4 |       76.3 |
| Martian `#e83aae`  |   54.6 |         27.3 |       41.5 |
| Ice Folk `#10b8ff` |   60.3 |         49.8 |       29.0 |
| Dwarf `#2db885`    |   82.9 |         24.1 |       34.6 |

Its weakest pairs (Martian 54.6 normal, Dwarf 24.1 deuteranopia, Ice Folk
29.0 protanopia) are above today's weakest pairs (Human/Dinosaur 49.1,
Goblin/Dinosaur 20.6, Martian/Ice Folk 26.6). Against the grounds it is
78.6 from Grass, 49.7 from Shallow Water, 53.5 from Deep Water, 33.3 from
Mountain, and 56.5 from Snow with normal vision; its weak spot is **Shallow
Water under a deficiency (4.1)**, where the light line in its dark casing
must carry it, as the Martian magenta does on Deep Water (10). These are
the design's measurements (not engine numbers, so not re-run here); the art
bead re-measures in `tests/unit/faction-colours-render-v7.test.ts` and may
propose a candy-cane (pink and white) border dash if the captures fail on
Shallow Water.

**Look.**

- **Materials:** glossy hard candy with a hard white highlight, soft
  translucent jelly, matte marshmallow, wafer and biscuit, chocolate,
  frosting, candy-cane stripes, sprinkles. Fixed colours (the converted
  direction of [VISUAL_DIRECTION_2026-10.md](../art/VISUAL_DIRECTION_2026-10.md),
  no owner mask): cream and marshmallow white, cotton-candy pink, mint as
  small trim, caramel and chocolate browns. No large area close to another
  faction colour: no magenta, saturated violet, hazard yellow, orange, ice
  blue, or jade.
- **Silhouettes:** round and squat, big glossy highlights, every unit an
  edible object with a face. At zoom 0.75 they must read apart from the
  Goblins (also small and round: Candy is pastel and glossy, Goblins olive
  and scrap) and the Ice Folk (also white: Candy is pink and warm, Ice Folk
  blue and cold).
- **The 32 px lineup, before any batch:** in colour and in greyscale, side
  by side at native size: the Toffee Trooper against the Goblin and the Yeti; the
  Marshmallow against the Mammoth and the Ice Witch; the Chocolate Bunny against
  the Sabretooth; the Confectioner against the Engineer and the Brain. The
  lineup sheet and its verdict are review evidence of the bead.
- **Ruleset 6 Candy art** (the frozen Candy Warrior, Gumball Guard, Choco
  Engineer, Donut, Marshmallow Medic, Jawbreaker, Candy Crusher, Sugar
  Titan, and the lollipop-forest and rock-candy terrain) is a different
  style and stays frozen. It informs only the motifs; no Ruleset 6 asset is
  reused, and terrain stays the shared Ruleset 7 terrain.
- **IP guard:** the faction negative fragment includes banana guards,
  gumball-machine guardian statues, a pink-haired princess, a lab coat with
  a crown, a peppermint butler, a lemon-headed figure, and the show's name.
  Each sample is checked by eye for likeness to the show's characters as
  well as for the usual chibi criteria.

**Pieces** (subjects `UNIT:CANDY:<ROLE>`, IDs `chibi-direction-candy-*`):

| Piece                                                   | Design intent in one line                                                                                                                                                                                   |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toffee Trooper (unit, portrait)                         | A gumdrop soldier with a candy-cane spear and a wafer shield: the plain soldier.                                                                                                                            |
| Donut Racer (unit, portrait)                            | A candy-corn kid riding a frosted donut that rolls like a wheel.                                                                                                                                            |
| Gumball Gunner (unit, portrait)                         | A jellybean with a gumball blaster.                                                                                                                                                                         |
| Marshmallow (unit, portrait)                            | A big square marshmallow with a graham-cracker shield.                                                                                                                                                      |
| Confectioner (unit, portrait)                           | A round caramel sweet in an apron and brass goggles, with a whisk: the unit to find and kill. Never a princess or a lab coat.                                                                               |
| Pie Launcher (unit, portrait)                           | A gingerbread catapult with a cream pie in its cup.                                                                                                                                                         |
| Chocolate Bunny (unit, portrait)                        | A big translucent gummy bear brawler.                                                                                                                                                                       |
| Gingerbread Giant (unit, portrait)                      | A hulking golem of rock-candy crystals bound with caramel; never a gumball machine.                                                                                                                         |
| Patrol Boat, Battleship, transport, two portraits       | A chocolate-bar boat with a wafer sail; a layered-cake galleon with candy-cane masts; a floating donut ring. The shared hull canvases, anchors, and waterline ([naval factions](../art/NAVAL_FACTIONS.md)). |
| Cities (village, city, capital, with and without Walls) | Cake and candy houses with frosting roofs and lollipop trees, growing by level; Walls of wafer and hard candy. Faction building looks belong to `pulp_wars-xdh`.                                            |
| Faction emblem and badge                                | A wrapped sweet, for the faction select, the leaderboard, and the fallback badge.                                                                                                                           |
| Technology icons                                        | Home Sweet Home (a gingerbread house) and Peppermint Surprise (a peppermint swirl with a spark).                                                                                                            |
| Command icons                                           | Sugar Rush (a lollipop lightning bolt), Re-bake (a whisk and an oven mitt), Sugar Toss (a sweet in an arc), Frosting (a piping bag).                                                                        |
| Markers                                                 | Crumbs (one pile; the role shown by a code-drawn icon, not one sprite per role), the Crashed swirl, the Rushed sparkle, the Splat pie, the Bounce spring.                                                   |
| Effects                                                 | Gumball shot, pie flight and splat, tossed sweet, Re-bake puff, Peppermint pop, Bounce spring.                                                                                                              |

The art bead generates a small sample per class, inspects every result at
native and enlarged size, runs the 32 px lineup before batching, and only
then batches. The Crumbs pile and the Crashed swirl are reviewed on every
terrain and on Snow. Its review command is a new
`npm run art:chibi-candy-direction-review` (after
`art:chibi-dwarf-direction-review`), plus `art:faction-colours-review` and
`art:faction-looks-review`.

## 16. Naval branch

The naval branch expansion (epic `pulp_wars-5ti`) has its design on `main`
([RULESET_7_NAVAL_BRANCH.md](RULESET_7_NAVAL_BRANCH.md), `pulp_wars-5ti.1`,
commit `50de0bf`; not yet implemented or approved). It grows the Naval
branch to five technologies (Seamanship: the Patrol Boat's Ram and every
ship's Board; Submersibles: the Submarine and Harbours) for the seafaring
factions, and replaces the Ice Folk's ships with a frozen sea. Its
[section 7](RULESET_7_NAVAL_BRANCH.md#7-the-other-seafaring-factions) has
the other seafaring factions copy the Human branch exactly, with "no faction
rule applies to a boat" and no tweak found necessary. **The Candy follow
that rule:** a seafaring faction with the Human naval branch, unchanged.

- **Today** (before naval step I) the Candy have the current Human Patrol
  Boat and Battleship, drawn in the Candy style, with no Candy rule.
- **With naval step I** (whichever of it and the Candy engine lands second
  adds the other's part): the Candy tree gets Seamanship and Submersibles
  with the Human unlocks, and the Candy registration gets the `SUBMARINE`
  role with the Human numbers, abilities (`ATTACK`, `SUBMERGED`,
  `TORPEDO`), and tactical label, drawn in the Candy style. The Patrol Boat
  has `RAM`. No Candy boat has `SUGAR_RUSH`, `BOUNCE`, `SPLAT`, or
  `leavesCrumbs`. **No tweak:** the design's candidate "Sugar Rush for
  ships" hook is dropped, because the naval design gives no faction a boat
  hook.
- **Art concept** for the Candy Submarine (map sprite and portrait): a
  chocolate-bonbon diving bell with a wafer conning tower and a candy-cane
  periscope, half submerged; the Patrol Boat stays the chocolate-bar boat
  with a wafer sail, the Battleship the layered-cake galleon, the transport
  the floating donut ring ([section 15.4](#154-what-the-art-bead-must-draw)).
- **Interactions** that follow from the two designs, stated so the engine
  and the AI get them right:
  - the Pie Launcher (range 2–3) can never target a Submarine (Submerged:
    only from distance 1); the Gumball Gunner can from distance 1, and the
    Submarine, which torpedoes only afloat units, answers it as an ordinary
    retaliation;
  - a ship that attacks a Marshmallow or a Giant on the shore from distance
    1 is bounced over water under the Push conditions (a Ram targets only
    afloat units, so it never meets a Bounce); an embarked Marshmallow does
    not Bounce;
  - a Pie Launcher's surviving ship target is Splatted like any unit (a
    Splatted Battleship does not answer later attacks that turn); boarding
    is not an attack and ignores Splat;
  - a Candy death afloat or **on ice** is a water death: no Grave and **no
    Crumbs** ([section 6.1](#61-crumbs) requires a land tile; an ice tile is
    water). A land-form attacker may be bounced onto ice, as a pushed unit
    may; an afloat one never;
  - a boarded Candy ship becomes the captor's ship of the same role (its
    kind follows its new owner); a Candy ship that boards takes the prize
    for the Candy seat. Neither involves a Candy rule.

## 17. Unchanged behaviour of the other factions

A match without a Candy seat behaves identically to the previous identity
apart from identity. For equal setups, seeds, and command sequences it
produces the same maps, legal commands, previews, accepted and rejected
commands, events, and views. The only differences are the ruleset ID, the
autosave key, the obsolete-key list, the command ordinals after `ASSEMBLE`
and the event ordinals after the inserted kinds, the empty `sugarRush`,
`crumbs`, `splattedThisTurn`, and `tossedThisTurn` lists of the state and
the view, the four neutral preview fields, and the absent per-unit flags
and `candy` stat block. No Candy command is offered or accepted, and no
attack is Rushed, Splatted, or bounced.

In mixed matches each unit applies its own kind's registration: every other
faction's units keep every ability against the Candy, with the rulings of
[section 12](#12-interactions-with-existing-rules).

## 18. Implementation split and test expectations

Each bead proves its part with deterministic tests (new tests live in
`tests/unit/ruleset-v7-candy-*.test.ts` unless noted).

**`pulp_wars-jdb.3`: identity, registration, every shape and every rule.**

- **First step, before any number is coded:** re-run the tables of
  [section 11](#11-per-unit-battle-analysis) on the registry current at that
  time (with the real Candy registration, not the scratch override), and
  report to the root every per-unit verdict that flips.
- **Faction ID:** move the seven `"CANDY"`-as-unregistered assertions of
  [section 2.3](#23-the-faction-id-audit) to another literal; Ruleset 5 and
  6 suites unchanged.
- **Identity:** the exact `7rNN`; the previous identity rejected in setups,
  states, saves, and replays; gap-free prior list; save key and obsolete-key
  cleanup; faction and tree orders, binding, display name; registry
  assertion with eight trees; faction-independent maps with Candy seats;
  the three command kinds and seven event kinds at the stated positions.
- **Roster:** every value of the [section 3](#3-candy-roster) table as
  registry values; one starting Toffee Trooper; Militia one Toffee Trooper; reward Giant;
  treasure Donut Racer with a free slot and the 5-Coin fallback; Disband
  refunds; Re-bake prices and HP; Muster roles; no Field Defense, Rally,
  Overrun; per-viewer technology names and unlock text; every audit row that
  names a Candy effect.
- **Sugar Rush:** every legality row of [section 5.1](#51-the-sugar-rush-command);
  the Rushed budget (plain, Roads, Forest stop, deep snow, ZOC, an embarking
  dock), the first-attack bonus (not on the second attack, not with Charge,
  not with Inspired, not on retaliation, at range), a sluggish unit; the
  Crash step at End Turn with every ownership case of
  [section 5.3](#53-the-crash-and-home-sweet-home) (own, taken while Crashed,
  Rushed by a controller and released), Home Sweet Home on and next to an
  own center and not two tiles away, `UNIT_CRASHED` for every primary
  action and the allowed commands of a Crashed unit; idle recovery of a
  Rushed unit; entries removed on death; the Donut Racer's Escape (budget 2,
  not when sluggish) and the Chocolate Bunny's Sugar Frenzy (continuations at 3,
  none when not Rushed, and **no third continuation**: after three kills in
  a row against a line of soft units the fourth `ATTACK` is not offered and
  is rejected, `overrunContinues` is false on the third attack, and the
  Human Knight's Overrun stays uncapped).
- **Crumbs:** creation for each cause of [section 6.1](#61-crumbs) and none
  for each exclusion (rising, Disband, elimination, `BRAIN_LOST`, a site, a
  Rift, a chest, a curiosity, the Giant, a boat, an embarked unit, a
  controlled Candy unit); replacement; event order with a Grave; the stale
  countdown for Crumbs left on the Candy turn and on an enemy turn; eating
  by `MOVE`, an interrupted Move, an Escape Move, and `DISEMBARK`, and not by
  a flyer, an own or allied unit, passing over, or any listed placement or
  displacement; Peppermint Surprise with Armoured, Plated, a Shield, a kill
  (Grave, a Bitten rising, a death blast, no unit credit); elimination
  removal.
- **Re-bake:** every legality row of [section 6.4](#64-the-re-bake-command)
  (a controlled Confectioner, a Crashed one, a sluggish one that moved, an
  orphan, Crumbs two tiles away or of another seat, each tile condition, a
  full city, Coins, Arms Industry ignored); the new unit's record, home,
  HP, exhausted activation, reveal, and Field Defense destruction; no city
  action spent; a besieged home allowed.
- **Splat:** the list on a surviving target in every form and on a full
  Shield hit, not on the Spider; no retaliation from a Splatted unit against
  any later attacker (Lifesteal, bite, Infect, a Gyrocopter strike-back
  included) with `SPLATTED` only where the ordinary rules would retaliate;
  the Pie's own exchange answered; cleared at End Turn and on death.
- **Bounce:** each of the eight directions; every blocked case (edge, unit,
  mound, site, terrain, water kind, allied territory, chest); `JUGGERNAUT`
  attackers and the Spider never; two-slot units, a flyer, and a boat
  bounced; after a Triceratops's push and follow; not a Move (flags kept, no
  eating, no chest, no Field Defense destruction, Dig In read on the new
  tile); no Bounce from distance 2 or when someone dies.
- **Sugar Toss and Frosting:** every legality row of
  [section 9](#9-frosting-and-sugar-toss); once per target per turn across
  two Gunners; Frosting with every Tend Wounded rule and no Rally.
- **Interactions:** each row of
  [section 12](#12-interactions-with-existing-rules), in particular the
  Mind Control rows (a controlled unit Rushes, Crashes, eats Candy Crumbs,
  leaves none, cannot Re-bake).
- **Previews and queries:** each preview equal to its resolution; offered
  commands equal to accepted ones; the combat preview fields; the `candy`
  stat block; threatened tiles for free, Rushed, and Crashed Candy units.
- **Showcase** with a Candy seat. **Persistence:** save, replay, and hash
  round-trip with non-empty lists; projection of the new events to a viewer
  that sees the unit or tile and one that does not, and the Crumbs owner's
  `CRUMBS_EATEN` with a hidden eater.
- **Parity** of matches without a Candy seat with the previous identity
  apart from identity and neutral fields; headless Normal matches with Candy
  seats finishing without policy errors; refreshed release corpus with
  reviewed diff.

**`pulp_wars-jdb.4`: Normal AI.** The behaviours of
[section 14](#14-normal-ai-requirements) with its unit-test list; determinism
and command bounds; headless matches of the Candy against all seven
factions in both seat orders without stalls or policy errors; pinned
decision hashes of matches without a Candy seat unchanged; the head-to-head
test for the Candy policy as a whole and for each "against" rule, with its
seeds and results in the bead.

**`pulp_wars-jdb.5`: art direction and production art.** The pieces of
[section 15.4](#154-what-the-art-bead-must-draw) under the PixelLab
workflow: the fragment first, the colour and IP rules, a small sample per
class, every result reviewed at native and enlarged size, the 32 px lineup
before batching, then the batch, the Candy naval units included. Validation
profile `asset-only` with `art:chibi-candy-direction-review`,
`art:faction-colours-review`, and `art:faction-looks-review`. It may start
from this contract once the user approves the fragment.

**`pulp_wars-jdb.6`: UI.** [Section 15](#15-ui-requirements) surfaces,
labels, and Help; the armed Rush with its reach; the markers; Re-bake, Toss,
and Frosting; Splat, Bounce, and eating in the previews; Home Sweet Home and
Peppermint Surprise in the tree; the wired art and the badge fallback; a
regression check that no new string contains a coordinate; start and finish
a match as and against the Candy in the browser; screens of matches without
a Candy seat unchanged; a browser smoke probe that Rushes and attacks, sees
a Crash, Splats and attacks without a strike-back, sees a Bounce, Tosses,
Frosts, and Re-bakes from Crumbs made by a scripted death (validation
profile `ui/presentation` plus `npm run smoke:browser`).

**`pulp_wars-jdb.7`: coarse balance.** The matrix and telemetry of
[section 19.2](#192-measurement), the acceptance of
[section 19.4](#194-balance-acceptance), any tuning inside
[section 19.3](#193-tuning-bounds) with this contract, the code, and the
tests changed together, a tuning record added to this document, and a short
report (`docs/validation/RULESET_7_CANDY_BALANCE.md`).

`pulp_wars-jdb.3` changes the identity and therefore refreshes the release
corpus. No UI offers the faction until `pulp_wars-jdb.6`. `pulp_wars-jdb.8`
folds this overlay into the current rules (as a new faction section) with
the full release gates.

## 19. Headless support, measurement, tuning bounds, and balance acceptance

### 19.1 Headless support

- The headless CLI and the balance matrix accept `candy` in Ruleset 7
  `--factions` and the pairing letter `C`, on every map type including
  `showcase`.
- Headless metrics count the three new commands in `commandsByKind` and the
  seven new events like any other kind. Candy telemetry lives in
  `src/headless/candy-telemetry-v7.ts` (the Dwarf precedent).

### 19.2 Measurement

The project's balance policy: Dry Land maps only, small samples, no
high-powered win-rate statistics, and no per-matchup band chasing; remove
gross imbalances (worse than about 70 to 30) and blind spots.

- **Pairings,** Normal against Normal, Rival, Dry Land, sizes 11 and 14, both
  seat orders, about 20 to 40 decided games per opponent, 150 rounds: `CH`,
  `HC`, `CU`, `UC`, `CG`, `GC`, `CD`, `DC`, `CM`, `MC`, `CI`, `IC`, `CW`,
  `WC`. No `CC`. One four-seat mix on 16 × 16 as a smoke check.
- **Candy telemetry** per seat-game, from a replay of the accepted command
  log: units trained and Re-baked by role and round; Rushes per role, Rush
  kills (a kill the plain attack would not have made, by the preview), units
  killed while Crashed, Home Sweet Home spares; Crumbs left, Re-baked (by
  role, Coins spent), eaten (by whom), stale; Peppermint Surprise damage and
  kills; Splats and strike-backs prevented (the HP the preview without Splat
  would have dealt); Bounces and blocked Bounces; Sugar Toss and Frosting HP
  healed; Sugar Frenzy chain lengths; Confectioners lost and the round;
  kills and losses by role; cities at rounds 10, 15, and 20; turns at the
  128-command cap; the round-cap rate.
- **Against the Candy,** per opposing seat: Confectioners killed and the
  round; Crumbs eaten; Crashed units attacked.

### 19.3 Tuning bounds

`pulp_wars-jdb.7` may move these numbers within the listed bounds without
root approval, changing this contract, the code, and the tests together and
justifying each change in its report. Anything outside the bounds, any
number of another faction, and any mechanic change needs root approval.

| Parameter                                    | Contract value          | Bounds                     |
| -------------------------------------------- | ----------------------- | -------------------------- |
| Toffee Trooper HP / Defense                  | 10 / 2                  | 9–12 / 1.5–2               |
| Donut Racer HP / cost                        | 10 / 3                  | 9–12 / 3–4                 |
| Gumball Gunner HP; Sugar Toss heal           | 8; 2                    | 8–10; 2–3                  |
| Marshmallow HP / Defense / cost              | 18 / 2.5 / 4            | 16–20 / 2–3 / 3–5          |
| Confectioner HP / cost                       | 10 / 5                  | 10–12 / 4–6                |
| Re-bake price; HP                            | ⌈cost / 2⌉; ⌈maxHp / 2⌉ | price + 0–1; HP ⅓–½        |
| Crumbs lifetime                              | 3 Candy turns           | 2–3                        |
| Pie Launcher Attack / cost                   | 3 / 8                   | 3–3.5 / 7–9                |
| Chocolate Bunny HP / Attack / Defense / cost | 14 / 3 / 1.5 / 9        | 12–16 / 2.5–3 / 1–2 / 8–10 |
| Gingerbread Giant HP / Attack / Defense      | 40 / 4 / 3.5            | 36–40 / 3.5–4 / 3–4        |
| Peppermint Surprise damage                   | 3                       | 2–4                        |
| Rush: +1 Move, +1 first Attack; HSH radius   | fixed                   | fixed                      |
| Chocolate Bunny Move; Move values; slots     | 2; section 3; 1         | fixed                      |
| Sugar Frenzy continuations (root ruling)     | 2                       | 1–2 (never more)           |

**Named levers** (each needs root approval before it is applied): Splat
stops one strike-back instead of all for the turn; the Crash also lowers
Defense by 0.5; Home Sweet Home off
the Giant; a Re-bake may exceed capacity (if Re-bake is rarely used because
slots are full).

### 19.4 Balance acceptance

Coarse, on Dry Land:

- **No gross imbalance:** in decided games the Candy win between about 30%
  and 70% against each of the seven factions separately. The report states
  the counts and does not chase a band inside that range.
- **No stalls, policy errors, or exceptions;** the Candy round-cap rate is
  not clearly above that of the other pairings in the same run.
- **No blind spot:** every opposing faction kills Confectioners in at least
  half of the seat-games in which one was fielded and takes a Candy city in
  some games; Crumbs are eaten in some games by every opponent.
- **Every unit is produced and every ability used:** Sugar Rush in nearly
  every Candy seat-game and by at least four roles over the run; Gumball
  Gunner, Marshmallow, and Confectioner trained in at least half of the
  seat-games with their technology; a Re-bake in at least half of those with
  a Confectioner; a Splat that prevents a strike-back in at least half of
  those with a Pie; a Bounce in at least half of those in which a
  Marshmallow was attacked in melee; Chocolate Bunny and Pie reported (tier 3);
  the Giant reported (reward only).
- **No dominant unit:** no role but the Toffee Trooper makes more than 40% of the
  seat's kills; no Sugar Frenzy chain exceeds three attacks (a hard check:
  any longer chain is a defect), and Rushed Bunny turns with three kills are
  rare (under about one per seat-game); the Chocolate Bunny's kills per loss
  stay under about 2.
- **The Crash bites, but not too much:** units killed while Crashed are
  between about 10% and 50% of Candy losses (below, the Crash is toothless;
  above, Rush is a trap).
- **Neutrality:** pairings without a Candy seat have byte-identical final
  state hashes to a pre-tuning run of the same seeds under the same
  identity.

If the gameplay fails these, `pulp_wars-jdb.7` iterates within
[section 19.3](#193-tuning-bounds) and the Candy-only Normal AI, and asks
the root before going outside the bounds.

### 19.5 Balance record (`pulp_wars-jdb.7`)

At the user's direction (2026-10-04: small scale only) the coarse balance
was closed on the sanity sample the Normal AI bead had already played, with
**no number, rule, or identity changed**: every value of
[section 3](#3-candy-roster) and every constant of
[section 13](#13-commands-events-errors-state-and-queries) is the contract
value, and no named lever was applied.

The sample
([Candy measurements](../architecture/NORMAL_AI.md#candy-measurements)):
Dry Land, 11 x 11, Normal against Normal, Rival mode, at
`pulp-wars-poc-7r38`, seeds 0 to 2 in both seat orders, six games per
opponent.

| Opponent  | Candy wins of 6 |
| --------- | --------------: |
| Humans    |               2 |
| Undead    |               5 |
| Goblins   |               2 |
| Dinosaurs |               3 |
| Martians  |               2 |
| Ice Folk  |               3 |
| Dwarves   |               3 |
| **Total** |    **20 of 42** |

No match stalled, none had a rejected command, and the longest turn had 59
accepted commands. At six games a pairing, none is shown to be worse than
about 70 to 30 (5 of 6 against the Undead is the largest lean, and it is
inside the noise of six games).

**What this is not.** It is not the matrix of
[section 19.2](#192-measurement) (20 to 40 decided games per opponent on
two sizes, with the telemetry read per seat), and the acceptance list of
[section 19.4](#194-balance-acceptance) was not evaluated: the blind-spot,
every-ability, dominant-unit, and Crash-share lines are unmeasured, and no
`docs/validation/RULESET_7_CANDY_BALANCE.md` report was written. The sample
also predates `7r39` to `7r41`: the Martian Grunt has 8 HP since `7r39`
(was 9), boards have a village density instead of a fixed village count
since `7r40`, and since `7r41` every seat starts with 3 Coins (5 in hand on
its first turn) and tier 3 technologies (Sawmilling for the Pie Launcher,
Chivalry for the Chocolate Bunny, Peppermint Surprise) have base cost 9 (was
12). The numbers are to be revisited with the user's play feedback.

## 20. The future unlock (a proposal)

Not implemented now; a separate bead after the epic, and the user decides
(root ruling D7).

- **Where it lives:** a profile record outside saves, like campaign progress
  (`pulpWars.campaign.v1`, which survives identity changes): for example
  `pulpWars.profile.v1` with earned meta-achievements, derived unlocks, and
  a Reset. Skirmish otherwise stays fully unlocked; the Candy would be the
  one gated skirmish faction, shown in setup as a locked "???" slot with a
  hint. Headless and test setups are never gated, and a developer option
  unlocks it.
- **The achievement, recommended: "Sweet Tooth":** win a skirmish in which
  you harvested at least 10 Fruit. It is thematic (sugar), reachable by any
  faction on most maps, and slightly off the usual path, which suits an
  easter egg. Hint: "Some say a sweet tooth opens a hidden door."
- **Alternatives:** "Sugar High", win a skirmish by round 30 (fits the Rush,
  but depends on map size and AI count); "Full Set", unlock all seven
  in-match achievements in one match (hard; no Sea Dog on Dry Land).

## 21. Decisions made in this spec

### 21.1 Numbers corrected by the engine re-run

The engine re-run ([section 11.1](#111-method)) changed **no roster
number** and no verdict. It corrected these statements of the design:

1. **Sustained fights** (design section 3.1, "two plain Toffee Trooper attacks deal
   10 to a Fighter, one Rushed attack and a Crash deal 8"): exact only for
   two attacks on **fresh** Fighters (5 + 5). One Toffee Trooper's second plain
   attack on the same Fighter deals 4 and takes 5, which kills it; the
   Rushed attack took 4. The Crash's price is tempo, not damage
   ([section 5.5](#55-rush-worked-examples)).
2. **"Two Rushed Toffee Troopers kill a full Fighter (8, then 4 more)"** (design
   sections 7.2 and 7.10): the second Toffee Trooper need not Rush; a plain one
   also deals the last 4.
3. **The Donut Racer's Rushed reach** (design section 7.3, "three tiles, or
   four on Roads"): Road steps cost half, so Move 3 reaches up to **six**
   tiles along a Road.
4. **"Knight, Ray Gunner 9 / 2" on a Chocolate Bunny** (design section 7.8): a
   Ray Gunner shoots from range 2, where the Bunny cannot answer: 9 / —
   (9 / 2 only from range 1).
5. **The Sugar Frenzy kill list** (design section 7.8) named eight units;
   the engine kills every unit of 10 HP or less with Defense 1 or less at
   Attack 3 ([section 11.8](#118-gummy-bear) lists them). The verdict (it
   stops on any 12-HP or Defense-2 unit and a shielded Grunt) is confirmed;
   the re-run also showed an unbroken soft line is killed whole (eight
   units), so the root capped Sugar Frenzy at two continuations
   ([section 21.4](#214-root-rulings) ruling 7), and the chain table of
   [section 11.8](#118-gummy-bear) is now the capped one (the first two
   chains end at three kills with the Bunny at 14 HP instead of wounding a
   fourth unit).
6. **Snow:** every Ice Folk number of the design is for a Yeti or a Sled
   **off** Snow. On Snow (its own territory) a Rushed Toffee Trooper deals a Yeti 8
   and takes 3 instead of killing it.
7. **"Knight parity … Move 2"** (design section 4): the Knight has Move 3.
   The Chocolate Bunny's Move 2 is kept as a deliberate deviation (Rushed it has
   the Knight's 3).

Every other number of the design matched the engine exactly: the Toffee Trooper,
Marshmallow, Pie Launcher, and Chocolate Bunny tables, the Walled Guard
cracking, the Giant's exchanges, the Confectioner's one-blow deaths, the
Gunner's shots, the Donut Racer's charges, and the Spider exchange.

### 21.2 Precise readings of the design

These narrow, extend, or correct an input; the root may overrule any of
them.

1. **Rushed and Crashed are one stored list** (`sugarRush`), not an
   activation flag and a list (the design's `sugarRushed` flag and
   `crashed` list): adding an activation key would change every unit's
   serialized activation, breaking neutrality, which the Dwarf contract also
   avoided. The first-attack bonus reads the existing `attacksUsed`.
2. **The Rush bonus adds to neither Charge nor Inspired** (the design named
   Charge; Inspired reaches a Candy unit only through Psychic Command on a
   controlled one).
3. **The Crash ends at the End Turn of whoever owns the unit** then (step 1
   before step 2), which handles Mind Control and release without a
   per-seat field.
4. **Rush does not stop idle recovery** (it is neither a Move nor an action).
5. **Crumbs placement follows the Grave rule** ("not a settlement site",
   where the design said "not a settlement center") and also excludes chest
   and curiosity tiles, so eating never meets taking treasure or claiming a
   Shrine.
6. **A mind-controlled Candy unit leaves no Crumbs** (the design's ruling,
   now derived from [current rules section 20.9](RULESET_7_CURRENT.md#209-mind-controlled-units)):
   leaving Crumbs is a body event, but Crumbs are a seat resource whose only
   use is spawning (Re-bake), and seat rules follow the controller while
   spawning under control is forbidden. Owned by the Martian controller they
   would be inert; owned by the original owner they would hand a seat a
   resource from a unit it did not own at death. Rushing, the Crash, Bounce,
   Splat, Toss, and Frosting are body rules and follow the kind.
7. **The Giant Spider is never Splatted** (the design said it "can be
   Splatted"): its spec's rule is that no status sticks to the Monster, and
   Splat is a status.
8. **Bounce has no exploration condition** (the design said "explored by
   the defender's owner"): the tile is next to the attacker, always within
   its own sight, so its preview is exact; Push's condition exists because
   the pusher may not see behind the target.
9. **Bounce comes before death-blast chains** (the design's order: Bounce,
   then chains), so a blast hits whoever stands where after the Bounce.
10. **`SPLATTED` is reported only where the ordinary rules would let the
    defender retaliate**; otherwise the ordinary reason.
11. **Peppermint Surprise is fixed damage like a bomb:** Armoured applies
    (the design named Shield and Plated), and its deaths are credited like
    an explosion (the player, no unit), with cause `PEPPERMINT`.
12. **Escape after a Rushed attack has the role's Move 2** (the design's
    ruling, made exact).
13. **Re-bake adds the Assemble tile conditions** (enterable, not allied
    territory, Field Defense destroyed by occupation) and gives the copy the
    exhausted activation.
14. **A dedicated error `UNIT_CRASHED`**, so the UI and tests can tell a
    Crash from an ordinary spent action.
15. **Home Sweet Home reads the unit's owner at End Turn, in any form**
    (an embarked Rushed unit next to its own center is spared).
16. **Crumbs of an eliminated Candy seat are removed** with its units.

### 21.3 Other decisions

17. **Faction ID `CANDY`** ([section 2.3](#23-the-faction-id-audit)),
    display "Candy", tree `CANDY_BASELINE_V1`, headless `candy`, pairing
    letter **`C`**.
18. **Command and event positions:** the three commands after `ASSEMBLE`;
    the events as in [section 2.2](#22-identity).
19. **Event shapes and names** (the design left them open): seven events;
    Bounce reuses `UNIT_PUSHED` and Frosting `WOUNDED_TENDED`; Splat has no
    event.
20. **State list names and order:** `sugarRush`, `crumbs`,
    `splattedThisTurn`, `tossedThisTurn`, after the previous identity's last
    list.
21. **The Showcase starts without Crumbs**; the UI smoke makes them.
22. **The AI file** `src/ai/v7-candy.ts` with `CandyPolicyOptionsV7`; the
    telemetry file `src/headless/candy-telemetry-v7.ts`.
23. **The naval branch is the Human one, with no Candy tweak**
    ([section 16](#16-naval-branch)): the naval design landed on `main`
    (`50de0bf`) while this contract was written and gives no faction a
    boat rule, so the design's candidate "Sugar Rush for ships" hook is
    dropped.

### 21.4 Root rulings

The root ruled on the design's open questions on 2026-10-03 (epic
`pulp_wars-jdb`); the rules text above follows them.

1. **The colour** is cotton-candy pink `#ffb8d8`.
2. **Splat** stops every strike-back for the rest of the Candy turn; the
   one-strike-back version stays a named lever.
3. **The unlock** ("Sweet Tooth") is a later bead; the Candy are an ordinary
   unlocked faction for now.
4. **The engine** waits in the identity queue behind the Spider,
   auto-Recover, map scale, and naval engines.

The root ruled on this contract's questions when accepting it (2026-10-04):

5. **The Spider stays immune to Splat** (reading 7 confirmed).
6. **A mind-controlled Candy unit leaves no Crumbs** (reading 6 confirmed).
7. **Sugar Frenzy is capped now at two continuations**, at most three
   attacks per Rushed Chocolate Bunny turn ([section 5.4](#54-rush-perks-escape-and-sugar-frenzy)):
   the user warned that the T-Rex's Rampage chain was predictably too
   strong, and an eight-kill soft line is exactly that. The cap is a rule,
   not a balance lever; the balance bead may lower it to one continuation
   but never raise it.

### 21.5 Questions for the root

None open.

## 22. Concerns

1. **Four state lists, four preview fields, and seven events** change nearly
   every pinned hash and the release corpus, right after the curiosities and
   possibly the Spider did the same.
2. **The Crash depends on the End Turn order.** Step 1 must run before step
   2; a test pins both with a unit that changes owner.
3. **The Donut Racer on Roads** moves six tiles Rushed and Escapes two more;
   with Charge only as Attack 3 it is a scout and a finisher, but the
   village race should be read in the telemetry.
4. **Sugar Frenzy is capped at three attacks** (root ruling 7), so a soft
   line loses at most three units to one Bunny; three Rushed Bunnies in one
   turn could still clear nine. The telemetry watches three-kill Bunny
   turns.
5. **Pie plus Rushed Toffee Troopers** kills a Walled Guard or a full Zombie in one
   turn without a loss. It is the identity, with real brakes, and the
   one-strike-back lever is ready.
6. **Re-bake may be rare:** the home city must have a slot and the copy is
   fragile (a 5-HP Toffee Trooper dies to one Fighter hit). The lever is a Re-bake
   over capacity; the AI must not throw copies into lethal reach.
7. **The AI's cost:** a Rushed variant of a unit's plan doubles its movement
   and estimate queries; the gate (a hostile within Move + 1 + range) keeps
   it bounded, and Rush adds at most one command per unit.
8. **Readability:** three short-lived unit states and a tile marker. Each has
   one distinct visual; Rushed and Splatted exist only during their turn.
9. **The art carries ownership:** without base plates, a Toffee Trooper that reads
   as a Goblin, or a Marshmallow that reads as an Ice Folk unit, at 32 px is
   a rules problem. The lineup is mandatory before batching.
10. **The numbers were computed against a registry that will move.** Other
    identities land before the Candy engine; the analysis must be re-run
    first ([section 18](#18-implementation-split-and-test-expectations)).

## 23. Implementation notes (`pulp_wars-jdb.3`)

The engine bead landed at `pulp-wars-poc-7r38`, after the Giant Spider
(`7r36`) and the Martian and Ice Folk balance round (`7r37`).

**The section 11 re-run.** Every table of
[section 11](#11-per-unit-battle-analysis) was re-run with the real Candy
registration on the `7r38` registry and is pinned in
`tests/unit/ruleset-v7-candy-numbers.test.ts`. Every number matches the
contract except two readings, and **no per-unit verdict flips**:

1. a Chocolate Bunny's Sugar Frenzy continuation (its base Attack 3) against an
   Ice Witch deals 10 and takes 1 (the contract's table says 9 and 2);
2. a plain Toffee Trooper against a Yeti on Snow deals 5 and takes 3 (the contract
   says 4 and 4): the balance round made Snow cover × 1.25 at `7r37`.
   Rushed, it still deals 8 and takes 3.

**Design notes.**

- **One list for Rushed and Crashed** (`sugarRush`, with a `phase`); no
  activation key was added.
- **Crumbs are folded from events.** A death site only emits `CRUMBS_LEFT`
  (`recordCrumbsV7`, called with every Grave record, and the Shatter path
  directly); `applyCommandV7` folds the events of an accepted command into
  `crumbs`. "Owned by a Candy seat and not mind-controlled" is one test: the
  dead unit's owner's faction is `CANDY` (a controlled unit's owner is its
  Martian controller). A Kaboom of the unit itself leaves none.
- **Shared predicates** (`src/engine/v7/candy.ts`): the Rush legality, the
  Rush bonus, the Overrun kind and its cap (`overrunKindV7`,
  `overrunMayContinueV7`), Escape, Splat, Bounce, the Crumbs decision, the
  eating test, the Peppermint hit, Home Sweet Home, and the Re-bake and
  Toss readiness are each one function called by the reducer and by the
  public query. The canonical Bounce destination is the shared displacement
  rule plus "no chest"; the public one reads the view's tiles
  (`publicBounceStateV7`), like the public Push and Knockback.
- **The Crash check** sits immediately before "already acted" in `ATTACK`,
  `RECOVER`, `PILLAGE`, `TEND_WOUNDED`, `RALLY`, `REBAKE`, and `SUGAR_TOSS`,
  and right after the ownership check in `CAPTURE`.
- **The Sugar Frenzy cap** reads `attacksUsed` after the attack: a
  continuation is granted while it is at most
  `SUGAR_FRENZY_MAX_CONTINUATIONS_V7` (2).
- **State parsing** also refuses a Chocolate Bunny with an Overrun continuation
  or a Donut Racer with an Escape that has no `RUSHED` entry.
- **The Normal AI** leaves `SUGAR_RUSH`, `REBAKE`, and `SUGAR_TOSS` out of
  its candidates until `jdb.4`.

**Narrow readings and deviations** (each also in the
[current rules' known discrepancies](RULESET_7_CURRENT.md#25-known-discrepancies)):

1. **Eating needs a Move that moved the unit.** A unit eats Crumbs at the
   end of a `MOVE` whose traversed path has at least one tile (and of a
   `DISEMBARK`).
2. **Event order of a landing.** In a `DISEMBARK` the eating events
   (`CRUMBS_EATEN` and a Peppermint death) come after the landing's Field
   Defense and treasure events and **before** its `TILES_REVEALED`, which
   stays the last of the landing's own events as at `7r37`
   ([section 6.3](#63-eaten-and-peppermint-surprise) lists `TILES_REVEALED`
   before the eating step). A `MOVE` follows the contract's order.
3. **A hidden Toss target is not found.** `SUGAR_TOSS` naming a unit the
   actor cannot see is rejected with `HEAL_TARGET_NOT_FOUND`, so a rejection
   reveals nothing (own units are always visible, so no legal Toss changes).
4. **Projection.** `UNITS_CRASHED` goes to a viewer who owns or sees one of
   its units, filtered to those; `UNIT_REBAKED` and `SUGAR_TOSSED` to the
   acting seat only (the training and Tend precedent in this code base);
   `CRUMBS_EATEN` in full to every viewer who sees the eater, and with
   `unitId`, `damage`, `shieldDamage`, and `dies` null to the Crumbs' owner
   and to every viewer who explored the tile but cannot see the eater.
5. **The setup offers the faction now.** [Section 18](#18-implementation-split-and-test-expectations)
   says no UI offers it until `jdb.6`; the engine bead's task asked for the
   setup option, the colour `#ffb8d8`, and plain command buttons
   so that a Candy match can be played; the correction pass also wired the
   `jdb.5` unit sprites, portraits, cities, and ships (the icons, the Crumbs
   marker, and the effects are registered and not drawn yet). The Gallery
   shows a
   Candy column with that art.
6. **The balance matrix** accepts the letter `C` and the Candy pairings;
   its Candy summary is `jdb.7`.
7. **The release corpus** has no Ruleset 7 `:refresh` (the current release
   validator keeps no corpus); nothing was regenerated.

**Parity.** A match without a Candy seat plays command for command as at
`7r37`: the all-Human parity digests and the five pinned `7r34` curiosity
matches (every faction but the Candy) keep their command hashes, rounds,
maps, and PRNG ends, and their event hashes once the four neutral Candy
preview fields are removed; the mission and Showcase pins hold with the
four empty lists removed. The three new command kinds move every later
kind's ordinal by three, which changes four pinned Normal-decision hashes
through the `-ordinal` tie-break only (their revision-12-ordinal hashes are
unchanged).

## 24. Implementation notes (`pulp_wars-jdb.6`)

The UI bead implements [section 15](#15-ui-requirements) at `7r38`. It
changes no rule, no identity, and no AI: every number and every legal
choice on the screen comes from the public view, the offered commands, and
the public previews of [section 13](#13-commands-events-errors-state-and-queries).

**Where it lives.** `src/render/candy-presentation-v7.ts` (the texts of
[section 15.2](#152-labels-and-text) and [15.3](#153-help-text), the chips,
the unavailable reasons, the log lines), `src/render/canvas/candy-board-plan-v7.ts`
(the markers, the Crumbs, the three aiming modes, the attack lines),
`candy-canvas-v7.ts` (the marker drawing) and `candy-effects-v7.ts` (the
cues). `npm run review:ruleset7-candy-ui` captures them on the fixtures of
`tests/fixtures/v7-candy-ui.ts`; the browser smoke has a Candy step
(`scripts/browser-smoke-v7-candy.ts`).

**Readings and deviations.**

1. **The armed Rush has no second button.** While a Sugar Rush is armed the
   dock shows the aiming panel in place of the actions (as for every aimed
   ability), so "pressing it again" is not available: Back, Escape, or
   another selection disarm it and send nothing.
2. **Two reasons the contract does not list.** A unit that used its action
   without moving reads "Already acted" (the contract lists "Already moved"
   only), and a Confectioner whose every adjacent Crumbs tile is occupied
   reads "The Crumbs are covered".
3. **The Re-bake reason mirrors the engine's order.** The engine has no
   public "why not" query for a Re-bake, so `rebakeUnavailableTextV7` reads
   the home city, the adjacent own Crumbs, the used slots, and the Coins
   from the view with the engine's own helpers. Legality is never decided
   there: the button is offered exactly when a `REBAKE` is.
4. **Crumbs show the fallen unit's head**, cut from its own board sprite
   into a small token (LEGACY and the Classic look: the first letter of its
   name), instead of a code-drawn role icon; the pips are the turns left,
   and a peppermint dot marks Crumbs that bite.
5. **Sugar Frenzy's cap is two pips** (the continuations left) on the
   board and in the dock chip; neither writes the number.
6. **Markers are still.** The Rushed chip, the Crashed swirl, the Splatted
   pie, and the Home Sweet Home house do not animate (no sparkle trail);
   the Crash starting and ending, a Rush, a Re-bake, a Sugar Toss, a
   Bounce, and eaten Crumbs each play a short cue, of which reduced motion
   holds one still frame. A Crashed unit's sprite is drawn in a faded copy.
7. **The Crash ending has no event**, so its cue is read from the two views
   of the boundary: a unit that was Crashed before it and is not after it.
8. **The Pie Launcher and the Gumball Gunner have attack cues**
   (`PIE_THROW`, `GUMBALL_SHOT`, [attack effects](../art/ATTACK_EFFECTS.md));
   the pie's burst is the Splat.
9. **The Gallery** plays Sugar Rush, Re-bake, and Sugar Toss on its demo
   board, with the Candy ability names.

**Not done here.** The faction emblem (`ICON:HUD:CANDY:EMBLEM`) is not
drawn: like every faction, the emblem on the mission screens is the
Fighter's portrait. LEGACY and the Classic look draw Candy units as Human
sprites without a Candy badge, as since `jdb.3`. The public `Move` stat of
a Rushed unit does not include the Rush's +1 (the board's reach does); that
is the engine's stat breakdown. The badge, the Move stat, and a public
"why not" query for a Re-bake (reading 3) are `pulp_wars-jdb.9`.

## 25. Fold notes (`pulp_wars-jdb.8`)

The fold checked this document and
[current rules section 23](RULESET_7_CURRENT.md#23-candy-faction-rules)
against the code at `pulp-wars-poc-7r41` (the registration in
`src/engine/rules/ruleset-v7.ts`, `src/engine/v7/candy.ts`,
`candy-reducer.ts`, the Candy hooks of the reducer, the public queries, the
unit stats, the state schema, and event projection, `src/ai/v7-candy.ts`,
`src/render/candy-presentation-v7.ts`, the telemetry, the browser smoke
step, and the tests `tests/unit/ruleset-v7-candy-*.test.ts`). It changed no
source, test, rule, or identity. The rules sections 3 to 13 describe the
engine as built, with the readings of
[section 23](#23-implementation-notes-pulp_wars-jdb3). The rest of this
section lists where the build differs from this text; the open items are
also in the current rules'
[known discrepancies](RULESET_7_CURRENT.md#25-known-discrepancies).

**Corrected in this text by the fold.**

1. The status and the Ruleset ID above (every step built; `7rNN` is
   `7r38`).
2. [Section 2.4](#24-setup): a seat starts with 3 Coins, 5 in hand on its
   first turn (`7r41`); the contract said 5.
3. A second "17. Unchanged behaviour of the other factions" heading was
   removed.
4. [Section 14.1](#141-implementation-status-pulp_wars-jdb4) and
   [section 19.5](#195-balance-record-pulp_wars-jdb7) were added.

**Engine facts this text does not state** (now in the current rules):

5. **`UNKNOWN_BEHIND_FOG` has a second case.** The estimate's `bounce` is
   also `"UNKNOWN_BEHIND_FOG"` for a Triceratops's Charge! whose own push
   is unknown (the push's `UNKNOWN_BEHIND_FOG`, with the tile behind the
   defender explored), because the attacker's tile after the follow is
   then unknown.
6. **The Attack stat shows the Rush; the Move stat does not.** A Rushed
   unit's public Attack stat carries a `SUGAR_RUSH` modifier (+1) while its
   first attack is unused and neither Charge nor Inspired applies. Its Move
   stat is the role's Move: the +1 is in the movement query and in
   `previewSugarRushV7` only (`pulp_wars-jdb.9`).
7. **`tossedThisTurn` drops a unit that leaves land form** (it embarks),
   as well as one that leaves the board.
8. **A Pillage by a Crashed Giant or a Crashed embarked unit** reports
   `PILLAGE_INVALID_TARGET` (the role and form test comes before the Crash
   test there); every other primary action of a Crashed unit reports
   `UNIT_CRASHED`.
9. **Numbers that moved with later identities.** Since `7r39` the Martian
   Grunt has 8 HP, so a Rushed Chocolate Bunny's first attack kills a full,
   shielded Grunt (8 through its Shield of 2); the continuation still
   stops on one (7 +2 sh / 2), as [section 11.8](#118-gummy-bear) says. A
   full-power Ray Gunner that attacks a Chocolate Bunny from distance 1 takes 0
   to HP (its Shield absorbs the 2 of that table). The tables of
   [section 11](#11-per-unit-battle-analysis) are otherwise pinned at the
   current registry by `tests/unit/ruleset-v7-candy-numbers.test.ts`.

**Plans of this text that were built differently.**

10. **The setup offered the faction from `jdb.3`**, not from `jdb.6`
    ([section 18](#18-implementation-split-and-test-expectations);
    [section 23](#23-implementation-notes-pulp_wars-jdb3) reading 5).
11. **No Candy badge.** [Section 15.4](#154-what-the-art-bead-must-draw)
    planned the Human sprite with a Candy badge until the art existed and
    as the fallback. The art was wired at once; a raster that fails to load
    falls back to the Human art with no badge, and the Classic and LEGACY
    looks draw Candy units as Human sprites with no badge
    (`pulp_wars-jdb.9`). The faction emblem is made and not drawn.
12. **The UI** differs from [section 15](#15-ui-requirements) as
    [section 24](#24-implementation-notes-pulp_wars-jdb6) lists (no second
    press to disarm a Rush, two more unavailable reasons, still markers, the
    fallen unit's head on the Crumbs). One more text exists: "May bounce
    back" for an `UNKNOWN_BEHIND_FOG` Bounce. Since `pulp_wars-9im` the
    Re-bake tile and the Sugar Toss target are picked on the board, like
    every other target, and since `pulp_wars-621` Frosting marks the units
    it will heal with a green ring and the amount.
13. **The browser smoke step is smaller** than
    [section 18](#18-implementation-split-and-test-expectations) asked. It
    mounts the Candy UI fixture (development server only; skipped with
    `--deployed`) and checks the planned Crumbs and the Rushed, Crashed,
    Splatted, and Sugar Frenzy markers, an armed Sugar Rush sent before its
    Move, "Rushed" in the dock, a Sugar Toss and a Re-bake picked on the
    board, and that nothing in the dock names a tile. It does not attack,
    play through a Crash, Splat and attack, show a Bounce, Frost, or make
    Crumbs by a scripted death, and it does not play a Candy match from the
    setup screen: those are covered by the engine, AI, and UI tests and the
    `npm run review:ruleset7-candy-ui` captures.
14. **The Normal AI** left out the wave-plan and placement items
    ([section 14.1](#141-implementation-status-pulp_wars-jdb4)).
15. **The telemetry is per match, not per seat.** `candy` in the headless
    metrics (`src/headless/candy-telemetry-v7.ts`) has match totals of the
    Rushes (by role), Rushed attacks and their kills, units Crashed, spared,
    and killed while Crashed, Crumbs left, eaten, stale, and re-baked (by
    role, with Coins), Peppermint damage and kills, Splats and strike-backs
    prevented, Bounces and blocked Bounces, Sugar Toss and Frosting HP,
    Sugar Frenzy continuations and the longest chain, and Rushed Escapes.
    The per-seat, per-round, and per-opponent lines of
    [section 19.2](#192-measurement) (who ate the Crumbs, Confectioners
    lost and when, kills and losses by role, the city counts at three
    rounds) were not built.
16. **The coarse balance** was a small sample with no matrix, no report
    file, and no tuning record
    ([section 19.5](#195-balance-record-pulp_wars-jdb7)).
17. **The naval branch** ([section 16](#16-naval-branch)) is still a
    design: the Candy have the current Human Patrol Boat and Battleship, no
    Submarine, and no ice.
18. **The release corpus** was not refreshed (the current release validator
    keeps none; [section 23](#23-implementation-notes-pulp_wars-jdb3)
    reading 7).

## Appendix A: the first draft and its critique

### A.1 The first draft, in brief

The first draft had the same theme and four mechanics with these
differences: Sugar Rush gave +1 Attack on **every** attack that turn and
added to Charge; the Chocolate Bunny had Sugar Frenzy at that Attack; the
Marshmallow was **Sticky** ("a melee attacker that hits it cannot Move on
its next turn") instead of Bouncy; Crumbs never went stale and were swept by
any enemy that stood on them, an advance included; **Re-bake was free** (any
role, half HP); Home Sweet Home spared a Rushed unit anywhere in own
territory; Explosives was **Hard Candy** (Pie Launchers ignore Walls and
Field Defense); the Gunner's Sugar Toss healed 3 with no limit per target;
the Donut Racer cost 4; and the faction colour was a bubblegum pink
`#ff6fb5`.

### A.2 The critique

Reviewed as a skeptical designer looking for degenerate combinations, AI
exploits, readability problems, and too many mechanics. Each item names the
draft's position, the objection, and what the redraft did.

1. **Rush plus Charge.** Draft: the bonuses added up. Objection: a Rushed,
   charging Donut Racer attacked at 4, one-shot every full 12-HP Fighter,
   Marksman, Raider, and Hammerer, and escaped, for 4 Coins: a Raptor with
   Escape. Redraft: the Rush bonus does not add to Charge; the Donut Racer's
   Rush buys reach and Escape only, and it costs 3.
2. **The Chocolate Bunny was the T-Rex again.** Draft: +1 on every attack of the
   chain. Objection: the computed chain was Marksman, Catapult, Captain,
   Fighter, all killed, the Bunny untouched: Attack 4 one-shots every 12-HP
   unit, so the chain never stops on a line, exactly the predicted T-Rex
   failure. Redraft: +1 on the first attack only; the continuation at 3
   kills only soft units of 10 HP or less ([section 11.8](#118-gummy-bear)).
3. **Sticky was a hard lock.** Draft: an attacker that hit a Marshmallow
   could not Move next turn. Objection: rooting is forbidden by the standing
   direction; on a melee unit next to Candy Gunners it meant a guaranteed
   death; on the AI side it froze attack plans. Redraft: Bounce, which moves
   the attacker once and locks nothing.
4. **Crumbs never went stale and were swept by an advance.** Objections,
   both ways: permanent Crumbs pile up into board clutter and a permanent
   re-buy discount, while sweeping on the advance meant nearly every melee
   kill destroyed the Crumbs at once, so Re-bake would only follow ranged
   kills. Redraft: three Candy turns; only a Move (or a landing) eats them;
   an advanced enemy blocks Re-bake until it leaves.
5. **A free Re-bake was Raise Dead with better units.** Objection: free
   Chocolate Bunnies and Pies at the front made losses free and blurred the Undead
   identity. Redraft: half the printed cost, a home-city slot, own Crumbs
   only, and the role that died.
6. **Home Sweet Home in all territory** made Rush free in a large area (and
   larger with Land Grant): Candy defenders would Rush every turn, a
   permanent +1 Move and +1 Attack at home, stronger than Dig In. Redraft:
   on or next to an own city center (Dig In's radius).
7. **Hard Candy doubled the siege.** Draft Explosives let Pies ignore Walls
   and Field Defense, on top of Splat. Objection: Splat already removes the
   price of attacking a fortified defender; ignoring its Defense too made
   Walls meaningless against the Candy, and three factions already have a
   "siege ignores fortification" technology (Wallbreaker, the
   Disintegrator, Blasting Charges). Redraft: Peppermint Surprise, which
   feeds the Crumbs pillar and stays small.
8. **Too much healing for a "fragile" faction.** Draft: Frosting 2 to all
   adjacent, Sugar Toss 3 to anyone in range with no limit, and Re-bake.
   Objection: three Gunners healed one Giant by 9 a turn; the Candy read as
   sustain, which is the Human identity. Redraft: Toss 2, once per target
   per turn. Frosting stays (it is the Captain's, cures Plague, and gives the
   Confectioner a job before deaths). The balance bead watches HP healed.
9. **Too many mechanics?** The draft also floated a Gunner Rush perk (two
   shots), a Pie Rush perk (splash), and caramel puddles from Pies. Cut:
   only the two perks that define their units (Donut Escape, Bunny Frenzy)
   stay; puddles are the Ice Folk's deep snow.
10. **AI exploitability of the Crash.** Objection: a naive AI would Rush
    whenever a Rushed attack is better and then lose its army to
    counterattacks in the Crash turn; a human could bait it. Redraft: the AI
    Rushes only for a kill the plain attack cannot make or to save a city,
    never into visible lethal reach without a key kill, and Crashed units
    step back ([section 14](#14-normal-ai-requirements)).
11. **Readability of three short-lived states.** Rushed, Crashed, and
    Splatted are three states on units plus Crumbs on tiles. Objection:
    clutter. Redraft: each has one distinct visual (sparkle, swirl, pie,
    crumb pile), Rushed and Splatted exist only during the Candy turn, and
    Crumbs are a single pile sprite with a code-drawn role icon.
12. **The colour.** `#ff6fb5` was 21.7 from the Martian magenta with normal
    vision and 16.1 under deuteranopia, below every existing pair. Redraft:
    `#ffb8d8` ([section 15.4](#154-what-the-art-bead-must-draw)).
13. **The Giant was a gumball-machine guardian.** IP: too close to the
    show's giant guardians. Redraft: the Gingerbread Giant.
14. **Every unit Rushes, the Giant too.** Objection: a Giant that Rushes
    attacks at 5 and, with Home Sweet Home next to its city, does so every
    turn. Kept: "every Candy land unit can Rush" is one rule with no
    exceptions to remember, a Giant's Rush off its city leaves the city
    without its attack next turn, and at home it is the reward unit doing
    its job. The lever "Home Sweet Home off the Giant" is named for the
    balance bead.

The brief's other ideas were weighed against what the seven factions
already own: gumdrop walls (rejected: no destructible structure exists;
Bounce gives the "soft wall" feel), sticky caramel spread (rejected: the Ice
Folk's deep snow), taffy that roots (rejected: a hard lock), bubblegum
bubbles that float units (rejected: flying exists twice and carrying is
Beam Down), peppermint explosions (kept small: Peppermint Surprise),
licorice whips that pull (rejected: the Tractor Beam), candy-coated villages
(look only), and a rolling donut that hits a line (rejected as a rule: lane
attacks made the first Triceratops awkward; kept as the Donut Racer's look).

## Appendix B: second critique

A shorter pass over the redraft.

1. **Splat still cracks Walls cheaply.** A Pie and two Rushed Toffee Troopers kill a
   Walled, Field-Defense Guard in one turn without a loss
   ([section 11.7](#117-pie-launcher)). Kept, because it is the faction's
   siege identity and has real brakes (the Crash blocks the capture, the
   advanced Toffee Trooper blocks the center for two turns, the Pie is fragile and
   expensive). The balance bead has a named lever: Splat stops one
   strike-back. Root ruling 2 kept the full version.
2. **The Crash is nearly free for units that sit.** A Marshmallow, Giant, or
   Pie that does not need its next action loses little. Accepted: Rush then
   is a repositioning tool (Move + 1) for defenders, which is a fair use, and
   their next action is usually wanted (the Pie shoots every turn). The
   telemetry's "killed while Crashed" band watches the Crash.
3. **Re-bake needs a free slot at home.** At the front the home city is
   often full, which could make Re-bake rare. Kept (no over-capacity
   production except rewards and risings); the lever "may exceed capacity"
   is named for the balance bead.
4. **Sugar Toss and Frosting together on one unit.** A unit next to a
   Confectioner and in range of a Gunner heals 4 a turn plus recovery.
   Accepted: it costs both supports' actions. Bounds 2–3 on Toss.
5. **Bounce helping the attacker.** A bounce can carry a fragile attacker
   out of the Candy counterattack. Accepted as a real cost of the Bounce; the
   Normal AI does not plan on it.
6. **The `CANDY` string.** Ruleset 6 uses it in shared code. Made an explicit
   audit step with a fallback name; the audit found no shared path and kept
   `CANDY` ([section 2.3](#23-the-faction-id-audit)).
7. **Peppermint Surprise may be a quiet technology.** If opponents simply
   stop eating Crumbs, the effect is "Crumbs survive", which is still the
   point. Kept, with damage bounds 2–4; the shared Blast Mountain and Field
   Defense demolition keep the technology live either way.
8. **Crumbs under Mind Control.** The redraft said "a Candy unit's death
   leaves Crumbs", so a Candy unit dying while a Brain controlled it left
   Crumbs for nobody in particular, and a controlled Confectioner could have
   baked Candy units for a Martian seat. Fixed: only a unit owned by a Candy
   seat leaves Crumbs, and a controlled Confectioner cannot Re-bake
   ([section 21.2](#212-precise-readings-of-the-design) reading 6).
9. **The AI's cost.** Evaluating a Rushed variant of every Candy unit's plan
   doubles its movement queries. Fixed: the AI considers Rush only for a unit
   with a visible hostile unit within its Move + 1 + range, or on the way to a
   threatened own city; Rush adds at most one command per unit, well inside
   the 128-command cap.

Changes made in the design's final redraft: items 8 and 9 above; the Re-bake
price ignores Arms Industry (so Metallurgy does not stack a second
discount); Escape from a Rushed Donut Racer has the ordinary Move 2 (not 3);
Bounce resolves after the Charge! follow; and Splat applies when a Shield
took the whole hit.
