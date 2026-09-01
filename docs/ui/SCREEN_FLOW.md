# Pulp Wars Ruleset-6 Screen Flow

**Status:** authoritative interaction and responsive-flow specification

**Rules:** [Ruleset 6](../product/RULESET_6.md)

**Architecture:** [Client Architecture](../architecture/CLIENT_ARCHITECTURE.md)

**UI art:** [UI class guidance](../art/classes/ui.md)

The POC follows the researched game's hierarchy and rhythm—presentation-led
faction choice, a board-first match, compact economic HUD, contextual actions,
full technology view, turn handoff, and decisive end screen—without copying
proprietary art, text, layout coordinates, or code.

## 0. Ruleset-6 replacement contract

The responsive navigation, fixed Canvas host, map-first selection, non-modal
docks, direct contextual commands, one-activation positional commands,
semantic parity, focus, 44 CSS px targets, 320 px/200% zoom fallback, reduced
motion, AI presentation, and result routes later in this file remain active.
Every ruleset-5 content example below is historical where it conflicts with
this section. The new-match UI must never show Stars, the nine-node tree,
Catapult, Animal/Lumber Mill terminology, ruleset-5 city rewards, or v5 capacity
as if they applied to ruleset 6.

### Economy and HUD

The HUD labels the sole currency **Coins** and displays `stock (+next income)`.
Its accessible name decomposes next income into city level, capital, Market,
negative-population penalty, and siege. Coin icons are not recolored Star art.

The selected-city dock shows:

- level and signed progress as `population / next threshold`, including
  `-N / threshold` plus “infrastructure lost; replace N population before
  growth”;
- permanent population, live economic-building population, live Market income,
  and total next-turn city income as separate labeled values;
- assigned units as `count / (level + 1)`, explicit over-capacity status, siege,
  3 x 3 or expanded 5 x 5 footprint, and earned rewards;
- exact faction-correct Train commands for Fighter, Scout, Marksman, Guard,
  Raider, Medic, Heavy, or Breacher. Juggernaut is never a Train control.

The selected-tile dock identifies Grass/Forest/Mountain; visible Fruit, Game,
Fertile Ground, Ore, or Stone; all eleven economic improvements; Road;
Chocolate Wall; and territory. An explored resource hidden by technology is
shown only as **Unknown resource — research may reveal it**. It must not use an
outline, icon, text, count, or disabled action that identifies the resource.

Exact offered controls use these labels: Harvest Fruit, Hunt Game, Build Farm,
Build Lumber Camp, Build Mine, Build Quarry, Build Windmill, Build Sawmill,
Build Forge, Build Stoneworks, Build Workshop, Build Grand Works, Build Market,
Clear Forest, Replant Forest, Build Road, and Redevelop. Only the selected
coordinate's public command appears. A Road control and road fact may coexist
with a resource/improvement fact.

### Direct contextual economy actions

An unambiguous contextual action never asks the player to identify information
the current selection and action button already determine. After selecting an
eligible tile, activating its exact Harvest, Hunt, Build, Clear, Replant, Road,
or Redevelop button immediately dispatches that offered public command against
the selected coordinate. It does not enter map-targeting mode, draw an economic
target overlay, open a popup, or request confirmation. This behavior is shared
by pointer, keyboard, and touch activation. Movement, attacks, and genuinely
multi-target spatial abilities retain highlighted-map targeting.

This is the general interaction principle: add confirmation or another choice
step only when the user explicitly requires it. Observation-safe economic
preview data may inform passive labels, accessible descriptions, AI, or
headless clients, but must not turn an exact contextual command into a staged
flow.

When a passive spatial preview is presented, contributors use redundant
code-native patterns and text:

- cluster: connected outline plus numbered Farm/Lumber Camp contributors;
- Forge: spokes to each adjacent Mine;
- Stoneworks: spokes plus distinct straight/diagonal opposite-pair axes;
- Workshop/Grand Works/Market: one shape and named chip per distinct type or
  family, never per duplicate;
- Market Road bonus: continuous capital-connected Road highlight and “+1 Coin
  connected” text.

Cross-city friendly contributors carry their source city label. Hostile and
cooperative-allied buildings never highlight. Fog is never crossed. Recompute
previews immediately after every build, Redevelop, territory transfer, capture,
or Road connection change. Cluster visual merging is cosmetic and cannot hide
individual selectable Farms/Camps.

### Technology tree

