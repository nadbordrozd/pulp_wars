# Pulp Wars Ruleset-6 Screen Flow

**Status:** authoritative interaction and responsive-flow specification

**Rules:** [Ruleset 6](../product/RULESET_6.md)

**Architecture:** [Client Architecture](../architecture/CLIENT_ARCHITECTURE.md)

**UI art:** [UI class guidance](../art/classes/ui.md)

The POC follows the researched game's hierarchy and rhythm—presentation-led
faction choice, a board-first match, compact economic HUD, contextual actions,
full technology view, turn handoff, and decisive end screen—without copying
proprietary art, text, layout coordinates, or code.

## Current Ruleset 7 simplified interface overlay

The [simplified interface contract](../art/classes/ui.md#current-ruleset-7-simplified-interface-2026-09-24)
governs current Ruleset 7 HUD, dock, dialog, and copy presentation. Player-facing
text is short and plain. Rules are discovered through play and the `?` and
tech-detail views, not spelled out in the HUD or dock. Where later sections
require specific verbose labels, formula prose, or `+N/turn` wording for
Ruleset 7, this overlay wins. Ruleset 6 and legacy routes are unchanged.

## Current CHIBI board look (visual direction, October 2026)

This overlay applies to the CHIBI art set of the current Ruleset 7 route
(bead `pulp_wars-3tq.6`; rules and evidence in
[the visual direction](../art/VISUAL_DIRECTION_2026-10.md#13-live-default)).
It is what a player with no stored preference sees. Where a later section
describes the CHIBI seat badge, the always-on vertical HP bar, the unit
outline glow as the ready cue, dashed territory borders or black-cased
Roads, that text now describes the **Classic look** developer option
([section 11](#11-settings-and-pause)); the LEGACY art set is unchanged.

- **No base plates; the faction says whose a unit is** (bead
  `pulp_wars-w5j.3`, [section 20 of the visual direction](../art/VISUAL_DIRECTION_2026-10.md#20-faction-looks-instead-of-base-plates)).
  Every player plays a different faction, and every faction's units,
  portraits, cities and ships are in fixed faction colours, so the look
  tells players apart. A land unit (and an Egg) stands on a faint neutral
  ground shadow; a unit on water and a flyer have none. Ships and the
  embarked transport are the owner faction's own (a Human cog, an Undead
  ghost ship, a Martian hover-boat, ...), with no ring and no
  player-coloured sail. The player colour stays on the territory border and
  the city pennant only. (Until w5j.3 units stood on a seat-shaped plate in
  the player colour, and ships kept a player-coloured sail in a thin ring.)
- **No numbered seat badge** is drawn on units or cities.
- **HP bar only when damaged:** a short horizontal bar under the feet (dark
  track; green, amber at two thirds or less, red at one third or less). A
  unit at full health has no bar. A garrisoned unit's bar is shorter and
  sits under its reduced sprite. The bar stays inside the cell, above the
  territory border and the selection outline.
- **Ready cue on the ground:** a unit that can still act has a thin cream
  ring on the ground round its feet (round its hull for a ship), in no
  player colour; it is an ellipse, never the square cell outline of the
  selection. The outline glow is not drawn; the dock still says **Needs
  action** or **Handled**.
- **Cities.** A Human city flies a code-drawn swallow-tailed pennant in the
  player colour from its tower, carrying the seat's shape in cream, or in
  gold for the capital (which then has no separate crown). A Goblin city
  (bead `pulp_wars-3tq.9`) does the same from the bare pole of its scrap
  camp: the lookout pole, the tower or the big tent. A Martian colony (bead
  `pulp_wars-t6s.4`) flies it from the tip of its own antenna mast. A
  faction city without a usable direction raster keeps its classic art in
  its owner recolour and the capital crown, with no seat badge and no
  pennant.
  Population pips and the Field Defense badge are unchanged.
- **Ports and Shipyards** fly a smaller pennant in the territory owner's
  colour. Other improvements carry no player colour: the shared set (Farm as
  beds of mixed vegetables, Lumber Camp, Windmill, Sawmill, Forge, Workshop,
  Market, Monument) and the neutral Village are drawn as authored.
- **Human units, portraits and City 1 to 3** use the direction's art in the
  faction's fixed crimson and gold for every player, on the board and in the
  docks, training cards and technology cards. **Goblin units, portraits
  and City 1 to 3** (bead `pulp_wars-3tq.9`) likewise use fixed faction
  colours for every player: olive goblins, darker green orcs and a dark
  green troll in brown leather, rust and gunmetal scrap, and the fireworks
  cart. Undead and Dinosaur units and portraits keep their player-coloured
  garments.
- **Undead (bead `pulp_wars-3tq.12`).** The Undead are converted too, which
  replaces what the bullets above say about them: every Undead land
  unit, its portrait and the Raise Dead, Devour, Wail and Frenzy icons use
  the direction's art in fixed colours (pale bone, near-black cloth, pallid
  ash grey flesh, one violet accent) for every player, on the board and in
  the docks, training cards, technology cards and Help. An Undead city is a
  dark slate necropolis with bone trim and violet windows and flies the same
  code-drawn pennant from a tower as a Human city (seat shape in cream, gold
  for the capital, no separate crown). The Wail, Lich splash, Raise Dead and
  spirit wisp effects are violet, with violet rings; the Raise Dead target
  preview is violet like the Wail radius. Plague and Bitten markers, the
  cure sparkle and Grave markers are unchanged. A raster that fails to load
  falls back to the classic Undead asset of that piece. See
  [the Undead production section](../art/VISUAL_DIRECTION_2026-10.md#17-undead-production).
- **Dinosaur (bead `pulp_wars-3tq.13`).** The Dinosaurs are converted too,
  the last of the four factions, which replaces what the bullets above say
  about them: every Dinosaur land unit, its portrait, the Egg and the Lay
  Egg, Hatch and Stampede icons use the direction's art in fixed colours
  (deep blue hide with a navy back and a cream belly, tawny spotted fur on
  the cavemen, one red-orange accent, and a body pattern per species) for
  every player, on the board and in the docks, Lay Egg cards, technology
  cards and Help. An Egg is cream with orange speckles and carries no player
  colour: it stood on a plate as wide as a large unit's until bead
  `pulp_wars-w5j.3` (now the neutral ground shadow: an Egg is always the
  Dinosaur player's), and its countdown chip keeps the owner-coloured ring. A
  Dinosaur city is the bone-and-hide camp with tawny tents and flies the
  same code-drawn pennant as a Human city (seat shape in cream, gold for the
  capital, no separate crown). The growth chevrons and scale, the Charge!,
  Acid and Armoured previews, the dust, flash, shell and ring cues and the
  War Drums icon are unchanged. A raster that fails to load falls back to
  the classic Dinosaur asset of that piece. Only the shared ships still
  carry a player-coloured part (the sail). See
  [the Dinosaur production section](../art/VISUAL_DIRECTION_2026-10.md#19-dinosaur-production).
- **Territory borders** are one thin solid line in the owner colour with a
  soft dark casing; a border shared by two owners alternates their colours.
- **Roads** have no black casing. Terrain, resources and Treasure keep their
  art, drawn at lower contrast.
- **Unchanged:** Field Defense, the faction badge of a stand-in sprite,
  Plague and Bitten markers, Grave markers, Egg countdown chips, growth
  chevrons, landing markers, Kaboom! and other previews,
  selection and target outlines, and every dock, dialog and label.
- **Loading.** The direction's art loads with the rest of the CHIBI set. A
  piece is not drawn until its raster is ready (never the previous art
  first), and a piece whose direction raster fails to load falls back to its
  classic asset alone.

## Current Ruleset 7 revision 9 overlay

This overlay applies only to the current Ruleset 7 route. The Ruleset 6
sections below remain authoritative for the unchanged Ruleset 6 route.

- The current Original tree has five visible branches and 23 technologies.
  Dry Land keeps all three Naval cards visible in a disabled state; their
  detail says `Unavailable on Dry Land maps` and offers no research action.
- Unit docks show a short tactical role and compact Inspired, Tended, and
  Overrun cues. Rally, Tend wounded, Land grant, Cultivate, Blast, and
  Shipyard use icon-first contextual actions; their explanations remain in the
  `?` or technology detail.
- Training buttons show the actual offered cost after an active same-city Forge
  or selected active Shipyard discount. Shipyard tiles show preserved visible
  resources, blockade state, and the active `Ships −2` benefit.
- Windmill, Sawmill, and Forge use adjacent same-owner contributors. Workshop
  requires a same-city basic improvement. Market shows its 1-Coin base plus
  adjacent family income without requiring a Road.

## Current Ruleset 7 revision 12 overlay

- No technology is researched at match start. While the player has researched
  nothing, every offered tier-1 card shows `Free` instead of a Coin price, its
  detail says the first technology is free, and its research action reads
  "Research … for free". A Dry Land Naval card keeps its ordinary price.
- A Raider that survives an attack stays selected; its offered escape Moves use
  the ordinary move highlight, and the unit card shows the tactical cue
  `Escape: may move again` plus an Escape status chip. The Raider `?` detail
  explains Escape. No new raster art is used.

## Current Ruleset 7 revision 13 Undead overlay

This overlay implements
[Undead spec section 10](../product/RULESET_7_REVISION_13_UNDEAD.md#10-ui-requirements);
the Undead rules are part of
[Ruleset 7: current rules](../product/RULESET_7_CURRENT.md). A match without
an Undead seat looks and behaves exactly as in revision 12.

- Setup always shows a labelled **Factions** group with one faction select
  per seat ("Your faction", "Player N faction"), offering Human and Undead
  (and, since revision 17, Goblin, since revision 19, Dinosaur, and since
  `pulp_wars-t6s.4`, Martian; see the
  [Goblin overlay](#current-ruleset-7-revision-17-goblin-overlay), the
  [Dinosaur overlay](#current-ruleset-7-revision-19-dinosaur-overlay), and the
  [Martian overlay](#current-ruleset-7-martian-overlay)), all Human
  by default (since `pulp_wars-w5j.1`, distinct defaults and no repeated
  faction: see the
  [unique factions overlay](#current-ruleset-7-unique-factions-overlay))
  and resized with the opponent count; the launched setup carries
  each seat's choice. There is no URL parameter or development flag for it
  (`pulp_wars-vkq.16` removed the former `?undead=1` flag). Saves with Undead
  seats resume and play like any other save.
- Every unit is named by its owner's registration (Skeleton, Ghoul, Banshee,
  Zombie, Necromancer, Lich, Vampire, Abomination) in the dock, `?` detail,
  training buttons and help, the map cursor description, and notifications.
  Technology, research offers, rewards (Militia "A free Skeleton",
  Abomination) and Help use the viewer's faction text. In a match with an
  Undead seat the leaderboard shows a faction chip per player and the turn
  status reads "Player N (Human|Undead) is playing…".
- Art: CHIBI paints the approved Undead unit, portrait, Frenzy icon, and
  Grave rasters ([Undead faction art](../art/factions/UNDEAD.md)). LEGACY,
  and any CHIBI Undead land subject without a usable raster, uses the
  placeholder (Undead ships are the Undead ghost ships in the default look
  since bead `pulp_wars-w5j.3`, and the shared Human ship art in the
  Classic look and LEGACY):
  the Human sprite of the role plus a bone skull badge on a near-black disc
  (legacy: right of the sprite above the HP bar; CHIBI: the cell's top-left
  corner), distinct from owner colour. In the default CHIBI look that
  stand-in is the Human direction sprite (crimson and gold). DOM unit art,
  training buttons,
  recruit help and reward art follow the same rule. An explored Grave is a
  small code-drawn tombstone marker in its tile's bottom-right corner, drawn
  above units (see the
  [playtest round 3 overlay](#current-ruleset-7-playtest-round-3-interface-overlay));
  the registered CHIBI Grave raster is no longer drawn on the board. The tile
  dock shows a Grave chip and a unit standing on one shows "On a Grave".
- Selecting an own unit previews its offered revision-13 command on the
  board: a Banshee's radius-2 Wail area with per-target damage (red for a
  kill), a Necromancer's Graves that will rise ("Rise"), and a Ghoul's
  Devour heal. The dock buttons Wail, Raise Dead and Devour carry a summary
  chip and a full `aria-label` with the same preview. Rally reads "Frenzy"
  and Inspired "Frenzied" for Undead support.
- In a match with an Undead seat, an attack target whose attacker splashes
  (Lich, Battleship) shows its splash ring and per-unit splash damage when
  the keyboard cursor or mouse is on it (always when it is the only splash
  target). Lifesteal heals and Infect risings appear as a second preview
  line ("Heal +N", "Rises as Zombie") and in the cursor description.
- Restless: an own Undead land unit outside its territory shows a
  "Restless" cue, the `?` detail explains it, and a damaged unit that would
  otherwise recover shows an `aria-disabled` Recover action explaining why.
- `DEAD_RAISED`, `GRAVE_DEVOURED`, `WAIL_RESOLVED`, `UNIT_INFECTED` and
  `GRAVE_CREATED` animate on the effects canvas and are announced in the
  live region; all but Grave creation also show a toast.

## Current Ruleset 7 revision 14 Plague and Bitten overlay

This overlay implements the UI of the
[revision-14 balance overlay](../product/RULESET_7_REVISION_14_BALANCE.md)
(`pulp_wars-vkq.19`). Every cue reads only the public `plagued` and `bitten`
view lists, public previews, and projected events, so all viewers see the same
statuses and a hidden Lich is never named. A Human-only match changes only by
the two economy texts below.

- **Map markers.** A plagued unit shows a green-grey miasma cloud on a dark
  disc and a bitten unit a bite of two jaws on a dark red disc; a unit with
  both shows both, stacked. They are code-drawn and share one frame per art
  set: LEGACY left of the sprite between the Field Defense symbol and the seat
  badge, CHIBI in the cell's left strip (just right of the classic look's HP
  bar; the default look draws no bar there), clear of the Undead badge,
  Field Defense corner, the base plate, Inspired status and capital crown. The
  markers are named by the subjects `STATUS:PLAGUED` and `STATUS:BITTEN`; a
  later art bead may supply rasters through the renderer's `afflictionArt`
  hook. The map cursor description adds "plagued" and "bitten".
- **Dock and `?` details.** The unit dock shows a "Plague" or "Bitten" chip
  (icon plus word) whose accessible name and title hold one sentence: Plague
  costs 2 HP at the start of each of the unit's turns and spreads to adjacent
  living units until its Lich dies or a Captain tends it (the source reads
  "your Lich", "Player N's Lich" or "a hidden Lich"); Bitten says the unit
  rises as the biter's Zombie on death unless a Captain tends it. The `?`
  details repeat each sentence. Undead Lich, Zombie and Vampire details list
  Plague, Bite and Unanswered; in an Undead match a Captain's Tend reads
  "Heals nearby wounded troops by 2 and cures their Plague and bites." Help
  adds the Plague, bite and Vampire tips for every non-Undead viewer (Human
  or Goblin) in a match with an Undead seat; Undead viewers get the Undead
  tips instead.
- **Disband.** An own plagued or bitten unit that would otherwise be offered
  Disband shows an `aria-disabled` Disband action whose name explains
  "Plagued units can't Disband." or "Bitten units can't Disband." (Plague
  first when both apply).
- **Previews.** In Undead matches Tend Wounded carries a chip (`+2 HP · 2
cures`) and a full `aria-label` of its exact heals and cures, and selecting
  the Captain labels each target on the board (`+2 HP`, `Cure`, `+2 · Cure`).
  An attack preview's second line adds "No retaliation" (Vampire), "Plagues
  target" or "Plagues N targets" (Lich), "Bites", "You get bitten",
  "Rises as Zombie (bitten)" and "You rise as enemy Zombie (bitten)"; the
  semantic label names the plagued units. The Lich splash ring marks each newly
  plagued splash target (`−4 · Plague`). A Wail target that dies bitten reads
  `−N · Rises` and the Wail description says "(dies, rises as a Zombie)".
- **Events.** `PLAGUE_DAMAGED` and `PLAGUE_SPREAD` pulse a miasma ring on the
  visible units (damage also shakes each unit), `PLAGUE_CLEARED` pulses a cure
  ring, and `BITTEN_UNIT_RISEN` a red rising pulse. The live region announces
  "Plague hit N of your units", "Plague spread to N units", "N units fell to
  Plague" (`UNIT_DIED` cause `PLAGUE`), "Plague lifted from N units", "A bitten
  Fighter rose as Player N's Zombie" and "Tend cured Plague on N and a bite";
  Plague damage and spread toast only when they reach the viewer's units.
- **Economy text (E2, every match; revision 16 numbers).** The Coins tooltip
  ends "Commerce earns trade. City income: Level (max 4) + capital + trade +
  Markets." and Commerce no longer lists "Market income is doubled". The
  Market formula reads "Market: 1–3 Coins (1 + adjacent families, max 3)".
  The per-city income shown in the city panel and the Coins projection use the
  capped level term, so they equal the Start Turn income.
- **Revision 15 duration** ([overlay](../product/RULESET_7_REVISION_15_BALANCE.md#7-ui-text)).
  The Plague chip reads "Plague · N turns" (N = the public remaining turns,
  3 to 1) and its sentence says "−2 HP at the start of each of its next N
  turns, then it ends", adding "at the first it spreads to adjacent living
  units" only while N is 3, and ends "It ends sooner if that Lich dies or a
  Captain tends it." The Lich ability text and both help tips say Plague
  lasts 3 turns and spreads on the first. `PLAGUE_EXPIRED` plays the cure
  ring and is announced "Plague wore off N of your units" (or "Player N's
  units"); it toasts for the viewer's own units.

## Current Ruleset 7 revision 17 Goblin overlay

This overlay implements
[Goblin spec section 11](../product/RULESET_7_REVISION_17_GOBLINS.md#11-ui-requirements)
(`pulp_wars-0ao.5`). Every cue reads only public views, public previews
(`previewKaboomV7`, `previewAttackExplosionsV7`, `queryCombatPreviewV7`,
`publicUnitStats.goblin`) and projected events. A match without a Goblin seat
looks as in revision 16 apart from the extra faction option.

- **Setup.** Every seat's faction select offers Human, Undead and Goblin
  (and Dinosaur since revision 19 and Martian since `pulp_wars-t6s.4`;
  default Human); the launched setup, saves and resume keep Goblin seats.
- **Labels.** Units are named by their owner's registration (Goblin, Wolf
  Rider, Bomb Chucker, Orc Brute, Orc Warboss, Rocket Cart, Scrap Buggy,
  Troll). The dock shows a "Goblin" faction chip; CHIBI paints the reviewed
  PixelLab Goblin sprites: in the default look the fixed-colour art of bead
  `pulp_wars-3tq.9` (sprites, portraits and cities alike), and with the
  Classic look developer option the player-coloured sprites of
  `pulp_wars-0ao.8` (which replaced the `pulp_wars-0ao.4` placeholders).
  LEGACY (or a CHIBI Goblin subject
  without a raster) draws the Human art with an olive goblin-head badge on
  charcoal. Training, recruit help, rewards and CHIBI technology cards use
  the Goblin PixelLab portraits (`PORTRAIT:GOBLIN:<ROLE>`) wherever a Human
  card shows a portrait, and the Goblin map sprite where it shows a sprite;
  boats keep the Human ship portraits. Goblin cities use the shared
  settlement art (no Goblin city tint). Rally reads "WAAAGH!" (its button
  shows the PixelLab `ICON:ACTION:GOBLIN:RALLY` grey tin megaphone in CHIBI,
  `pulp_wars-0ao.14`, and the Rally art in LEGACY), Inspired Goblins show
  "WAAAGH!", Overrun reads "Ram", and Commerce is "Plunder" in the technology
  tree, its detail and research actions. Goblin Commerce lists no trade, and
  Chivalry reads "Ram: Scrap Buggies advance after a kill and may attack
  again". Rewards read "Two free Goblins" and "Troll". In a match with a
  Goblin seat the leaderboard and turn status name each player's faction.
- **Unit information.** The `?` details list "Kaboom N", "Explodes on death
  (N)", "Bombs", "Regenerates 4 HP each turn", "Gang Up: +1 Attack per ally
  next to the target (max +2)" and, for the Goblin, "No Field Defense". Where
  a Human Fighter would be offered Field Defense, a Goblin shows an
  `aria-disabled` Fortify action explaining "Goblins cannot build Field
  Defense; use an Orc Brute". The city dock's unit capacity adds a "+1
  Warrens" chip.
- **Kaboom!** Goblin-crewed land units get a Kaboom! button whose icon is a
  bomb: in CHIBI the PixelLab `ICON:ACTION:KABOOM` raster (a round black
  bomb with a lit cream fuse and a pale spark, `pulp_wars-0ao.14`); in
  LEGACY, or in CHIBI without the raster, the code-drawn glyph of
  `ui-icons-v7.ts`, a solid black ball with a hairline edge, a fuse rising
  from the top and a pale spark (`pulp_wars-0ao.17`). Its tooltip is the
  section 11.2 sentence, and its chips give the hit and kill count plus a
  yellow "N yours hit" warning chip. The button appears only while the
  public command query offers Kaboom (not after a primary action, and not
  in the turn the unit landed). Hovering or
  focusing it previews the blast on the board: every blast area of the chain
  in pale cream with a dashed edge, one label per hit cell (`−N`, red when
  lethal; `Yours −N`/`Ally −N` with a yellow-and-charcoal hazard outline for
  friendly fire; `Zombie −N` for a rising; `Wave N` on a unit the chain sets
  off; `Kaboom!` on the exploding unit). Activating the button arms it
  instead of dispatching (this is the explicitly requested confirmation):
  the board keeps the preview and hides the unit's Move and Attack targets,
  and the dock shows the summary ("Hits N units: H enemy, F yours. Kills
  K."), the friendly-fire and Bitten warnings, chain lines, Plunder, Field
  Defense lost, the fog note, and Confirm Kaboom! / Cancel. Escape, Cancel or
  a new selection disarm it. While the preview shows (focus, hover or armed)
  and any blast area of the chain lies outside the board region left by the
  HUD and the dock, the camera pans the least distance to frame it, without
  changing the zoom (an ease in full motion, a jump in reduced motion); it
  reframes only when the preview or that region changes, so a player's own
  pan stays.
- **Attacks.** In a match with a Goblin seat an attack preview's second line
  adds "Gang Up +N", and one warning box per line adds the death-blast lines
  ("Enemy Bomb Chucker explodes on death: 2 damage around it", with the
  tuned death-blast damage, and chain reactions),
  "Bomb splash hits your Goblin", "Friendly fire: …" (own blasts) or "Blasts
  hit N of your units, K killed" (enemy blasts), Plunder and the fog note. The
  focused (or only) such target shows the chain's blast areas and hit labels
  (the attacker reads `Attacker −N`), and a Bomb Chucker's splash ring marks
  own units `Yours −N` in the hazard style. These labels are placed before
  the attack's label stack so they stay on their own cells.
- **Crowded labels.** Board preview labels never overlap, at every zoom and
  width (`pulp_wars-0ao.12`). Each label is placed in a fixed order and
  nudged off earlier ones; one that still collides falls back to a shorter
  form: a hit label drops its trailing part, then its prefix (`Yours −3 ·
Wave 2` → `Yours −3` → `−3`), keeping its lethal red or hazard styling;
  an attack stack replaces its warning boxes with one summary box ("Chain:
  2 blasts · 3 yours hit", "Bomb hits your Goblin"), then drops the
  summary, the note, and finally the label's second part. A label with no
  free spot is left out rather than covering another; the full sentences
  stay in the board's screen-reader description.
- **Feedback.** Each projected `EXPLOSION_RESOLVED` wave plays a code-native
  cartoon bang on the effects canvas (a white-and-cream spiky star, soot
  puffs and iron scraps over the 3 × 3 area, a puff over every hit unit), one
  wave after another; a Bomb Chucker lobs a round black bomb that bursts
  smaller on its target. Reduced motion holds each wave at its midpoint. The
  camera follows only other players' blasts. The live region and a toast
  announce "Your Goblin blew up: N hit, K killed", "Player 2's Rocket Cart
  exploded: …", "Plunder: +N Coins" (owner only), "Your Troll regenerated 4
  HP" and "Your Orc Warboss: WAAAGH! +1 Attack for N units". Each visible
  regenerated Troll shows the Tend heal ring with a bold green "+N" rising
  from its head (`UNITS_REGENERATED`, 640 ms); reduced motion holds the
  ring and a still "+N" at the midpoint. Help adds a
  "Goblins" list with the ten section 11.3 sentences in every Goblin match,
  and Goblin viewers get no Raider Escape tip.
- **No cure (`pulp_wars-0ao.16`).** Only a Human Captain's Tend Wounded cures
  Plague and bites (Windmills and Troll regeneration cure nothing), so cure
  text names a Captain only where one can help. A Goblin viewer's Plague and
  bite help tips end "Goblins can't cure it; only killing the Lich ends it
  sooner." and "Goblins can't cure bites."; a Goblin unit's Plague and Bitten
  sentences end "It ends sooner only if that Lich dies; Goblins can't cure
  it." and "; Goblins can't cure bites.". An Undead viewer's tips say "a Human
  Captain" when a Goblin seat is also present, and drop the Captain clause when
  no seat is Human. Human viewers and Human/Undead matches read as before.
  The Lich's Plague ability text (`pulp_wars-0ao.18`) is match-aware the same
  way: "... It ends sooner if this Lich dies or a Captain tends them." in a
  match with a Human seat ("a Human Captain" when a Goblin seat is also
  present), and "... It ends sooner if this Lich dies." when no seat can Tend.
- **Review.** `npm run review:ruleset7-goblin-ui` captures these surfaces in
  both art sets at desktop and phone widths (dev server only).

## Current Ruleset 7 revision 19 Dinosaur overlay

This overlay implements
[Dinosaur spec section 12](../product/RULESET_7_REVISION_19_DINOSAURS.md#12-ui-requirements)
(`pulp_wars-c87.4`) as amended by
[revision 20 section 7.2](../product/RULESET_7_REVISION_20.md#72-ui-text-and-surfaces)
(`pulp_wars-0hi.2`: the Stampede button, lanes, legend, and confirmation are
removed; the Triceratops charges with the ordinary attack flow), with the
art of the [Dinosaur art fragment](../art/factions/DINOSAUR.md); the
Dinosaur rules are part of
[Ruleset 7: current rules](../product/RULESET_7_CURRENT.md#19-dinosaur-faction-rules).
Every cue
reads only public views, public previews (`previewLayEggV7`,
`previewHatchV7`, `queryCombatPreviewV7`, `view.eggs`,
`publicUnitStats.dinosaur`) and projected events. A match without a Dinosaur
seat looks as in revision 18 apart from the extra faction option.

- **Setup.** Every seat's faction select offers Human, Undead, Goblin and
  Dinosaur (and Martian since `pulp_wars-t6s.4`; default Human); the
  launched setup, saves, resume and the Showcase keep Dinosaur seats.
- **Labels.** Units are named by their owner's registration (Caveman, Raptor,
  Spitter, Ankylosaurus, Shaman, Triceratops, T-Rex, Brontosaurus) on the
  board, in docks, previews, the log and the board's screen-reader text; an
  Egg is "{Unit} Egg". The dock shows a "Dinosaur" faction chip. CHIBI paints
  the PixelLab Dinosaur sprites and portraits; LEGACY (or a CHIBI subject
  without a raster) draws the Human art with the dusty-blue footprint badge.
  Rally reads "War Drums" (the `ICON:ACTION:DINOSAUR:RALLY` drum in CHIBI),
  Inspired units show "War Drums", Overrun reads "Rampage" and Charge
  "Pounce". Fortification is "Nesting" in the technology tree, its detail and
  research actions ("Eggs have +4 HP and hatch one turn sooner; +1 unit slot
  in every city"), and Explosives is "Wallbreaker" (it keeps the Explosives
  unlock lines and adds "Dinosaurs ignore City Walls"); unit unlocks of
  egg-laid roles read "Raptor Egg", "Triceratops Egg (Charge!)" and so on, and Metallurgy reads "Forge discount: 1 Coin off
  trained land units and Eggs". Rewards read "A free Caveman" and
  "Brontosaurus: A giant unit (2 slots)". In a match with a Dinosaur seat the
  leaderboard and turn status name each player's faction.
- **City panel.** A Dinosaur viewer's city shows capacity in slots: the stat
  is labelled "Slots" and reads "5/7 slots" (accessible name "5 of 7 slots",
  yellow when over capacity). Used slots are the slot sum of the units and
  Eggs homed there; for the other factions the stat is unchanged. Caveman and
  Shaman keep their train cards, which add a "1 slot" chip (as do the boats
  at a Port). After the train cards stands one **Lay Egg card** per
  researched egg-laid role: the role's portrait with a small egg cue (never
  the Lay Egg icon), "{Unit} Egg", the cost, the hatch time ("2 turns") and
  the slots ("2 slots" is highlighted for the two-slot Triceratops and
  T-Rex), with the usual `?` recruit help. The accessible name is the
  section 12.2 row: "Lay T-Rex Egg: 14 Coins, 2 slots, hatches in 4 turns".
  A card that cannot be used is `aria-disabled`, keeps its place, and shows
  why on the card itself (touch has no hover): "No free tile next to the
  city", "Needs 2 free slots", "Needs 5 Coins", "City action spent", "The
  city is besieged". Roles whose technology is missing have no card; with no
  egg technology at all one line reads "Research Scouting to lay Raptor Eggs
  here." The up to 40 offered `LAY_EGG` commands of a city are never buttons,
  and a selected tile never lists them.
- **Nest-tile picking.** Choosing a Lay Egg card enters picking for that
  role: the dock replaces the cards with the prompt "Choose a tile next to
  the city for the Egg", the row text with the number of highlighted tiles,
  and Cancel; the board highlights exactly the legal nest tiles (cream fill
  and dashed outline) as its only targets, pans the least distance to show
  them above the dock (as for a Kaboom! preview), and takes keyboard focus.
  A click, tap, or Enter on a highlighted tile lays the Egg: one command, no
  second confirmation. **With exactly one legal tile the click is still
  required**, so the player always sees where the Egg goes. Escape, Cancel,
  or selecting anything else leaves the picking with the city still
  selected.
- **Eggs on the board.** Every visible Egg of any owner shows its owner:
  the default CHIBI look draws the `UNIT:DINOSAUR:EGG` sprite of the new
  direction (cream with orange speckles, the same for every player; bead
  `pulp_wars-3tq.13`; no plate since `pulp_wars-w5j.3`); the Classic look
  draws the classic sprite with its band and nest cloth in the owner's
  colour, and LEGACY (and CHIBI without a raster) a code-drawn speckled egg
  with a painted band in a bone nest. A charcoal chip with an owner-colour ring beside it shows the
  countdown number (never smaller than a 10 px number). An Egg shows its HP
  bar only when damaged, wears its owner's seat badge (LEGACY and the Classic
  look; the default CHIBI look has no badge and no plate) and
  never a faction badge. Selecting one opens its dock: "{Unit} Egg", the faction chip,
  "Hatches in N turns", "N slots", HP and Defense only, the sentence "Hatches
  into a {Unit} in N turns. Cannot move or fight.", and for an own Egg
  (with Administration) **Abandon Egg** with its refund ("Remove this Egg
  for 5 Coins"). Enemy Eggs are ordinary attack targets with ordinary attack
  previews.
- **Hatch.** A selected Shaman gets one "Hatch" button per adjacent own Egg
  laid on an earlier turn (chip "{Unit} · now"; the tooltip is the section
  12.2 sentence), and the same Egg is a board target labelled "Hatch {Unit}"
  with the note "Cannot act this turn". An adjacent Egg laid this turn is
  marked "Next turn" on the board, and the dock adds an `aria-disabled` Hatch
  explaining "This Egg was laid this turn; it can be hatched from your next
  turn".
- **Charge!** (revision 20). The Triceratops has no command of its own: it
  is selected, moved, and attacks like any melee unit, and no Stampede
  button, lane, legend, or confirmation exists. After a Move of n tiles
  this turn (while it can still attack) its dock shows the status chip
  "Charge! +n Attack" and its Attack stat lists the "Charge!" modifier. The
  attack preview on the board, for own and enemy attacks alike, adds the
  note lines that apply, in this order: "Charge +n", "Ignores
  fortification" (when Walls or Field Defense levels were removed), "Pushes
  back; Triceratops follows" ("Pushes back" when it cannot follow, "{Unit}
  cannot be pushed" for a blocked Push, "{Unit} may be pushed back" when
  the tile behind the target is hidden or depends on the target owner's
  Engineering), and "Destroys Field Defense"; a kill has no Push line. The
  cursor's screen-reader text carries the same sentences. The retaliation
  line, the death-blast warning boxes, the Bitten warning, and "Armoured
  −1" are the ordinary attack preview's. An attack by a dinosaur whose
  owner has Wallbreaker on a unit behind City Walls adds "Wallbreaker:
  ignores City Walls". The `?` details show "Charge!" with the former
  Stampede icon (`ICON:ACTION:STAMPEDE`; no new art) and the sentence "+1
  Attack per tile moved this turn (up to +2). Ignores Walls and Field
  Defense, destroys Field Defense, and pushes back." The Triceratops's
  recruit help no longer says "Can't attack after moving." The Promote
  button's tooltip and accessible name read "Promote: +5 maximum HP and a
  full heal" for every faction.
- **Growth.** A Big unit wears one upward rank chevron and an Alpha two,
  cream with a black outline, right of its HP bar in both art sets (in the
  default CHIBI look, which draws no side bar, left of the feet;
  the shape carries the meaning, so it holds in high contrast and for every owner
  colour). In CHIBI the sprite is also drawn x1.125 (Big) or x1.25 (Alpha)
  about its feet, capped at a drawn width of 96 CSS px, so the Brontosaurus
  stops at x1.09; overlays do not move. The dock shows "Grows · 1 kill to
  Big", "Big · 2 kills to Alpha" or "Alpha", and "2 slots" for a two-slot
  body; the `?` details add "Big: +4 HP. Alpha: +8 HP, +1 Attack. Growing
  fully heals. Next stage in N kills." and the stat rows list the engine's "+4"/"+8" Growth and "+1"
  Alpha modifiers. `UNIT_GREW` pulses the sprite to x1.2 and back over
  300 ms and logs "Your T-Rex grew: Big".
- **Acid and Armoured.** An attack preview's note adds "Acid: ignores cover
  and fortification" for a Spitter and "Armoured −1" for a hit on an
  Ankylosaurus ("Your armour −1" when the viewer's Ankylosaurus takes the
  retaliation). The `?` details name Acid, Armoured, Charge!, Hatch, Grows,
  Rampage, Pounce and War Drums, "Big body" for two slots, and "Wild" for the
  Caveman and Ankylosaurus. Where a Human Fighter or Guard would be offered
  Field Defense, they show an `aria-disabled` Fortify explaining "Dinosaurs
  cannot build Field Defense".
- **Feedback.** Cues are code-native and unowned (white, cream, light grey,
  basalt grey, charcoal). A Charge with a run-up lunges like any melee attack and
  flashes a spiky star with two puffs on the target (`CHARGE_HIT`); a
  pushed survivor then slides one tile back and the Triceratops follows,
  and neither jumps ahead of its slide. A Spitter lobs a pale cream blob that lands in three
  puffs. A laid Egg pops in with one bounce. A hatching Egg wobbles twice
  and cracks, then its shell chips fly up while the unit grows in from
  x0.6; the Shaman's Hatch first spreads two rings from the Shaman to the
  Egg. A destroyed Egg scatters shell chips and one dust puff. War Drums use
  the Rally cue. Reduced motion holds each drawn cue at its midpoint and
  shows growth and a laid Egg at once. The live region and a toast announce
  "You laid a Raptor Egg", "Your Raptor hatched", "Player 2's Raptor Egg was
  destroyed", "2 Eggs were lost with your Capital" and "Your T-Rex grew:
  Big" (a Charge is announced like any attack). Help adds a "Dinosaurs"
  list with the twelve sentences of section 12.3 as amended by revision 20
  (Charge!, Nesting, Wallbreaker, and Grow) in every match with a Dinosaur
  seat, and "How to play" tells every viewer of every match "Promotion: a
  unit with 3 kills can be promoted once: +5 maximum HP and a full heal."; a Dinosaur viewer is told "Select your city to train
  units and lay Eggs." and gets no Raider Escape tip.
- **Review.** `npm run review:ruleset7-dinosaur-ui` captures these surfaces
  (the setup, a Showcase with a Dinosaur seat, and the Dinosaur UI fixtures)
  in both art sets at desktop and phone widths (dev server only).

## Current Ruleset 7 Martian overlay

This overlay implements
[Martian spec section 13](../product/RULESET_7_MARTIANS.md#13-ui-requirements)
(`pulp_wars-t6s.4`) with the production art of the
[Martian art fragment](../art/factions/MARTIAN.md) (bead `pulp_wars-t6s.6`):
the placeholder generator of spec 13.4 is not built. The Martian rules are
part of
[Ruleset 7: current rules](../product/RULESET_7_CURRENT.md#20-martian-faction-rules).
Every cue reads only
public views (`view.shields`, `view.cooling`, `view.thralls`,
`view.mindControlCooldowns`), the public unit stats' `martian` block, the
public previews (`previewBeamDownV7`, `previewMindControlV7`,
`previewTractorBeamV7`, `queryCombatPreviewV7`) and projected events. A match
without a Martian seat looks as before apart from the extra faction option.

- **Setup.** Every seat's faction select offers Human, Undead, Goblin,
  Dinosaur and Martian (default Human); saves, resume and the Showcase keep
  Martian seats.
- **Art and labels.** Units are named by their owner's registration (Grunt,
  Saucer, Ray Gunner, Shield Projector, Brain, Tripod, Mothership, Colossus;
  a Thrall is "Thrall" with its own sprite). The default look paints the
  chrome-and-magenta sprites, portraits, icons and the landed-saucer
  colonies (whose pennant flies from the mast tip). The Classic look and
  LEGACY have no Martian art: they draw the Human sprite of the role (the
  Fighter for a Thrall) with the **saucer badge** (chrome saucer on a
  gunmetal disc) in the corner of the other factions' badges, and the Human
  city; the dock and the train cards do the same. The dock shows a
  "Martian" faction chip. Rally reads "Psychic Command" (the antenna-dish
  icon), Charge "Strafe"; Fortification is "Force Fields" (the Force Field
  icon) and Explosives "Disintegrator" in the tree, its detail and research;
  unit unlocks read "Train Tripod (strides, heat ray, Pierce)", "Train Saucer
  (flies, Beam Down)" and so on, all from the registry. Rewards read "A free
  Grunt" and "Colossus: A giant unit (2 slots)". In a match with a Martian
  seat the leaderboard and turn status name each player's faction.
- **Board markers** (code-drawn, `MARTIAN_PALETTE_V7`; calm: one row and one
  chip at most):
  - **Shield bar**, for every visible unit with a Shield maximum: one
    segment per point of the maximum (4 while a Force Field raised it) in a
    dark track, magenta when filled, the Force Field's extra segments in the
    paler glow, empty ones dark with a magenta rim. It is always shown,
    because the Shield changes how the unit is best attacked. The default
    look draws it under the feet (directly above the HP bar while that
    shows), the Classic look as a column beside the vertical HP bar, LEGACY
    as a row under its HP bar (above it are the seat and faction badges).
  - **Cooling**: three grey heat lines on a gunmetal chip right of the
    sprite (no magenta: not at full power), on a Cooling ray unit of any
    owner.
  - **Thrall collar**: a chrome ring with one magenta light on the same chip
    slot (a Thrall has no ray). Selecting a Thrall draws a dashed magenta
    link to its Brain with a ring round it; selecting a Brain links each of
    its Thralls.
  - **Flying**: the Saucer and the Mothership are drawn lifted above a soft
    ground shadow of their own (`MARTIAN_FLYER_PRESENTATION_V7`), over
    land and water. LEGACY lifts the stand-in a little over the same shadow.
  - **Machines afloat**: a self-launched machine is drawn as itself on the
    water (never as the transport; no ring since bead `pulp_wars-w5j.3`); a
    wading Tripod or Colossus gets two white ripple arcs. Embarked foot
    units keep the transport: the Martian saucer-barge in the default look,
    an embarked Thrall included (its collar still says Thrall).
  - **Force Field**: selecting a land-form Shield Projector tints the eight
    tiles around it in the pale magenta glow with an outer dashed edge.
- **Dock and unit info.** Chips beside the name: "Shield 2 / 2" ("Shield 4 /
  4 (Force Field)" when raised), the ray's power ("Full power" or "Half
  power: moved"), "Cooling" (with the Cooling tooltip), "Thrall", a Brain's
  "Thralls 1 / 2" and "Recovering: ready in 2 turns", and "2 slots". The
  Shield stat row reads current / maximum. Unit info adds the Shield, ray,
  Thrall ("Controlled by a Brain. No Shield. Collapses if the Brain is lost.
  Thralls use no slot."), Brain and afloat lines. A machine afloat is
  "{Unit} (afloat)" and says it cannot attack or use abilities until it
  lands. A Grunt or Shield Projector where a Fighter or Guard would fortify
  shows a disabled Fortify: "Martians cannot build Field Defense".
- **Abilities.** Beam Down, Mind Control and Tractor Beam are one button
  each (the offered commands, one per passenger and tile or per target, are
  never buttons). A button without a legal choice is `aria-disabled` and
  names why: "A Saucer that moved this turn cannot Beam Down", "No unit on
  or next to one of your city centers", "No free tile next to this Saucer";
  "Recovering: ready in N turns", "Controls two Thralls already", "No
  weakened enemy within reach"; "No unit two tiles away can be pulled". A
  press aims the ability: the dock replaces the actions with a compact
  prompt (choices as chips, each carrying its whole preview in its
  accessible name, Back and Cancel), the board's only targets become the
  ability's (magenta dashed outlines) and the camera frames them above the
  dock. Escape steps back (a Beam Down tile to its passenger) and then
  leaves.
  - **Beam Down**: first the passengers (on or next to own city centers),
    then the legal tiles around the Saucer ("Beam here", "destroys Field
    Defense"); a tile performs it.
  - **Mind Control**: the legal targets ("Thrall · 5 HP", with "Thralls 2 /
    2 after · Mind Control recovers for 2 turns" and any collapse or Plague
    it ends); a hostile unit in reach that cannot be taken is marked grey
    with why: "Too healthy (10 HP)", "Immune", "Protected on a city or
    village center". A target performs it, like an attack.
  - **Tractor Beam**: the targets two tiles away; the focused one shows its
    destination (magenta tile and an arrow) and "Pulled out of Walls",
    "Pulled off Field Defense", "Empties Player 2's City", "Lifts the siege
    of your City".
- **Moves.** A machine's Move onto water is a dotted pale-blue "Launch"
  outline (no label box); the dock's legend reads "Launch: crosses water as
  a transport" and the cursor description says it ends the turn afloat.
- **Attack preview** (own attacks; the cursor description carries every
  line): "Shield absorbs N" and "Your Shield absorbs N" as notes; the
  shooter's lines "Full power" / "Half power: moved" / "Half power:
  Cooling" and "Leaves it Cooling next turn" are drawn on the focused (or
  only) target, so a row of targets stays calm; "Disintegrator: ignores
  fortification"; the Tripod's label reads "pierce N" and, while the target
  is focused, the unit behind is marked with its damage (magenta, or the
  friendly-fire hazard with "Yours"), and "Pierce hits your Grunt: 5 damage
  (Shield absorbs 2)" is a warning.
- **Cues** (effects canvas; reduced motion holds each midpoint): a heat ray
  is a magenta beam with a white core from the shooter to the target
  (wider at full power), with the heat-ray flash, and a thinner beam on to
  the Pierce victim; a Shield that absorbs flares as a crescent turned to
  the blow; Beam Down is a column of light coming down on the arrival tile;
  the Tractor Beam is a cone with hoops, then the target slides one tile;
  Mind Control spins the spiral over the victim and rings the Brain; a
  collapsing Thrall's helmet ring shrinks. The beams are code-drawn (as
  MARTIAN.md recommends); the flash, crescent and spiral are the effect
  sprites, and without them (Classic look, LEGACY) code shapes stand in.
- **Log.** "Your Shields recharged", "Your Saucer beamed down a Grunt"
  (toast), "Player 2's Brain took control of a Fighter" (toast), "2 Thralls
  collapsed" (toast), "Your Mothership pulled Player 2's Raider".
- **City panel.** A Martian viewer's city counts slots like a Dinosaur's
  ("5/7 slots"; the tooltip names the two-slot Mothership and Colossus and
  that Thralls use no slot), and every train card names its slots.
- **Help.** A "Martians" section lists the fourteen section-13.3 sentences
  for every viewer of a match with a Martian seat (numbers and names from
  the registry); a Martian viewer is not told of the Raider's Escape.

## Current Ruleset 7 Ice Folk overlay

This overlay implements
[Ice Folk spec section 13](../product/RULESET_7_ICE_FOLK.md#13-ui-requirements)
(`pulp_wars-7g3.6`) with the production art of the
[Ice Folk art fragment](../art/factions/ICE_FOLK.md) (bead `pulp_wars-7g3.5`)
and its code-drawn pieces. The Ice Folk rules are part of
[Ruleset 7: current rules](../product/RULESET_7_CURRENT.md#21-ice-folk-faction-rules).
Every cue reads only public views (the tile
flags `snow` and `blizzard`, `view.chilled`), the public unit stats' `chill`
and `iceFolk` blocks, the public previews (`previewBolasV7`,
`previewColdSnapV7`, `queryCombatPreviewV7`) and projected events; nothing
recomputes a rule. A match without an Ice Folk seat looks as before apart
from the extra faction option.

- **Setup.** Every seat's faction select offers Human, Undead, Goblin,
  Dinosaur, Martian and Ice Folk (default Human); saves, resume and the
  Showcase keep Ice Folk seats.
- **Art and labels.** Units are named by their owner's registration (Yeti,
  Sled, Snow Hunter, Mammoth, Ice Witch, Boulder Yeti, Sabretooth, Frost
  Giant). The default look paints the frost-and-fur sprites, portraits,
  icons and the igloo camps (whose pennant flies from the bone pole). The
  Classic look and LEGACY draw the Human sprite of the role with a
  **snow-capped peak badge** (ice-blue peak, white cap, navy disc) in the
  corner of the other factions' badges, and the Human city; boats wear the
  badge too. The dock shows an "Ice Folk" faction chip. Fortification is
  "Deep Winter" and Explosives "Brittle" (their own icons) in the tree, its
  detail and research; unit unlocks read "Train Ice Witch (Blizzard, Cold
  Snap)", "Train Mammoth (Sweep, Trample)", "Train Boulder Yeti (ignores
  Walls and Field Defense)", all from the registry. Rewards read "A free
  Yeti" and "Frost Giant: A giant unit".
- **Snow** (`ICE_FOLK_SNOW_OVERLAY_V7`): every explored land tile whose
  flag `snow` is true gets the cached 80 x 80 overlay tile of its edges and
  variant: a soft white wash with drifts and sparkle, cut raggedly with a
  blue-grey bank where the neighbour is not Snow (a territory edge, water,
  an unexplored cell; never at the board's edge). It lies over the ground
  and under Roads, improvements, resources, cities and units; a Forest or
  Mountain body is drawn over it (as over a Road) with white snow caps on
  its top edges. It follows the flag: captures, Land Grants, Deep Winter and
  a Witch's steps change it at once. The cursor description and a tile's
  dock name what Snow does for the viewer: "Snow: your units move at half
  cost and have cover here unless fortified" for an Ice Folk viewer, "Snow:
  your units stop on entering, as in a Forest. Ice Folk units have cover"
  for the others.
- **Blizzard** (`ICE_FOLK_BLIZZARD_V7`): every explored tile whose flag
  `blizzard` is true, water included, gets a faint white veil and nine calm
  falling flakes, over the Snow and under the units. The flakes
  move with full motion (a slow redraw, about fifteen frames a second, while
  a Blizzard is in view) and stand still for reduced motion. The selected or
  hovered Witch draws the white dashed outline of her nine tiles. A
  Blizzard tile is named "Blizzard: Snow, and Ice Folk units here take half
  damage from ranged attacks".
- **Chill markers**, on units of any owner (`ICE_FOLK_CHILL_MARKER_V7`):
  - **Frozen** (sluggish): the unit cased in ice to the waist, built from
    its own sprite; the dock chip "Frozen" ("Frozen: move or act, not
    both").
  - **Frosted**: a thin pale rime on the sprite's top edges and the frost
    glyph (`ICON:STATUS:CHILLED`, or a code-drawn snowflake) in the status
    slot after any Plague or Bitten marker; the chip "Frosted" ("Frosted:
    an Ice Folk blow that leaves it at 4 HP or less shatters it", with the
    threshold of the hostile Ice Folk seat).
  - **Thawing**: nothing on the board; the chip "Thawing" ("Thawing: frost
    will not slow it again this turn").
  - **Shatter window**: the HP bar of a Frozen or Frosted unit marks its
    lowest {threshold} HP in ice glow with a white divider (faint above the
    current HP). In the default look a Chilled unit shows its base HP bar
    even at full HP.
- **Dock and unit info.** Chips: the Chill, "Blizzard" or "Snow" for an Ice
  Folk unit standing in one, "Rockfall" for a Yeti on a Mountain, and the
  Boulder Yeti's throw now ("Planted: Attack 3" or "Moved: Attack 2"). Unit
  info adds the Chill, "Shatters at 4 HP or less" for an Ice Folk unit, its
  Snow or Blizzard, Rockfall and the throw. Ability lines name Mountain-born,
  Rockfall, Bolas, Cold Blood, Sweep, Trample, Blizzard, Cold Snap,
  Boulders, Prowl and Cold Aura. A Yeti or Mammoth where a Fighter or Guard
  would fortify shows a disabled Fortify: "Ice Folk cannot build Field
  Defense". A Frozen own unit that moved shows a disabled "Act" ("Frozen: it
  moved, so it cannot act this turn"); the engine offers it nothing else.
- **Abilities.** Bolas (Sled) and Cold Snap (Witch) are one button each (the
  offered commands are never buttons). Without a legal choice the button is
  `aria-disabled` and names why: "No enemy within 2 tiles" or "Frozen: it
  moved". A press aims it: the dock shows a compact prompt, the board's
  only targets become the ability's (pale-ice outlines, each labelled
  "Frozen" or "Frosted" by the preview) and the camera frames them; Escape
  or Cancel leaves.
  - **Bolas**: one chip per target ("Player 2's Fighter (7 HP)"), its
    accessible name carrying "Will be Frozen" or "Will be Frosted" and
    "Yeti can then shatter it" (`shatterSetups`); a chip or a board target
    throws it.
  - **Cold Snap**: the summary "Chills 2 units: 1 Frozen, 1 Frosted", each
    target named, the Witch's two-tile reach tinted with an outer dashed
    edge, and one "Cast Cold Snap"; a board target casts it too.
- **Attack preview** (own and enemy attacks; the cursor description carries
  every line): "Shatters" replaces the damage label when the preview
  shatters; notes "Chilled", "Rockfall: Attack 1.5 from the Mountain",
  "Planted: +1 Attack", "Cold Blood: +0.5 Attack", "Ignores fortification"
  (Boulders), "Snow cover", "Blizzard: half damage", "Tramples Field
  Defense" and "A hidden Blizzard may change this"; a Mammoth's label adds
  "sweep N" and, while the target is focused, each flank victim is marked
  with its damage ("Sweep: Marksman 2 damage" in the description).
- **Cues** (effects canvas; reduced motion holds a frame): a **Shatter**
  follows the timeline: the defender (kept on the board after the hit) is
  cased in ice to the top, three white cracks run over it while it shakes,
  then it is gone and the burst flashes at its centre and its shards fly
  out, fall and melt; no Grave, no blast. A **Bolas** spins from the Sled
  to its target; a **Cold Snap** ring grows from the Witch to five tiles
  across; frost forms on each chilled unit; a **Cold Aura** flashes the
  Giant's eight tiles; a **Sweep** draws a white arc over the Mammoth's
  three tiles; a **Rockfall** lobs a rock like a Catapult. Without the
  effect sprites (Classic look, LEGACY) code shapes stand in.
- **Log.** "Your Sled chilled a Fighter", "Your Ice Witch chilled 2 units",
  "Player 2's Frost Giant chilled 1 unit", "Your Yeti shattered a Fighter"
  (toast), "Your Mammoth trampled Field Defense".
- **City panel.** An Ice Folk viewer's city counts slots ("5/7 slots";
  every Ice Folk unit takes one) and every train card names its slot.
- **Help.** An "Ice Folk" section lists the fifteen section-13.3 sentences
  for every viewer of a match with an Ice Folk seat (numbers and names from
  the registry); an Ice Folk viewer is not told of the Raider's Escape.

## Current Ruleset 7 Dwarf overlay

This overlay implements
[Dwarf spec section 16](../product/RULESET_7_DWARVES.md#16-ui-requirements)
(`pulp_wars-78i.6`) with the production art of the
[Dwarf art fragment](../art/factions/DWARF.md) (bead `pulp_wars-78i.5`) and
its code-drawn pieces. Every cue reads only public views (`view.burrowed`,
`view.surfacedThisTurn`, `view.bombedThisTurn`), the public unit stats'
`dwarf` block and per-turn flags, the public previews (`previewTunnelV7`,
`previewBombRunV7`, `previewAssembleV7`, `queryAssembleUnavailableReasonV7`,
`previewTendWoundedV7`, `queryCombatPreviewV7`) and projected events;
nothing recomputes a rule. A match without a Dwarf seat looks as before
apart from the extra faction option.

- **Setup.** Every seat's faction select offers Human, Undead, Goblin,
  Dinosaur, Martian, Ice Folk and Dwarf, under the one-faction-per-player
  rule (an opponent's select disables the factions the other shown seats
  play; the human's choice moves an opponent who played it to a free
  faction). Saves, resume and the Showcase keep Dwarf seats.
- **Art and labels.** Units are named by their owner's registration
  (Hammerer, Gyrocopter, Clockwork Gunner, Steam Mole, Engineer, Steam
  Cannon, Steam Tank, Brass Titan). The default look paints the iron,
  copper and steam sprites, portraits, icons, the forge holds (whose pennant
  flies from their own iron pole) and the Dwarf fleet (riveted steam launch,
  ironclad, steam barge) through the generic naval wiring. No plate is
  drawn: the ginger beards, the white steam and the green machine lamps say
  "Dwarf", the pennant and the border say whose. The Classic look and LEGACY
  draw the Human sprite of the role with a **cog badge** (a copper cog on
  dark leather, iron rim) in the corner of the other factions' badges, the
  Human city, and a code-drawn mound. The dock shows a "Dwarf" faction chip.
  Fortification is "Dig In" and Explosives "Blasting Charges" (their own
  icons) in the tree, its detail and research; unit unlocks read "Train
  Steam Cannon (Knockback)", "Train Clockwork Gunner (two shots standing
  still)", "Train Steam Mole (Tunnel)", "Train Gyrocopter (Bomb Run)",
  "Train Steam Tank (Plated)", "Train Engineer (Repair)", and the effects
  "Engineers Repair adjacent units: +4 machines, +2 others", "Engineers
  Assemble Clockwork Gunners", "Dive: bombs deal 6", "Hammerers and Moles
  that stand still on or next to your city centers are dug in", "Eruptions
  deal 3; Steam Cannons ignore Walls and Field Defense", all from the
  registry and the constants. Rewards read "A free Hammerer" and "Brass
  Titan: A giant clockwork unit".
- **The mound** (spec 5.3): every mound of `view.burrowed` is drawn where
  its unit would stand, bottom-centred like a unit, with the unit's HP bar:
  `UNIT:DWARF:MOUND` for the Mole, `UNIT:DWARF:MOUND_RIDER` (a hammer head
  beside the drill) for its rider. A small earth chip with an upward arrow
  beside the heap says "surfaces next turn". A mound is never a unit of the
  board: it has no ready ring, no actions, no target, and is never in the
  orders cycle. Choosing its tile selects the tile, whose dock adds the
  mound: "Your Steam Mole (burrowed) · 12/16 HP", "Burrowed: surfaces at the
  start of your next turn. It cannot be attacked." (another owner's: "Player
  2's"), and for a Mole "Eruption: 3 damage to enemies on the ground here"
  (the rider's: it rides with the Mole and never erupts). The selected or
  hovered Mole mound draws the **eruption ring**: a dashed earth-light
  outline (on a dark casing) round its eight tiles. The cursor description
  says the same.
- **Dig In** (spec 8): a dug-in Hammerer or Mole (`dwarf.dugIn`) stands
  inside the code-drawn earthwork (`dwarfDigInMarkerV7`): a bank of piled
  earth behind it and a low wall of sandbags in front, on the ground (it
  never jumps with the selection). The dock chip "Dug in" (with the dug-in
  glyph) says "Dug in: +1 fortification (it has not moved; next to your
  city)"; an own digger next to an own center that moved says "Not dug in:
  it moved this turn" (or "arrived this turn"). The attack preview says
  "Dug in".
- **Clockwork** (spec 7): a construct's dock chip "Clockwork" (the cog
  glyph) says "Clockwork: full strength when attacking; only an Engineer can
  repair it"; on the board a copper cog sits at the HP bar's end whenever
  the bar shows. A wounded own construct that could Recover shows a disabled
  Recover: "Clockwork never recovers by itself". The Gunner's chip says "2
  shots if it stands still", then "1 shot left", then "Fired: cannot move".
  Plated units show "Plated 4"; a bombed unit "Bombed this turn"; a rider on
  its surfacing turn "Just surfaced" ("Just surfaced: cannot enter a city or
  village this turn").
- **The Gyrocopter** flies: it casts the flyer's ground shadow and is drawn
  lifted, like the Martian flyers; no neutral shadow is drawn under it.
- **Abilities.** Tunnel (Mole), Bomb Run (Gyrocopter) and Assemble
  (Engineer) are one button each (the offered commands are never buttons).
  Without a legal choice the button is `aria-disabled` and names why: "It
  surfaced this turn", "It moved this turn", "No free tile within 3"; "No
  enemy within 2 tiles", "Frozen: it cannot bomb this turn"; "Needs
  Marksmanship", "Your Capital is full", "Not enough Coins", "No free tile",
  "No home city". A press aims it: the dock shows a compact prompt, the
  board's only targets become the ability's and the camera frames them;
  Escape steps back a stage (Back), Cancel leaves.
  - **Tunnel**: every offered destination is outlined in light earth; only
    a destination that would erupt on someone is labelled ("Erupt −6"), and
    the focused one shows its forecast: the eruption ring, "−3" on each
    visible hostile unit on the ground and the Field Defense it would
    undermine. The dock lists the destinations, the erupting ones first
    ("4, 2 · −6"), each chip carrying "If they stay: Catapult −3; Undermines
    Field Defense", and "A forecast: enemies may move before the Mole
    surfaces". Choosing a destination with a fresh Hammerer next to the Mole
    opens the **rider prompt** "Take a Hammerer along?": the chosen tile
    keeps its forecast, the Hammerer's possible tiles next to it are
    outlined (no labels), the dock lists them ("Hammerer to 3, 1"), a chip
    per other Hammerer that could ride, and "Tunnel alone"; otherwise it
    tunnels at once.
  - **Bomb Run**: the targets within 2 are outlined in copper and labelled
    "Bomb −5" (or "Bomb −5 · Kills"); hostile units in range bombed this
    turn are marked "Bombed this turn". Choosing a target outlines its
    landing tiles beyond it, each labelled with the landing threat ("Land ·
    up to 8", "Land · safe"; "Lands next to: up to 8 damage next turn"), the
    target keeps its "Bomb −5" mark and a killed exploding target's blast
    is shown; the dock says "Bomb: 5 damage, no reply".
  - **Assemble**: the free tiles round the Engineer are outlined in steam
    white (no labels) and the dock says "Assemble a Clockwork Gunner: 4
    Coins, slot 2/3 in your Capital".
  - **Repair** is the Engineer's Tend Wounded button, labelled "Repair" with
    the chip "+4 machines, +2 others" and the tooltip "Heal adjacent units:
    +4 machines, +2 others. Cures Plague, bites, and frost"; a selected
    Engineer marks its targets "+4 HP" or "+2 HP" from the exact preview.
  - A Hammerer or Mole where a Fighter or Guard would fortify shows a
    disabled Fortify: "Dwarves dig in instead of building Field Defense".
- **Attack preview** (own and enemy attacks; the cursor description carries
  every line): notes "Dug in", "Plated: at most 4", "Ignores fortification"
  (a Blasting Steam Cannon), and "Knocks back to 3, 6" or "Knockback
  blocked"; while a Cannon target is focused, a short earth arrow points to
  the tile it is knocked to (outlined), or ends in a cross when blocked. The
  shooter's lines ("Clockwork: full strength", the Gunner's "Then 1 more
  shot" and "Cannot move after firing") are drawn on the focused target
  only, so a row of targets stays calm.
- **Cues** (effects canvas; reduced motion holds a frame, the eruption its
  peak): a **tunnel** throws up dirt and steam where the Mole and its rider
  dive and draws a dotted dirt trail to each mound; the **eruption**
  (`DWARF_ERUPTION_TIMELINE_V7`) shows the mound until the units are back
  (120 ms), then the burst at the Mole's tile, smaller bursts on its eight
  tiles clockwise from the north, a rising dust and steam puff, and each
  victim's damage; the timeline's 1 px shakes are left out (calm). A **bomb
  run** flies the Gyrocopter beyond its target, then the bomb falls 24 px
  and blasts (`EFFECT:BOMB_BLAST`) and the target shows its damage. An
  **Assemble** turns a copper key over the new Gunner and puffs steam; a
  **Repair** throws wrench sparks on each repaired unit (after the Tend
  ring); a **Knockback** slides the target one tile back (it waits where
  the slide starts) with a puff of steam. Without the effect sprites
  (Classic look, LEGACY) code shapes stand in.
- **Log.** "Your Steam Mole tunnelled (with a Hammerer)", "Your Steam Mole
  erupted: 2 units hit" (toast), "Your Gyrocopter bombed a Marksman for 5"
  (toast), "Your Engineer assembled a Clockwork Gunner", "Your Engineer
  repaired 2 units (+6 HP)", "Your Steam Cannon knocked back a Guard",
  "Field Defense undermined".
- **City panel.** A Dwarf viewer's city counts slots ("5/7 slots"; every
  Dwarf unit takes one, and an Engineer's Assemble uses one of its home
  city's) and every train card names its slot.
- **Help.** A "Dwarves" section lists the twelve section-16.3 sentences for
  every viewer of a match with a Dwarf seat (numbers and names from the
  registry and the constants); a Dwarf viewer is not told of the Raider's
  Escape.

## Current Ruleset 7 revision 21 achievements overlay

Rules: [revision 21](../product/RULESET_7_REVISION_21_ACHIEVEMENTS.md)
(bead `pulp_wars-9s0.4`), folded into
[current rules section 5](../product/RULESET_7_CURRENT.md#5-achievements-and-monuments).
The Achievements screen, the completion notice,
and the Monument action keep their revision-5 behaviour; this overlay lists
what changed.

- **Seven achievements.** The Achievements screen (menu) lists Explorer,
  Engineer, Muster, Conqueror, Land Baron, Sea Dog, and Slayer, in that
  order. Under the heading one line says "Each achievement earns a free
  Monument: +3 population, one per city."
- **Card.** State symbol, name, one-line goal, progress meter, status. The
  goals of the new four are "Capture an enemy city.", "Own 5 cities at
  once.", "Own 3 warships at once.", and "Get 5 kills with one unit." The
  status is "{current} / {required}" while the achievement is open, "Done!
  Build your monument." when complete, and "Monument built" when spent.
  Explorer, Engineer, and Muster read "Needs {technology}" until their
  technology is researched; the new four need no technology and show their
  count from the first turn. The meter is clamped at the requirement.
- **Dry Land.** A Dry Land match has no ships, so the Sea Dog card is
  omitted there (six cards).
- **Completion notice.** "{Name} achievement complete", with the display
  name ("Land Baron", "Sea Dog"), then "You can now build a monument on one
  of your tiles." Notices queue in event order and wait for a mandatory
  city reward.
- **Monument.** Each unlocked, unspent entitlement offers its own "Monument"
  action on an eligible tile (`command-build_monument-{id}`). A built
  Monument's source chip reads "{Name} monument".
- **Technology tree.** The trophy badge stays on Scouting, Engineering, and
  Drill only.
- **Help.** One tip explains achievements: "Achievements (see the menu)
  each earn a free Monument: +3 population, one per city. Conquer, expand,
  sail, and keep your killers alive."
- **No new art.** The cards use the existing drawn state symbols and the
  notice the existing trophy icon.

## Current Ruleset 7 unique factions overlay

This overlay (`pulp_wars-w5j.1`) applies to the setup of the current Ruleset
7 route in both art sets; the rule is in the
[unique-factions overlay](../product/RULESET_7_UNIQUE_FACTIONS.md). Where a
faction overlay below says the seats default to Human, or that every seat's
select offers every faction, this overlay wins.

- **Every player plays a different faction.** Under the **Factions** legend
  the hint reads "Every player plays a different faction. Take an
  opponent's and they switch to a free one." "Your faction" offers every
  faction; in each opponent's select
  ("Player N faction") the factions the other shown seats play are disabled,
  so the form can never hold two seats of one faction. The option labels are
  unchanged.
- **Distinct defaults.** Seats 0–3 default to Human, Undead, Goblin, and
  Dinosaur. Seats keep their choice in seat order, the human first: picking
  an opponent's faction for yourself, raising the opponent count, or a
  script setting a taken faction moves each later seat whose faction an
  earlier seat now plays to the first untaken faction in the frozen faction
  order. The AI seats are therefore always distinct, and every seat count
  from 2 to 4 always has a legal assignment.
- **Showcase.** The Showcase uses the same selects and the same rule.
- **Launch and resume.** A setup that still repeats a faction (never built
  by the form) is refused by the engine with `DUPLICATE_FACTION` and the
  setup error "Every player must play a different faction." A save carrying
  the headless and test only mirror option opens the save-recovery screen
  ("Saved match repeats a faction; every player must play a different
  faction.").

## Current Ruleset 7 playtest round 3 interface overlay

This overlay (`pulp_wars-6gd.4`) applies to the current Ruleset 7 route in
both art sets. Where an older section below disagrees, this overlay wins.

- **No text selection.** The whole interface (`.v7-app-shell`: setup, HUD,
  docks, tech tree, dialogs, toasts) is not selectable as text
  (`user-select: none`), and nothing in it starts a drag (images, icons,
  links). Text fields stay editable and selectable, and two deliberately
  copyable texts opt back in: the map seed in Settings and the save-recovery
  diagnostic.
- **Setup: New map or Use seed.** Setup has a two-state control in a group
  labelled "Map seed". **New map** is the default: the seed field is hidden,
  the hint reads "A new random map every game.", and each launch draws a
  fresh random seed (0–4294967295) in the DOM layer. **Use seed** reveals the
  Seed field (default 42) with the unchanged whole-number validation; a seed
  typed there survives switching back and forth. The choice lasts for the
  page session and is not saved. The engine only ever receives the resulting
  number, so matches stay deterministic and saves hold nothing new.
- **Setup: Showcase** (`pulp_wars-6gd.3`). The Map select ends with
  **Showcase**, described as "A fixed demo map: three developed cities, every
  unit, all technology, map revealed." Continents stays the default. While
  Showcase is selected the Size select holds only 16 × 16 and is disabled,
  and the whole "Map seed" group (New map / Use seed and the Seed field) is
  hidden; the launch uses seed 0 and never shows a seed error. Choosing any
  other map re-enables Size with the player's earlier size and shows the seed
  group in its earlier state, typed seed included. The form is updated in
  place (no control is replaced, focus stays). Opponents, Mode, Color, and
  the faction selects work as usual. A Showcase match opens on the human's
  turn with the camera on the capital in the middle of the player's strip;
  the resume and results screens label the map "Showcase".
- **Map seed.** Settings shows `Map seed: N` for the current match (selectable
  text), so a map can be replayed by choosing Use seed in a new game. Restart
  and Play again keep the current match's seed; a new game from the resume
  screen offers the same New map / Use seed choice.
- **Popups dim the screen.** The tech tree, Leaderboard, Achievements, Help,
  Settings, unit info (`?`), recruit help, the reward choice, the achievement
  notice, results and the error panel all sit over a dim scrim that covers
  the board, HUD and docks. The scrim takes every pointer event, so no click
  reaches the board. The selection dock is still not a popup and never dims
  the map.
- **Click outside to close.** A click on the scrim closes the tech tree, the
  menu screens (Leaderboard, Achievements, Help, Settings), unit info and
  recruit help, exactly like Escape and the close button, and returns focus
  to the control that opened them. The reward choice, achievement notice,
  results and error panel ignore scrim clicks. The reward choice ends with
  the hint "Choose a reward to continue." and still has no close button and
  ignores Escape.
- **Close button.** Dismissable popups share one close button: a 44 CSS px
  light disc with a dark ✕, pinned to the popup's top-right corner and sticky
  while a long popup scrolls. It is the popup's first focusable control and
  receives focus when the popup opens. Focus trapping, focus return,
  `aria-modal` and the inert background are unchanged; the scrim itself is
  `aria-hidden` and holds nothing focusable.
- **Graves.** An explored Grave is a small tombstone marker (pale headstone
  with a cross, dark outline) in the **bottom-right corner** of its tile, 18
  CSS px on an 80 CSS px tile and scaling with zoom, in both art sets. That
  corner is free of the seat badge and HP bar (left or below the sprite; in
  the default CHIBI look the marker may touch the right end of the ready
  ring and is drawn above it), the
  faction, Field Defense and affliction markers (left and top), and status
  chips and the capital crown (top). On a city tile the CHIBI marker sits
  just left of the population column. Markers are drawn after every unit and
  overlay, so a Grave under a unit stays visible. The tile dock's Grave chip,
  the unit's "On a Grave" chip, the map cursor description, and the Raise
  Dead and Devour previews are unchanged.
- **Water.** No boundary lines are drawn around water: neither the former
  pale-yellow dashed coast line between land and water nor the dashed line
  between Shallow and Deep Water. The terrain art alone tells them apart.
  Territory borders and landing markers are unchanged.

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

For the current Ruleset 7 match, the top HUD presents the viewer's coin stock
and the projected next-turn income as `+N/turn`, using the public per-city income
calculation after population deficit, siege, and active Blackout effects. Gold
coin and population icons accompany their signed values across current HUD,
actions, research, rewards, stats, and summaries. Accessible names keep the
currency and population units. The selected unit and city docks share one
bottom-bar layout: selected art and short label, a compact stat column (two
narrow columns of small pills beside the portrait), and an action area that
takes all remaining width. A dock with actions spans the viewport less its
margins, capped at 90rem on very wide screens; an information-only dock (an
enemy unit or city, or a tile with nothing to do) stays sized to its content.
Actions sit in one left-aligned row when they fit and wrap onto a further row
instead of scrolling sideways; a two-word label or Undead preview widens its
tile slightly rather than spilling. At 800 CSS px and narrower the portrait
and stats share the first row and the actions fill an equal-column grid below
them, using the close button's gutter. Unit abilities, tactical
explanations, and current status are available from the unit's question-mark
dialog with focus return. A city shows compact population, capacity, income,
and public state facts. The current Ruleset 7 layout is governed by the
[UI art contract](../art/classes/ui.md#current-ruleset-7-compact-dock-and-economy-icons);
the taller action-art and verbose dock descriptions below remain Ruleset 6
history where they conflict.

The HUD labels the sole currency **Coins** and displays `stock (+next income)`.
Its accessible name decomposes next income into city level, capital, Market,
negative-population penalty, and siege. Coin icons are not recolored Star art.

The selected-city dock shows:

- a compact identity header using the exact faction and current city-art level,
  with city/capital, level, and population context in smaller text;
- level and signed progress as `population / next threshold`, including
  `-N / threshold` plus “infrastructure lost; replace N population before
  growth”;
- permanent population, live economic-building population, live Market income,
  and total next-turn city income as separate labeled values;
- assigned units as `count / (level + 1)`, explicit over-capacity status, siege,
  3 x 3 or expanded 5 x 5 footprint, and earned rewards;
- exact faction-correct Train commands for Fighter, Scout, Marksman, Guard,
  Raider, Medic, Heavy, or Breacher. Juggernaut is never a Train control.

The map city label and selected-city dock render population as the current
incremental layer only: a level-N city always has exactly N+1 tiny squares.
Progress fills left to right. Negative progress fills the same fixed layer from
the leading edge with red deficit squares, capped visually at the layer width;
the semantic text always states the complete deficit even when it is larger
than N+1. This keeps the spatial rhythm stable without disguising severe
infrastructure loss. Ruleset 6 has no maximum city level, so there is no capped
or completed meter: every valid city presents its next N+1 population layer.

Every explored owned Windmill, Sawmill, Forge, Stoneworks, Workshop, Grand
Works, and Market renders one compact square pip per current public live value.
The first six use their live population contribution; Market uses its live
recurring Coin income. A zero-value improvement has zero pips. These
faction-neutral, dark-outlined mint pips sit directly on the map without a
status envelope and remain visually distinct from the larger yellow/red/empty
city population squares inside the labeled city badge. The render plan consumes
only the public live-value projection and never reconstructs spatial rules.

For current Ruleset 7, the selected-tile dock begins with a compact art-led identity using the most
specific public improvement, revealed resource, or terrain artwork and its
plain semantic name directly below the image. Road names an otherwise plain
tile when present. The dock omits biome headings and generic explored-territory
text; public improvement values, Road context, and exact offered actions remain
available. It never displays logical coordinates. It identifies
Grass/Forest/Mountain; visible Fruit, Game, Fertile Ground, Ore, or Stone; all
eleven economic improvements; Road; Chocolate Wall; and territory. An explored
resource hidden by technology is represented only by its public terrain in the
identity header. It must not use an outline, icon, text, count, or disabled
action that identifies the resource.

Revision 6 adds Shallow Water, Deep Water, Fish, Pearls, Port, Patrol Boat,
Battleship, and embarked transport identities to this same compact dock. A Port
shows active or blockaded status, its live population, and current trade Coin
effect with the standard population/Coin icons. Selecting an active Port offers
naval recruitment at that exact Port. Selecting a land unit offers Embark only
through a public owned active Port; selecting its transport offers legal
landing cells as map targets and names the passenger role and capture ability.
Public sea routes, vessel recovery, selection, and blockade overlays remain
fog-safe and do not expose an unexplored endpoint.

Exact offered controls use these labels: Harvest Fruit, Hunt Game, Build Farm,
Build Lumber Camp, Build Mine, Build Quarry, Build Windmill, Build Sawmill,
Build Forge, Build Stoneworks, Build Workshop, Build Grand Works, Build Market,
Clear Forest, Replant Forest, Build Road, and Redevelop. Only the selected
coordinate's public command appears. A Road control and road fact may coexist
with a resource/improvement fact.

Every contextual action raster—including Capture Village, unit abilities,
economic development, and faction-correct Train art—occupies the same exact
112 x 130 CSS-pixel transparent viewport. This matches the untrimmed 256 x 296
standard world-unit canvas at 0.25 map scale and 1.75 maximum camera zoom.
Artwork preserves its aspect ratio and transparent padding with
`object-fit: contain`; code-native fallbacks keep the same visibly framed footprint. Action
buttons remain 176 CSS pixels wide, grow vertically, keep their text readable,
and wrap without horizontal overflow.

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
Every technology symbol uses the same exact 112 x 130 CSS-pixel transparent
viewport as contextual action artwork, preserving the accepted raster's aspect
ratio and transparent padding with `object-fit: contain`. The card expands
around that shared viewport, name, and unresearched-only Coin cost; it never
shrinks the symbol to make the five-column graph fit.

### Units and abilities

Unit docks begin with the exact faction/role world sprite and compact role/HP
identity; actions remain below it. Unit docks use the role and faction labels
in Ruleset 6. Marksman/Gumball Guard
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

In the current Ruleset 7 presentation, territory contours follow actual
ownership and city assignment wherever an edge touches explored ground. They
remain open through fog, show no wholly hidden edges, and do not draw a
potential 5 x 5 city expansion outline. A selected city's actual boundary stays
prominent. The older Ruleset 6 behavior was: city selection outlines only
explored assigned territory and, before level 4, previews the centered 5 x 5
potential boundary without implying ownership.
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

### Live match leaderboard

The match HUD includes one clearly labeled **Leaderboard** control. It opens a
view-only layer over the live match with every seat exactly once in stored turn
order. Each row uses player number and color together, and shows faction,
Human/You or Normal AI controller identity, active/eliminated status, total
owned cities, and total living units. Eliminated players remain present with
zero totals. These two aggregate totals are intentionally global public
information; authority projects them directly rather than asking the client to
count fog-filtered entities. The projection exposes no city/unit IDs or
locations, Coins, technologies, or other hidden facts.

Leaderboard access is available while AI work progresses and does not pause,
dispatch, or mutate the match. It preserves map selection, command boundary,
state hash, and presentation queues. A mandatory choice takes precedence and
closes/blocks the layer. The semantic table has a caption, column and row
headers, an explicit close control, trapped focus, and focus return to the HUD
control. It fits a 390 x 844 DPR2 viewport without horizontal scrolling and
uses only established code-native UI tokens.

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
- Profile/customization, online or persistent leaderboards/scores, throne room,
  store, and recurring challenge: omitted, not disabled mystery icons. The
  live in-match city/unit leaderboard is distinct and remains available.
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
4. **Map type:** Dry Land, Pangea, Continents (default), Archipelago, or Lakes.
   The selected map type is retained by save/resume and shown on results.
5. **Difficulty:** read-only “Normal (Greedy POC)—same income and information
   rules.” No implied unavailable difficulty picker.
6. **Seed:** text field, 64-character limit, with Randomize and Copy. Empty is
   labeled “randomized when the match is confirmed.” After Randomize it displays
   eight hexadecimal digits.
7. **Your color:** accessible named swatches. Used colors remain distinguishable
   by player number and pattern/status text; color never carries meaning alone.

Continue validates inline and enters the compact faction assignment. Back preserves the
draft for the current visit. There are no timer, player-created team, ranked,
human-seat, or network fields.

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
- Settings, Stats, Tech, Leaderboard, and End Turn actions;
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

The active battlefield is an axis-aligned square grid. Its accessible Canvas
name says “square-grid battlefield”; cursor announcements identify a one-based
column and row. Arrow keys move along the visible row/column axes, while
Shift+Arrow remains an optional diagonal inspection shortcut. These words and
inputs describe presentation only and do not alter cardinal game adjacency.

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

HP, Attack, Defense, Move, Range, and Sight use one compact typographic
treatment rather than separate pills. The visible value is an ordered numeric
expression such as `Defense 2 + 1`; source names never appear parenthetically
in that line. Each active `+ value` term is independently focusable and has an
ARIA-associated tooltip on pointer hover or keyboard/touch focus explaining
its source. HP shows current HP before the attributed maximum expression. The
authority supplies the complete breakdown: Promotion may add maximum HP,
Charge may add Attack, the one greatest active city/terrain defense multiplier
is represented by its exact additive difference, and Surveying may add
Mountain Sight. The dock does not describe Roads, Fieldcraft, or Maneuver as a
numeric Move increase because those rules affect paths rather than the unit's
movement allowance. Ability tags and their detail cards remain a separate row.

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
named by an exact offered Move command receives one unit-attached silhouette
glow and an anchor-preserving 1–1.08 scale/1–0.62 opacity rhythm on the retained
1.6 s ease-in-out loop; owner cue and health stay steady. The white high-
contrast outline remains legible on light and dark terrain. Move, Attack,
Escape, Recover, Capture, or Wait stops the cue at the accepted command
boundary; Promote alone does not. Movement and combat presentation suppress it
so travel, contact, and damage remain unambiguous. Reduced motion schedules no
readiness frame and instead holds a strong static 1.04-scale silhouette glow.
The unit dock and semantic label say **Needs action** or **Handled**, so
motion/color is never the only signal.

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
visibly contains only the selected city's exact faction-correct world-unit art,
bare unit name, and Coin cost;
semantic accessible names may describe the training action, but visible text
never says “Train” or repeats requirements, coordinates, descriptions,
population guidance, or other metadata.

End Turn dispatches immediately whenever offered, including when units remain
unhandled, affordable training remains, or a capture is available. Mandatory
pending choices prevent it from being offered. During an AI turn map
inspection, Stats, Tech, Leaderboard, and Settings are allowed, but gameplay
commands and End Turn are disabled.

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
persistent/online leaderboard is calculated. The Ruleset-6 live leaderboard is
limited to authority-projected city and living-unit totals.

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

Settings ends with a collapsed **Developer tools** section. Besides the log and
debug exports it holds **Board look** and an experiment for map clutter,
**Board saturation**.

**Board look** is one checkbox, **Classic look (previous art)**, off by
default (bead `pulp_wars-3tq.6`). On, the CHIBI board and interface return to
the look before the [visual direction](#current-chibi-board-look-visual-direction-october-2026):
player-coloured Human garments and roofs, the previous improvements, the
numbered seat badge, the vertical HP bar on every unit, the outline glow as
the ready cue, dashed borders and black-cased Roads; that frame is drawn
exactly as it was before the direction existed. It is for comparison only
and has no effect on the LEGACY art set. The board and the docks switch at
once. The choice is presentation only: it is stored in the browser under
`pulpWars.ruleset7.boardClassicLook.v1` as `{"classic": true|false}` (outside
the shared settings envelope), a missing or malformed value is off, and it
never enters a save, a replay or the engine. The retired experiment key
`pulpWars.ruleset7.boardVisualDirection.v1` is never read and is removed on
load, so nothing stored by the experiment can switch the classic look on.

There is no **Farm crop** option any more. It existed while the user
compared three green Farms (bead `pulp_wars-9s0.6`); the user chose the
vegetable beds (bead `pulp_wars-9s0.7`), which every Farm of the CHIBI
board's new look now shows. Its key `pulpWars.ruleset7.boardFarmCrop.v1` is
never read and is removed on load, like the retired experiment key above.

**Board saturation** is a
“Building saturation” and a “City saturation” slider (0–100% in steps of 5,
default 100%, each with a live percentage readout) and a “Reset saturation”
button that returns both to 100%. Building saturation fades improvement
sprites, the Mine drawn as part of its Mined Mountain, and the Field Defense
badge; City saturation fades city and neutral Village sprites. Units, other
terrain, resources, Roads, overlays, markers, borders, previews and the DOM
docks and portraits are never affected. The board redraws while a slider is
dragged, in both art sets and in both CHIBI looks (the new improvements and
cities fade like the previous ones; code-drawn pennants keep their colour). The values are presentation only: they are stored
in the browser under `pulpWars.ruleset7.boardSaturation.v1` (outside the shared
settings envelope, like the art set), are restored on load with missing or
invalid values clamped to 0–100 and defaulting to 100%, and never enter a save,
a replay or the engine. At 100% the board is drawn exactly as without the
setting.

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
obscure the lower map. A dock with actions fills the width between its
margins (up to 90rem) so its action area never scrolls sideways. Opening it, adding a line, swapping a selection, or
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
- a new match frames the explored area around the human capital between the
  top HUD and the reserved dock height, with no empty off-board band where
  the board is larger than that region
  ([camera framing](../architecture/CLIENT_ARCHITECTURE.md));
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