Tech first selects the viewing player's explicit faction tree registration,
then renders the complete five-branch, 25-node graph in the frozen Ruleset-6
order. Original uses `ORIGINAL_BASELINE`; Candy uses `CANDY_BASELINE_V1`.
Identical graph geometry does not permit a missing-registration fallback.
Gathering is visibly researched at match start. Fighter is a baseline role
beside the graph.

On wide screens branches form five columns; compact/mobile uses one vertical
branch list with a sticky branch selector and no two-dimensional page scroll.
Every node retains the overview symbol, dynamic Coin price, state, connectors,
and separate detail sheet pattern. Detail lists prerequisite, exact unlocks,
spatial formula when relevant, and the faction-correct unit label. Candy
Raiding explicitly says Donut and Kamikaze Roll rather than promising baseline
Raider Charge. Explosives says Breacher/Candy Crusher, never Catapult.

### Units and abilities

Unit docks use the role and faction labels in Ruleset 6. Marksman/Gumball Guard
keeps one-activation ranged preview. Raider preview states whether Charge is
active and shows the +1 attack. Medic exposes **Heal** only for exact adjacent
owned damaged targets and previews 4 or 6 HP. Heavy/Juggernaut attack preview
states Push: will push, blocked, or unknown behind fog; unknown never hints at
hidden content. Breacher preview says defensive bonuses ignored.

Candy Warrior, Jelly Scout, Gumball Guard, Choco Engineer, Donut, Marshmallow
Medic, Jawbreaker, Candy Crusher, and Sugar Titan are the only v6 Candy names.
Every Candy dock may expose Candify; Choco Engineer may expose Chocolate Wall;
Donut substitutes Kamikaze Roll and has no Attack/Charge. V5 Candy Catapult is
absent from new-match Tech, Train, Stats, and help.

### Territory and rewards

City selection outlines only explored assigned territory. Before level 4 it
also previews the centered 5 x 5 potential boundary without implying ownership.
Expand preview marks neutral cells that will be claimed and retained conflicting
city cells. Candy Candify targeting is clipped to the chosen city's current
3 x 3/5 x 5 footprint and retains the mandatory tied-nearest city dialog.

The blocking reward overlay drains the authoritative queue in order and shows
“Choice 1 of N” without permitting reordering or dismissal:

- level 2: Survey versus Stockpile (+4 Coins);
- level 3: Walls versus Militia (free faction Fighter);
- level 4: Expand versus Boom (+3 permanent population);
- every level 5+: faction Juggernaut versus Treasury (+5 Coins).

If no reward-unit placement exists, its unit choice is unavailable with the
exact reason while the Coin choice remains operable. Boom may append more
choices; the counter updates from authoritative state. Save/reload reopens the
same first item and focus.

### Setup, Stats, help, and accessibility

Per-seat Original/Candy assignment is retained. Its roster summary expands to
the nine v6 names and states that the graph is shared but registered per
faction. The Hub omits Demo Match for v6; the historical scenario is not
reconstructed or offered as a new match.

Stats shows Coins, 25-tech progress, live/negative population totals, Market
income, Roads, all nine roles, territory expansion, and faction tree ID in its
diagnostic details. Rules/Help teaches cluster, adjacency, opposite pairs,
diversity, Grand Works, and Road-connected Markets with small code-native
diagrams and exact formulas.

All contributor patterns, signed population, Road connectivity, Charge, Heal,
Push, Breach, resource-hidden state, and reward position have semantic text and
live announcements. Motion may animate building placement, field merging,
connection tracing, Charge, Push, or Heal, but Reduced replaces travel with a
100 ms crossfade and never removes the textual result. No animation changes
commands, reveals, contributor membership, event order, or hashes.

## Historical ruleset-5 interaction detail and retained layout behavior

The numbered sections below contain retained layout/accessibility behavior and
historical v5 content examples. Section 0 replaces every content-specific
example for new ruleset-6 matches.

## 1. Navigation model

```text
Splash -> Hub -> Single Player -> Conquest Setup -> Faction Picker -> Match
            |                                               ^          |
            +-> Settings                                    |          +-> overlays
            +-> Resume -------------------------------------+          |
                                                                       v
                                                        Victory / Defeat
                                                          |          |
                                                        Restart     Hub
```

Browser Back inside front-of-game screens moves one step after confirmation if
it would discard a setup draft. During a match it opens Settings/Pause; it never
navigates away silently. Refresh restores a valid autosave to the Match route
after Splash. Direct unsupported URLs fall back to Hub with a polite message.

Exactly one modal owns focus. A modal pauses human input but not because the
simulation has a pause concept. Required city rewards cannot be dismissed.

## 2. Splash and load resolution

### Splash

Purpose: establish brand tone, load local settings/save metadata, and decide
the safe next route. Show a Pulp Wars wordmark treatment, a short loading label,
and no fake account/profile controls. It remains for at least 350 ms when motion
is enabled so loading does not flash; reduced motion removes that minimum.

Transitions:

- no save or valid completed save -> Hub;
- valid active save -> Hub with Resume as the primary action;
- corrupt/incompatible save -> Hub plus a persistent recovery banner with
  Inspect Details and Delete Save; never auto-delete or partially load;
- unrecoverable app initialization error -> an error surface with Reload and
  Copy Diagnostic, not a blank Canvas.

The researched profile/account state is explicitly omitted: the POC is local
and has no profile, throne room, unlock inventory, or account loading.

## 3. Hub

The Hub has one strong primary card/button: **Resume Conquest** when a valid
active save exists, otherwise **New Conquest**. Secondary actions are New
Conquest, Settings, and About/Rules. The current seed, round, player count, and
save time appear beneath Resume. New Conquest warns before replacing a current
save, but only at final setup confirmation.

Explicit omissions and placeholders:

- Multiplayer: visible only as a non-interactive “Not in this POC” label if it
  helps communicate scope; it has no lobby route.
- Profile/customization, leaderboards/scores, throne room, store, and recurring
  challenge: omitted, not disabled mystery icons.
- About/Rules is a small local help panel, not a progression screen.

Hub -> Resume validates the full save and enters Match. Hub -> New Conquest
enters Single Player. Settings returns focus to the invoking Hub control.

The Hub also exposes a visible **Demo Match** action with concise contents:
Huge 25 x 25, two rival Normal AI, all nine human technologies, two level-three
human cities, eight ready human units, and full human exploration. It opens a
start summary for fixed seed `decafbad`. When any current or preserved save
exists, the demo uses the same explicit Replace Save confirmation and
destructive treatment as final New Conquest confirmation; cancellation leaves
the old match untouched. Creation enters Match centered on the human capital.

## 4. Single-player and mode screen

This screen preserves the researched mode-choice beat while making scope clear.
**Conquest** is the only selectable card and explains: eliminate rivals by
capturing all their cities, no turn limit, one to three AI.

Perfection, Creative, Boot Camp, and Weekly Challenge each receive an explicit
plain-language omission in a “Beyond this POC” section; they are not selectable
and do not resemble locked purchases. Glory and Might are multiplayer modes and
are covered by the Multiplayer omission on Hub. Choosing Conquest enters Setup;
Back returns to Hub.

## 5. Conquest setup

Fields appear in this order:

1. **AI opponents:** segmented choice 1, 2, or 3; default 1.
2. **AI relations:** Rival (default) or Cooperate against you. Cooperative
   explains that AI seats neither attack nor enter/explore one another's
   territory and target the human; it is allowed with every opponent count.
3. **Board size:** Auto (default), Tiny 11 x 11, Small 14 x 14, Normal 16 x 16,
   Large 20 x 20, Huge 25 x 25. Sizes below the minimum for the chosen AI count
   are disabled with an exact explanation. Auto shows its resolved 11/14/16
   size live and never resolves to Large or Huge; both explicit large presets
   are enabled for every AI count.
4. **Difficulty:** read-only “Normal (Greedy POC)—same income and information
   rules.” No implied unavailable difficulty picker.
5. **Seed:** text field, 64-character limit, with Randomize and Copy. Empty is
   labeled “randomized when the match is confirmed.” After Randomize it displays
   eight hexadecimal digits.
6. **Your color:** accessible named swatches. Used colors remain distinguishable
   by player number and pattern/status text; color never carries meaning alone.

Continue validates inline and enters the compact faction assignment. Back preserves the
draft for the current visit. There are no map-type, water, timer, player-created
team, ranked, human-seat, or network fields.

## 6. Per-seat faction assignment

This is one compact screen, never a wizard or one-seat-at-a-time carousel. It
shows all seats simultaneously in stable order: **You**, then **AI 1** through
**AI 3** as selected. Each row contains one small representative portrait and a
two-option segmented control for **Original** or **Candy**. All rows default to
Original; repeats are allowed. Going Back and returning preserves choices for
still-present seats. Increasing AI count adds Original rows; decreasing it
removes only trailing rows. One short expandable roster summary explains Candy
Warrior/Gumball Guard/Choco Engineer/Donut and keeps the default screen compact.

One shared preview area shows the focused row's Original or Candy faction hero
and roster names. It sits beside the list on wide screens and collapses below
the rows on mobile; it never creates another navigation step or pushes Start
off-screen at 320 CSS px or 200% zoom.

**Start Conquest** opens a confirmation summary containing every seat's faction,
opponent count, AI relations, resolved board dimensions, Normal parity, and resolved seed. If the
seed field was empty, resolve and show it before confirmation. Confirm creates
the match and autosave, then enters Match. Cancel returns to the picker without
changing the resolved seed. Starting while another active save exists
explicitly asks to Replace Save. Back returns to Setup.

Locked factions, purchases, horizontal roster browsing, faction progression,
and more than the two approved factions are explicitly omitted. Demo skips this
screen and uses three fixed Original seats.

## 7. Match map and HUD

The map is the primary surface: pannable and zoomable Canvas with persistent
fog, ownership, cities, units, selection, legal destinations, targets, and
event animation. DOM controls sit around it.

Persistent HUD content:

- player identity as Player 1 plus color/pattern;
- Stars as `stock (+next income)`, where besieged-city effects are current;
- Round and active player/turn status;
- owned cities and units as compact counts;
- Settings, Stats, Tech, and End Turn actions;
- a Fast Forward action only during AI presentation.

The POC does not maintain a Polytopia-compatible score, so the researched Score
HUD item is explicitly replaced by city/unit counts. Turn uses **Round N · Your
Turn** or **Round N · Player X thinking** rather than copying original wording.

Map feedback must include:

- tile focus/selection, ownership boundary and capital marker;
- city name/ID, level, population progress, capacity, and siege state;
- unit type, current HP, handled/attention state, veteran eligibility, and owner;
- legal move destinations, attack targets, canonical path, ZOC stop indicator,
  and explicit combat preview;
- unexplored-cloud treatment and newly revealed tiles;
- rewards, level-up, capture, combat, elimination, save-warning, and turn
  announcements that do not rely on animation alone.
- explored Chocolate Wall owner/HP, legal wall targets, Candify ownership
  changes, and Donut Roll direction/path-step feedback.

Pointer click/tap selects. With an owned unit selected, one click/tap or
Enter/Space activation of a highlighted legal destination immediately dispatches
the exact canonical Move/Escape path; one activation of a highlighted legal
unit or Chocolate Wall target immediately dispatches Attack. There is no second click, confirmation
button, or combat modal. Every attack highlight shows defender/retaliation
damage and death/advance cues before activation, with the same text in its
accessible name. Drag pans only after a movement threshold so a tap still
selects. Wheel/pinch and zoom controls change camera only.

Inspection activation uses a deterministic visible-occupant-first cycle. On an
explored coordinate with a visible friendly or enemy unit, the first activation
selects and highlights that unit. The second consecutive activation of exactly
that coordinate selects its visible underlying city when present, otherwise its
tile/site; the cycle then returns to the unit. A wall can never share a unit
cell, so on a visible wall coordinate the first activation selects the wall and
the second selects its underlying city/tile. Pointer, touch, Enter/Space, and the
semantic coordinate activator share this order. An exact currently offered
positional command is the narrow priority exception: a selected owned unit may
still activate its offered Attack target directly, and an offered Move or Escape
destination dispatches immediately. Cycling resets after activating
a different coordinate, Escape, an accepted command boundary, a new match
instance, or disappearance of the cycled unit. Ordinary rerenders, HUD updates,
and other harmless DOM remounts do not reset a pending second
activation. All occupancy and reset checks use the filtered `PlayerView`; an
unexplored coordinate never exposes or cycles hidden contents.

Selecting any visible owned or enemy unit opens a compact, non-scrolling action
dock in the bottom HUD for that exact unit. It gives owner, type, current/max HP,
attack, defense, movement, range, veteran state when present, and concise
activation state without a repeated inspection click. Unit selection never
creates a modal or backdrop: the whole map remains undimmed, highlighted,
pannable, zoomable, and targetable. Immediate commands use short
labels—**Capture Village**, **Capture City**, **Recover**, **Promote**, and
**Wait**—while Move, Attack, and Rider Escape remain associated with their
highlighted map targets. Wait appears only while `handled = false`; accepting
it stops attention presentation but leaves every Move/Attack/Recover/Capture/
Promote command legal. Only commands from `queryPlayerCommands` whose `unitId`
matches the selected owned unit may appear. Enemy, exhausted, and otherwise
actionless units show summary/state only. Labels never encode unit coordinates
or hidden options; the visible map selection supplies context.

On a newly selected unit, Full motion gives the unit raster one subtle in-place
jump: 12 nominal CSS px upward and back over 240 ms at Normal animation speed,
or 120 ms at Fast. Pointer, touch, Enter/Space, the semantic unit option, and
the semantic coordinate activator all enter the same transition. The sprite
alone moves; its map anchor, selection diamond, owner/health cues, camera, and
hit target stay fixed. Re-inspecting the same selected unit does not restart
the jump. Reduced motion is pixel-stationary and schedules no jump animation.

Candy actions use three short buttons: **Roll**, **Chocolate Wall · 1★**, and
**Candify**. Roll switches the map to cardinal direction targets, omitting
off-board directions; one activation dispatches immediately and no victim list
or hidden prediction is shown. Chocolate Wall highlights only exact offered
eight-neighbor cells and dispatches on one activation. Candify dispatches
immediately. A unique nearest city resolves without another UI step; tied
nearest cities open the mandatory choice dialog in section 12. Direction/build
targeting never dims the map and Escape cancels it.

The old circle/check readiness mark and every detached yellow `W`/`R` tile
badge are removed entirely. During the human turn, each owned surviving unit
with `handled = false` pulses its actual sprite from opacity 1 to 0.62 and back
on a 1.6 s ease-in-out loop; owner cue and health stay steady. Move, Attack,
Escape, Recover, Capture, or Wait stops the pulse at the accepted command
boundary; Promote alone does not. Reduced motion leaves the sprite fully opaque
and schedules no pulse. The unit dock and semantic label say **Needs action**
or **Handled**, so motion/color is never the only signal.

Selecting any visible owned or rival city opens the parallel non-scrolling
selected-city dock in the bottom HUD. The board stays undimmed, pannable, and
zoomable; the city tile keeps the selection diamond and only explored tiles in
currently assigned to it receive a code-native perimeter. Fogged territory is never
filled, outlined through fog, or otherwise disclosed. The dock gives city
identity, owner, capital and siege state, level, exact population progress,
income, non-exempt assigned count/level limit, separately identified exempt
founder count, and chosen rewards. It contains only exact currently offered
training commands associated with that selected owned city; Harvest Fruit,
Hunt Animal, Build Lumber Mill, and Build Mine never appear on city selection.
Rival, besieged, locked,
at/over-capacity, and actionless cities show summary only. Every training button
visibly contains only the selected city's faction-correct unit art, bare unit
name, and star cost;
semantic accessible names may describe the training action, but visible text
never says “Train” or repeats requirements, coordinates, descriptions,
population guidance, or other metadata.

End Turn dispatches immediately whenever offered, including when units remain
unhandled, affordable training remains, or a capture is available. Mandatory
pending choices prevent it from being offered. During an AI turn map
inspection, Stats, Tech, and Settings are allowed, but gameplay commands and
End Turn are disabled.

## 8. Context panels

Panels are persistent beside the board on wide desktop and bottom sheets on
narrow/touch layouts. Opening one does not hide the selected tile highlight.
Escape/Close returns focus to the selected tile control or Canvas proxy.

Unit selection is the non-blocking bottom dock specified above, not a context
panel. It does not repeat destination lists or disabled hypothetical actions.
For Defender, after movement it says “Moved · cannot attack (no Dash)” rather
than leaving an unexplained disabled Attack. Disband remains excluded.

### Selected-city dock

City selection uses the map-first bottom dock specified above, never a context
panel, modal, backdrop, or scroll sheet. A mandatory pending reward takes
precedence as its dedicated blocking overlay. Tile/resource inspection remains
separate and may identify an individual economic target.

### Selected-tile/resource dock

Every tile selection uses a compact bottom dock overlay, never a context
panel, modal, backdrop, focus trap, or dimming layer. It shows coordinate,
explored terrain, territory owner, occupying resource/improvement/entity,
movement implication, and defense. Owned Ore, Fruit, Animal, and empty Forest
show Build Mine, Harvest Fruit, Hunt Animal, or Build Lumber Mill only when that
exact command is public and legal. Locked prerequisites/cost/effect may be concise
descriptive text, never disabled fake commands. Ordinary mountains are
“Mountain · no ore” and never show Build Mine. Every city level leaves remaining
resources/Forest usable subject to the ordinary tile rules. Unexplored tiles expose
only “Unexplored,” not hidden terrain, resource, ownership, diplomatic owner,
or action data. Empty Grass has no invented build action; empty Forest identifies
the Forestry path without inventing a legal button. Escape clears the dock and
returns focus to Canvas.

An explored Chocolate Wall adds its owner and `HP / 10` to this dock but does
not replace terrain/resource/improvement facts. It is identified as a structure,
not a unit or city, and never shows unit lifecycle actions. Attack remains a
highlighted spatial action from a selected attacker, including against an owned
or allied wall when the public query offers it.

## 9. Technology tree

Tech opens as a full-screen layer on small viewports and a large modal on wide
desktop. It presents the exact four-root/nine-node graph from POC Rules:
Climbing -> Mining, Riding, Hunting -> Forestry -> Mathematics,
Hunting -> Archery, and Organization -> Strategy.
Warrior appears as a baseline unlock beside the graph, not a technology.

The overview is an uncluttered dependency diagram. Every node shows only its
technology symbol, current dynamic star price, and a redundant visual state mark
for researched, available, insufficient-stars, or locked. Connectors and an
assistive dependency summary make roots and tier-two children explicit; long
names, prerequisites, and unlock prose do not appear inside overview nodes.

Selecting any node by pointer, touch, Enter, or Space opens or updates one
separate wide, compact detail sheet. The sheet names the technology and shows
its unlock/effect, prerequisite, current cost and state. It contains the exact
research action only when that action is currently offered by the filtered
player command query. Activating Research dispatches that exact command
immediately with no confirmation; after purchase the tree remains open,
preserves the selection and focus, announces the researched technology, and
updates every dynamic price and state. Insufficient or locked nodes explain why
in the detail sheet. Close returns to the same map focus. During AI presentation
the tree is view-only.

There are no full-game branches displayed as teasing locked nodes.

Organization's detail names both effects: **Harvest Fruit (2 stars -> +1
population)** and **unlocks Strategy**. Mining says **Build Mine only on ore (5
stars -> +2 population)**; it never implies that every Mountain is mineable.
Hunting names **Hunt Animal (2 stars -> +1 population)**, Forestry names
**Build Lumber Mill on empty Forest (3 stars -> +1 population)**, and
Mathematics names **Train Catapult (8 stars; range 3)**.

## 10. Stats

Stats is a full-screen layer/sheet listing all seats in stored turn order. Each
row shows player number/color/pattern, faction, human or Normal AI, active/eliminated,
cities, capitals owned, units, stars, technologies, kills, losses, and current
round. The current turn is marked. The heading shows **Rival AI** or
**Cooperative AI against you** from setup; no mutable pairwise diplomacy is
calculated. A short objective states “Capture all hostile cities before losing
your last city.” No score, rank, percentage rating, online profile, or
leaderboard is calculated.

Stats is view-only and can open during human or AI presentation. Close restores
prior map selection/focus.

## 11. Settings and pause

Settings can open from Hub or Match. Shared controls are master/music/effects
volume (even if initial audio assets are absent, controls may be omitted until
audio exists), UI scale, motion (Full/Reduced), animation speed (Normal/Fast),
high-contrast map overlays, and Help/Controls. System `prefers-reduced-motion`
is the initial default unless the player overrides it.

Match-only actions are Resume, Restart Same Match, Exit to Hub, and Delete Save.
Restart uses the same setup/seed and requires confirmation. Exit preserves the
autosave and returns to Hub. Delete Save is destructive, requires the exact
confirmation “Delete current saved match?”, and returns to Hub after success.
There is no Resign rule in the POC; Exit is not elimination.

Opening Settings pauses human interaction and AI presentation. If the AI engine
has already computed a command, its accepted state is saved before the modal;
presentation resumes from queued events. No wall clock enters simulation.

## 12. Reward and confirmation dialogs

### City reward

Level-up creates a blocking, non-dismissible dialog titled with city and new
level. At level 2 it compares Workshop (+1 income each turn) and Survey (reveal
radius 3 now). At level 3 it compares Resources (+5 stars now) and City Wall
(4x eligible city defense). Each choice has text and an icon; neither relies on
color. Selecting a reward asks no second confirmation because the first dialog
already shows the irreversible effect. The dialog remains until a legal choice
is accepted.

### Candify city choice

A tied-nearest Candify opens a blocking, non-dismissible dialog titled
**Choose city for Candify**. It lists only the authoritative candidate cities in
ascending ID, each with city name/ID and a small explored-territory preview.
Choosing one dispatches `CHOOSE_CANDIFY_CITY` immediately; there is no Cancel,
map target, recomputed candidate, or second confirmation. Save/reload reopens
the same candidate set and returns focus to the first candidate.

### Other confirmations

- Attack has no dialog or confirmation; highlighted targets carry exact damage,
  retaliation/reason, death, and advance preview before one-activation dispatch.
- End Turn has no confirmation; activating the offered command dispatches it
  immediately.
- Research has no confirmation; activating an available detail-sheet action
  spends its displayed dynamic star cost and updates the open tree immediately.
- Start/replace match, Restart, Delete Save, and navigation that discards setup:
  exact consequence, safe action first in focus order, destructive action
  visually and semantically identified.

Ruin, encounter, monument/task, and super-unit reward dialogs from the reference
have no POC counterpart because those mechanics are excluded.

## 13. AI progress and turn handoff

At human End Turn, update the HUD to the next seat and announce it. Each AI turn
shows **Player X is thinking…**, an indeterminate progress indicator, and Fast
Forward. Accepted AI events animate in authoritative order. Normal speed uses
short readable beats; Fast Forward finishes queued presentation and continues
subsequent AI turns with animations suppressed until the human turn.

Input that would affect the match is disabled, but map pan/zoom and view-only
overlays remain available. The UI never displays hidden AI considerations.
After all AI turns, center only if the human's selected object no longer exists;
otherwise preserve camera and selection. Announce new round, income, siege, and
any eliminated player before enabling input.

If the human is eliminated during AI turns, finish the causal capture and
elimination events, record the capturing AI as the defeating player, then go to
Defeat without simulating the remaining AI seats. An AI compute error stops
progress with Retry From Autosave and Return to Hub; it must not invent End Turn
or mutate past state.

## 14. Victory, defeat, restart, and resume

Victory/Defeat is a full-screen result reached only from authoritative
`MATCH_ENDED` or human-elimination state. Show winner, rounds completed, seed,
opponents, board size, cities captured, units defeated/lost, technologies, and
elapsed real time only if explicitly labeled non-gameplay. Do not fabricate a
score or Domination percentage.

Actions:

- **Play Again:** confirmation, then recreate the identical setup and seed;
- **New Conquest:** Setup with previous opponent/AI-relations/size/color values
  but a blank random seed;
- **View Final Map:** read-only Match route with Results button to return;
- **Return to Hub:** completed save may remain as a viewable final result, but
  Resume is replaced by View Result/New Conquest.

Resume from Hub loads the last accepted command boundary. It never resumes
halfway through an animation, open transient confirmation, or AI thought. A
pending authoritative city reward does reopen because it is state. If save
validation fails, remain on Hub and use the corruption flow.

## 15. Responsive layouts

Renderer geometry is configurable and never enters simulation.

The match root is always `100dvh`; its Canvas host fills that fixed root and is
not a grid/flex row whose size depends on selection content. Top HUD and the
selected tile/unit/city dock overlay it. A dock sits at `inset-inline: 0` and
`bottom: env(safe-area-inset-bottom)`, wraps to its natural height, and may
obscure the lower map. Opening it, adding a line, swapping a selection, or
closing it must preserve Canvas CSS/backing dimensions, camera center/zoom, and
logical selection exactly. Normal layouts allow up to 45dvh without internal
scroll. Only the accessibility fallback at 200% browser zoom or 320 CSS px may
raise its maximum to the space below the top HUD and scroll the dock vertically
to keep every required control reachable. This explicitly replaces the older
“remaining viewport between HUD and dock” layout that caused map jolts.

### Wide desktop: 1024 px and above

- board fills the viewport behind/alongside a 320 px contextual side panel;
- top HUD is a single compact row; primary map actions sit at the lower/right
  edge with at least 44 x 44 CSS px targets;
- tech/stats/settings use centered modal or wide layer no larger than readable
  line lengths; keyboard hover/focus preview is available.

### Compact/tablet: 600–1023 px

- HUD wraps into two short groups without covering active selection;
- tile, unit, and city selection all use bottom docks without internal scrolling;
- primary actions remain fixed above the safe-area inset; tech becomes full screen.

### Mobile: below 600 px

- portrait is fully supported; landscape is supported without requiring rotation;
- map Canvas continues to fill the fixed match root behind a compact two-row
  HUD and overlaid bottom action bar; selected docks reflow over the map;
- use `env(safe-area-inset-*)`, minimum 44 x 44 CSS px targets, no hover-only
  information, and explicit zoom buttons alongside pinch;
- dialogs fit within the visual viewport, scroll internally, and keep action
  buttons reachable above the on-screen keyboard.
- a Large or Huge map starts centered on the human capital at minimum zoom and
  is intentionally explored by pan/zoom; the current visible slice must not
  clip tall unit, mountain, or city sprites at the Canvas edge.

At 200% browser zoom and 320 CSS px width, all front-of-game tasks and turn
actions remain operable without two-dimensional page scrolling. The Canvas may
pan by design; DOM content must reflow.

## 16. Keyboard and accessibility

All non-map controls use native semantic elements and logical DOM order. Visible
focus meets WCAG 2.2 AA contrast. Text/background and meaningful graphical
objects target AA contrast; faction identity always combines color with player
number/pattern. Icons have adjacent labels or accessible names.

Keyboard baseline:

| Key             | Map behavior                                                             |
| --------------- | ------------------------------------------------------------------------ |
| Arrow keys      | Move logical tile focus orthogonally                                     |
| Shift + Arrow   | Move logical tile focus diagonally                                       |
| Enter/Space     | Select focused tile or immediately dispatch its exact offered action     |
| Tab / Shift+Tab | Traverse HUD, panel, and available actions                               |
| Escape          | Cancel path/selection, close top overlay, or open Settings from bare map |
| `+` / `-`       | Zoom in/out                                                              |
| `T`             | Open Technology                                                          |
| `G`             | Open Stats                                                               |
| `E`             | Request End Turn; warnings still apply                                   |
| `?`             | Open Help/Controls                                                       |

Shortcuts do not fire while typing or when a modal owns focus. They are listed
in Help and can be ignored in favor of full Tab navigation.

Because Canvas content is not inherently semantic, maintain one DOM “map
cursor” description reporting coordinate, terrain, owner, unit/city/Chocolate
Wall, HP, and
resource/improvement (`Fruit`, `Ore`, `Animal`, `Mine`, `Lumber Mill`, or the
terrain-appropriate empty state) plus available actions for the
logically focused tile. A native semantic coordinate activator follows the same
visible-occupant-first order as Canvas activation. Selection and event changes
update a polite live region; combat deaths, city capture, elimination, errors,
and turn ownership use assertive announcements sparingly. Do not announce every
animation frame or pan.

For an Archer Attack in Full/Normal motion, a programmatic arrow travels from
the Archer attachment to the defender for 280 ms with cubic-out progress; a
100 ms impact ring/crossfade follows, and post-combat HP/death appears at the
impact boundary. Reduced motion omits travel and uses one 100 ms impact
crossfade; Fast Forward is immediate. Settings pauses this clock. Route/match
replacement or event-plan invalidation cancels directly to the authoritative
post-event frame. Pan/zoom/resize reprojects rather than restarts the arrow, and
no animation frame is announced. Other reduced-motion travel/combat uses short
crossfades or immediate state changes. Readiness sprite animation is removed,
not frozen; the sprite stays opaque. Flashing is avoided. Combat, targeting, health, handled/readiness, siege, and tech state
use shape/text as well as color. Attack preview is attached to every highlighted
target for pointer, touch, keyboard, and assistive technology—never
hover/long-press only—and activation still commits immediately.

For a Gumball Guard the same timing uses a round gumball rather than an arrow.
Donut Roll travels 90 ms per cell up to 900 ms, Build rises for 180 ms, and
Candify washes/dissolves for 240 ms. Reduced motion replaces each complete
ability with one 100 ms crossfade; Fast Forward is immediate. Live regions
announce the action, each damaged entity once, wall destruction, and final
territory owner, never animation frames.

## 17. Reference-screen coverage

| Researched surface         | POC treatment                                                 |
| -------------------------- | ------------------------------------------------------------- |
| Boot/splash/profile        | Splash included; account/profile explicitly omitted           |
| Main hub                   | Included with Resume, New Conquest, Settings                  |
| Single-player mode chooser | Included; Conquest playable, other modes explained as omitted |
| Creative/match setup       | Reduced Conquest setup with exact supported fields            |
| Tribe picker               | Compact per-seat Original/Candy assignment included           |
| Multiplayer browser/lobby  | Explicitly omitted on Hub; no dead-end screen                 |
| Loading/generation         | Start confirmation plus progress/error state before Match     |
| Map/HUD                    | Included; score replaced by objective-relevant counts         |
| Unit/city/tile docks       | Non-blocking exact actions with tile-only resources           |
| Technology tree            | Included full-screen/modal with nine POC technologies         |
| Game Stats                 | Included with fixed AI mode; no score/rank/profile            |
| Settings/pause             | Included with restart/exit/delete confirmations               |
| Choice/reward dialogs      | City rewards and tied Candify city choice included            |
| AI/turn handoff            | Included with progress and deterministic fast-forward         |
| End screen                 | Victory/defeat, final map, replay/restart routes included     |
