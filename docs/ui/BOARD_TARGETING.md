# Board targeting

**Status:** authoritative for the current Ruleset 7 interface (bead
`pulp_wars-9im`, October 2026). Legacy Ruleset 5 and 6 routes are unchanged.

**Companions:** [Screen flow](SCREEN_FLOW.md#board-targeting-bead-pulp_wars-9im),
the [no-coordinates rule](SCREEN_FLOW.md#no-coordinates-minimal-text-bead-pulp_wars-b5f8).

**Code:** `src/render/canvas/target-highlight-v7.ts` (the vocabulary and its
drawing), `src/render/canvas/board-renderer-v7.ts` (`drawMapTarget`, the
plan's targets), `src/render/canvas/board-host-v7.ts` (click, tap, Tab),
`src/render/dom/app-view-v7.ts` (the dock and its aiming panels),
`src/render/dom/target-legend-v7.ts` (the Help legend).

## 1. The rule

Whenever an action targets a specific unit, tile or building on the map, the
board highlights the legal targets and the player picks one **on the board**.
The dock never lists one button, portrait or chip per target.

- **One button per action at most.** The dock has one button for an ability
  (with its icon, name, tooltip and, when it cannot be used, the reason).
  It never grows with the number of targets.
- **No arming where a click cannot be misread.** A selected unit shows,
  with nothing armed, every target that no other action of that unit could
  claim: the tiles it may move to, the hostile units it may attack and the
  own units it may heal or hatch. These never share a tile (a Move ends on a
  free tile, an Attack is on a hostile unit, a heal or a Hatch is on an own
  unit), so a click on each does what its mark says.
- **Arming where two actions could claim one target.** A Mind Control, a
  Tractor Beam, a Bolas, a Bomb Run or a Board aims at units the unit could
  also attack; a Tunnel, an Assemble, a Beam Down, a Re-bake, a Sugar Rush
  or a Freeze aims at tiles it could also move to. Each has one button that arms it.
  While it is armed only its targets are highlighted and clickable; Back,
  Cancel, Escape or choosing something else disarms it. The choice between
  two actions on one target is therefore made with the armed button, never
  with a menu on the target.
- **Previews at the target.** The exact numbers (damage, heal, cost, HP,
  "Frozen", "Take · 5 HP") come from the engine's public previews and stand
  in the label at the target, as an attack's "Deal 4 · take 2" does. The
  focused or hovered target adds its ghosts, paths and rings.
- **Keyboard.** Tab and Shift+Tab on the board step through the targets in
  reading order: an armed ability's targets, or, with nothing armed, the
  units the selection may attack, heal or hatch (plain Move tiles are
  reached with the arrow keys). Enter or Space chooses. Past the last
  target Tab leaves the board for the dock. The cursor description names
  each target without coordinates.
- **Phone.** A tap on a highlighted target chooses it; a tap elsewhere
  selects as usual.
- **Legality.** Every target is an offered command of the engine's public
  query; every number is a public preview. The interface restates no rule.

## 2. The highlight vocabulary

Four styles, the same for every faction. A style is told apart by its
**shape** first and its colour second, so it survives colour blindness and
the high-contrast setting. Every mark is stroked twice: a dark casing
(`#10131c`, 80%) and the colour over it, so it reads on Grass, on Snow, on
the Undead gloam ground, over composed forest pieces and over mountains
(the marks are drawn above terrain, forests, mountains and units). The
marks do not move, pulse or fade: the reduced-motion still is the mark
itself.

| Style      | Meaning                                                    | Shape                                               | Colour    |
| ---------- | ---------------------------------------------------------- | --------------------------------------------------- | --------- |
| **Move**   | A tile the unit goes to                                    | Dashed outline on the tile's edges                  | `#64e6cf` |
| **Attack** | A unit it harms (an attack or a hostile ability)           | Solid outline with an aiming bracket in each corner | `#ff655f` |
| **Help**   | An own unit it heals, hatches, carries or pulls            | A round ring inside the tile with a plus badge      | `#b6f36a` |
| **Place**  | A tile where something is put (a building, an Egg, a unit) | Dotted outline with a square pip in each corner     | `#ffe7a3` |

- **Move** and **Attack** keep the looks they had (dashed teal, red); the
  Attack mark became solid and gained its brackets so it no longer differs
  from a Move by colour alone.
- **Help** is deliberately not a tile outline: a ring with a plus cannot be
  mistaken for a Move or an Attack at any size, and it leaves the Move
  tiles beside it their whole outline.
- **Place is needed.** The audit below has four actions that put something
  on a tile the selected unit does not go to (Lay Egg, Assemble, Re-bake,
  the Beam Down tile); drawing them as Moves would say the unit goes
  there. A Monument is not among them: its tile is selected first
  (section 3.3), so there is no Monument target family.
- **Neighbouring marks** share an edge once: an Attack mark wins it over a
  Place mark, a Place mark over a Move mark; a Help ring owns no edge.
- **Move variants** keep their own stroke, each with a legend in the dock:
  a machine's Launch tile (dotted pale blue), an Ice Folk Glide tile (pale
  ice) and a two-step landing (dotted gold). A chosen Tunnel destination is
  the Move mark drawn solid, and the other landings of a seated Hammerer
  are small dots.
- **Colour blindness.** The four colours stay apart under simulated
  protanopia, deuteranopia and tritanopia (unit-tested), but the shapes
  carry the meaning.
- **High contrast** draws the same marks one step thicker.
- **Help screen.** "How to play" shows the four marks with the words Move,
  Attack, Help and Place.

Until this bead every target was a dashed tile outline in a colour of its
faction (Martian magenta, pale ice, light earth, copper, steam white, candy
pink, cream, mint). Those colours no longer mark targets. Effect previews
that are not targets keep their own looks: ability areas and their "−3"
cells (Wail, Kaboom!, Raise Dead, Devour, a Cold Snap's reach, the Beam
Down pick-up range, a pull's path, an eruption ring, a splash ring). The
units an area support would help are the exception: they wear the Help
mark in its own weight (section 2.1).

### 2.1 Area support: marked, not picked (bead `pulp_wars-621`)

Some abilities have one button that helps **every** eligible own unit in
reach: Tend Wounded (a Dwarf Engineer's Repair, a Candy Confectioner's
Frosting) and Rally (Frenzy, Berserk, War Drums, Psychic Command). There
is nothing to pick, but the player should see who is helped and by how
much, as with a targeted heal. The Ice Folk have no such ability.

- **The mark** is the Help mark with a **broken ring**: the same green,
  the same plus badge, the ring drawn in dashes. A whole ring is a unit to
  pick; a broken ring is a unit the button will help.
- **Heals are marked while the healer is selected** and its button is on
  offer, in every match. Each recipient carries the exact result of the
  engine's public preview at the top of its tile: "+2 HP", "+4 HP" (a
  machine under Repair), "Cure" (Plague, a bite or Chill is removed), or
  "+2 · Cure". At rest the ring is thin with a small plus, so it sits
  under the unit's Move and Attack marks rather than competing with them.
- **Hovering or focusing the button makes its marks prominent**: the ring
  at a target's full weight with a soft green fill. Nothing in the dock
  changes. Leaving or blurring returns them to rest.
- **A Rally is marked only while its button is hovered or focused.** It is
  on offer almost every turn and has no amount to read, so marking it at
  rest would ring half the army whenever a Captain is selected. Its
  recipients (from the engine's own eligibility rule) then show the
  prominent ring without a label, and the heal marks step aside for it.
  An Orc Warboss's **Berserk** (`pulp_wars-w49.36`) has an amount to read:
  each recipient's ring carries "+1 Move", and its radius (the 5 × 5
  square around the Warboss) is outlined in the same green.
  On a phone, which has no hover, a Rally is therefore not marked; its
  button and tooltip are unchanged.
- **They are not targets.** A click or tap on a marked unit selects it, as
  on any own unit; Tab does not step through them; the dock lists none of
  them. The one button is the only way to use the ability.
- **While another ability of the unit is aimed** (Assemble, Re-bake) the
  marks step aside with the unit's other previews.

Before this bead the heal recipients were a square teal outline, shown
only in matches with an Undead seat or for an Engineer or a Confectioner.

## 3. Audit of every dock action

Classes: **(a)** already picked on the board before this bead; **(b)** had
one button, portrait or chip per target in the dock, converted by this
bead; **(c)** not targetable (it acts on the selected thing itself, on an
area fixed by the rules, or it opens a screen).

### 3.1 Every unit

| Action                                                        | Class | How it is chosen now                                                 | Style                   |
| ------------------------------------------------------------- | ----- | -------------------------------------------------------------------- | ----------------------- |
| Move (also Embark: a Move onto a Port; Escape; Launch; Glide) | (a)   | Unarmed: a highlighted tile                                          | Move                    |
| Attack (melee, ranged, ray, bombs, a Spider)                  | (a)   | Unarmed: a highlighted hostile unit, with its preview                | Attack                  |
| Disembark, and the two-step landing                           | (a)   | Unarmed: a highlighted shore tile ("Land now", "Move 1, then land")  | Move                    |
| Recover, Wait, Capture, Promote, Pillage, Disband             | (c)   | One button; acts on the unit or its own tile                         | none                    |
| Build Field Defense (Fortify)                                 | (c)   | One button; the unit's own tile                                      | none                    |
| Rally (Frenzy, Berserk, War Drums, Psychic Command)           | (c)   | One button; its recipients are marked while it is hovered or focused | Help, broken ring (2.1) |
| Tend Wounded (Repair, Frosting)                               | (c)   | One button; every recipient is marked with its heal or cure          | Help, broken ring (2.1) |

### 3.2 Faction abilities

| Faction  | Action               | Class | Before                                                 | Now                                                                                                          | Style                        |
| -------- | -------------------- | ----- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| Undead   | Raise Dead           | (c)   | One button                                             | Unchanged: every Grave in reach rises, previewed "Rise"                                                      | none                         |
| Undead   | Devour               | (c)   | One button                                             | Unchanged: the Grave under the Ghoul                                                                         | none                         |
| Undead   | Wail                 | (c)   | One button                                             | Unchanged: the fixed radius, previewed per unit                                                              | none                         |
| Goblin   | Kaboom!              | (c)   | One button, armed and confirmed                        | Unchanged: the blast is the unit's own, previewed on the board                                               | none                         |
| Goblin   | Plunder              | (c)   | No action (a passive rule of captures and kills)       | Unchanged                                                                                                    | none                         |
| Dinosaur | Hatch                | (b)   | One "Hatch" button per adjacent Egg                    | One Hatch button; the Eggs are highlighted unarmed and picked on the board (one Egg: the button hatches it)  | Help                         |
| Dinosaur | Lay Egg (city)       | (a)   | A card per role, then a nest tile on the board         | Unchanged                                                                                                    | Place                        |
| Dinosaur | Abandon Egg          | (c)   | One button on the Egg                                  | Unchanged                                                                                                    | none                         |
| Dinosaur | Charge!, Stampede    | (c)   | No action (part of an Attack's preview)                | Unchanged                                                                                                    | Attack (the attack)          |
| Martian  | Beam Down: passenger | (b)   | A portrait button per passenger, and board badges      | The badged units on the board only                                                                           | Help                         |
| Martian  | Beam Down: tile      | (a)   | A tile on the board                                    | Unchanged                                                                                                    | Place                        |
| Martian  | Mind Control         | (b)   | A chip per target, and board targets                   | The board targets only; units that cannot be taken keep their grey reason                                    | Attack                       |
| Martian  | Tractor Beam         | (b)   | A chip per target, and board targets                   | The board targets only                                                                                       | Attack; Help for an own unit |
| Ice Folk | Bolas                | (b)   | A chip per target, and board targets                   | The board targets only                                                                                       | Attack                       |
| Ice Folk | Cold Snap            | (c)   | One "Cast Cold Snap" (it chills every unit in reach)   | Unchanged; the chilled units are marked and any of them casts it too                                         | Attack                       |
| Ice Folk | Blizzard, Rockfall   | (c)   | No action (a passive aura; part of an Attack)          | Unchanged                                                                                                    | none                         |
| Ice Folk | Freeze (a line role) | (a)   | No control (the frozen sea had no interface)           | One button arms it; the tile to freeze toward is picked on the board (section 3.5)                           | Place                        |
| Ice Folk | Freeze (Ice Witch)   | (c)   | No control                                             | One button casts her ring; its tiles are marked while she is selected (section 3.5)                          | none (an area preview)       |
| Dwarf    | Tunnel: passenger    | (b)   | A portrait button per Hammerer and "Alone"             | The badged Hammerers on the board; the dock shows who rides and one "Alone" toggle                           | Help                         |
| Dwarf    | Tunnel: destination  | (a)   | A tile on the board, chosen then confirmed             | Unchanged                                                                                                    | Move                         |
| Dwarf    | Bomb Run: target     | (b)   | A button per target, and board targets                 | The board targets only                                                                                       | Attack                       |
| Dwarf    | Bomb Run: landing    | (a)   | A tile on the board                                    | Unchanged                                                                                                    | Move                         |
| Dwarf    | Assemble             | (a)   | A tile on the board                                    | Unchanged                                                                                                    | Place                        |
| Dwarf    | Repair               | (c)   | The Engineer's Tend Wounded button                     | The button is unchanged; the Repair recipients are marked (2.1), Barricades it mends too                     | Help, broken ring            |
| Dwarf    | Whirl                | (c)   | A generic button (`pulp_wars-w49.33`)                  | One button aims it; every enemy it hits is marked with its damage, and the button or any of them whirls      | Attack                       |
| Dwarf    | Barricade            | (a)   | A generic button per tile                              | One button arms it; the tile is picked on the board                                                          | Place                        |
| Any      | Attack a Barricade   | (a)   | A generic button per attacker and Barricade            | An attack target on the Barricade's tile, with the damage and what is left                                   | Attack                       |
| Candy    | Sugar Rush           | (a)   | One button arms it; a tile or an attack on the board   | Unchanged                                                                                                    | Move, Attack                 |
| Candy    | Re-bake              | (b)   | A portrait button per Crumbs tile, and board targets   | The Crumbs tiles on the board only, each with the unit's ghost, price and HP                                 | Place                        |
| Candy    | Sugar Toss           | (b)   | A portrait button per healable unit, and board targets | The healable units are highlighted unarmed beside the Gunner's Moves and Attacks; the button narrows to them | Help                         |
| Candy    | Frosting             | (c)   | The Confectioner's Tend Wounded button                 | The button is unchanged; the Frosting recipients are marked (2.1)                                            | Help, broken ring            |

### 3.3 Cities, tiles, ships and curiosities

| Action                                                                                             | Class | How it is chosen                                                                                       |
| -------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------ |
| Train a unit; Land Grant; choose a city reward                                                     | (c)   | The selected city's cards; nothing on the map is targeted                                              |
| Train a ship                                                                                       | (c)   | The selected Port or Shipyard tile's cards; the ship appears on that tile                              |
| Harvest, Hunt, Fish, Gather Pearls; every Build; Clear, Replant, Cultivate, Blast, Road, Redevelop | (a)   | The tile is selected on the board first; its dock offers what that tile can do                         |
| Build a Monument                                                                                   | (a)   | The tile is selected on the board first; one button per earned achievement (which Monument, not where) |
| Research prompt                                                                                    | (c)   | Opens the technology screen                                                                            |
| Ships: Move, Attack, Disembark, Recover                                                            | (a)   | As for every unit                                                                                      |
| Ships: Board (Seamanship)                                                                          | (a)   | One Board button arms it; the enemy ship to capture is picked on the board (section 3.4)               |
| Fountain of Youth, Shrine, Sunken Wreck, Spider's lair                                             | (c)   | No action: a unit moves onto or next to it                                                             |
| Giant Spider                                                                                       | (a)   | An ordinary attack target                                                                              |

No action of class (b) remains. The tile actions are of class (a) by
selection: the player points at the tile before the dock offers anything,
so no highlight style is involved. The Monument buttons choose **which**
Monument stands on the selected tile, which is not a target on the map.

### 3.4 Board, the Bow Ram and the Submarine (bead `pulp_wars-5ti.7`)

The naval branch
([rules](../product/RULESET_7_CURRENT.md#14-naval-rules))
adds one targeted action and three previews. Code:
`src/render/naval-presentation-v7.ts` (the words),
`src/render/canvas/naval-board-plan-v7.ts` (the plan) and
`src/render/canvas/naval-canvas-v7.ts` (the two ship markers).

- **Board is armed.** A ship that may capture an enemy ship may usually
  attack it too, so the two actions claim one target and Board follows the
  arming rule: the dock has **one Board button** (a grappling hook)
  whatever the number of boardable ships. Unarmed, the selected ship shows
  its Moves and Attacks as always. Armed (the button is pressed), only the
  ships the engine offers a `BOARD` on are highlighted, in the **Attack**
  style, each labelled with the exact result of `previewBoardV7`:
  **"Take · 4 HP"** (the prize and its HP after the patch, the wording of
  a Mind Control's "Take · 5 HP"). A click, a tap or Enter on one sends
  the `BOARD`; Escape, Cancel or another selection disarms and sends
  nothing; Tab steps through the prizes. The aiming panel holds the "?"
  and Cancel only.
- **What tells a capture from an attack.** Three things, none of them a
  fifth style: the armed button (while it is pressed every mark on the
  board is a capture), the label ("Take · N HP" where an attack reads
  "Deal N · take N"), and the **grappling-hook badge** every ship at or
  below its boarding line wears on the board, for both sides and at all
  times (`stats.boardableAt`), so a prize is seen before anything is
  armed. Its dock shows the chip "Boardable".
- **Reasons.** While Board is armed, an enemy afloat within two tiles that
  cannot be taken keeps a grey mark with the engine's rejection reason
  (`boardTargetBlockV7`): "Above 3 HP" (`TARGET_HEALTHY`, with the ship's
  boarding line), "Not a ship" (`TARGET_IMMUNE`, a transport) or "Too far"
  (`OUT_OF_RANGE`), as a Mind Control target that cannot be taken does.
  When no `BOARD` is offered, a ship of a seat with Seamanship that stands
  next to an enemy afloat shows the Board button disabled with one reason
  ("No enemy ship here is weak enough", "Only ships can be boarded", "This
  ship cannot board now"); every other ship has no Board button.
- **The Bow Ram** is part of an Attack's preview, like a Charge!, a
  Knockback or a Bounce: the note "Bow Ram +1" and "Shoves back" or "Shove
  blocked" (the public preview's `ram` and `push`), and, on the focused or
  only target, the Knockback's arrow to the tile behind the target (a
  cross when blocked). The hit reuses the Charge! star flash, and the
  shove the Knockback's slide and puff.
- **A torpedo** is an ordinary Attack whose preview reads "take 0" and the
  note "No strike-back" (in a match with an Undead seat the note is that
  match's "No retaliation", once). Only targets afloat are offered, so a
  unit on the shore next to a Submarine is not marked.
- **A submerged Submarine** wears two wave lines over its hull and a
  periscope badge, for both sides, and its dock the chip "Submerged". It
  is an Attack target only for a unit next to it (the engine offers no
  other attack); while a unit that could still attack is selected, a
  hostile Submarine inside its range but two or more tiles away wears the
  grey mark "Submerged: get adjacent" instead of an Attack mark.
- **Names.** The boats' ram is displayed as **Bow Ram** (the Goblin Scrap
  Buggy's Overrun has been displayed as "Ram" since revision 17); the rule
  ID stays `RAM`. Shorecraft's note is "Units embark at active Ports",
  since "Board" now names the capture.

### 3.5 The frozen sea: Freeze, the slide, Icebound (bead `pulp_wars-5ti.7`)

The Ice Folk
([rules](../product/RULESET_7_CURRENT.md#2116-the-frozen-sea))
freeze the sea instead of sailing it. Code:
`src/render/frozen-sea-presentation-v7.ts` (the words),
`src/render/canvas/frozen-sea-board-plan-v7.ts` (the plan) and
`src/render/canvas/frozen-sea-canvas-v7.ts` (ice cells, cracks, the slide
arrow, the icebound marker).

- **Freeze of a line role is armed.** A tile next to the unit that is
  already ice is both a Move and a Freeze (a refresh), so Freeze follows
  the arming rule: **one Freeze button** (a snowflake). Armed, each tile
  the engine offers a `FREEZE` on is a target in the **Place** style,
  labelled with the exact outcome of `previewFreezeV7`: **"Ice 2 · 3
  turns"** (the tiles that freeze and how long they last; 5 with Glacier),
  **"Ice 1 · stays"** where the ice is in the unit owner's territory and
  never melts, "Ice 2 · 3 turns, 1 stays" for a line that leaves it. The
  far tile of each line is tinted with a dashed cream edge (it is frozen
  too, and is not picked), and a ship a line would lock in reads
  "Icebound" (the target's note counts them). A click, a tap or Enter
  freezes; Escape, Cancel or another selection disarms; Tab steps through
  the tiles. The aiming panel holds the "?" and Cancel only.
- **The Ice Witch's Freeze is not aimed.** It always freezes her ring, so
  there is nothing to pick: her one Freeze button casts it. The tiles it
  would turn to ice are marked while she is selected (the same tint and
  dashed cream edge, quiet), and lifted, with the outcome's label on her
  tile, while the button is hovered or focused. They are an area preview,
  not targets, like an area support's recipients (section 2.1): a click on
  one does what its own mark says. On a phone, which has no hover, the
  quiet marks are the preview.
- **Reasons.** When no `FREEZE` is offered, a unit with the ability that
  stands next to water shows the button disabled with the first failing
  row of the rules: "Needs Rime", "Frozen: it moved", "Already acted this
  turn", "Deep Water needs Pack Ice" or "No water here can freeze". A unit
  with no water beside it has no Freeze button.
- **The slide is part of a Move.** The engine offers a sliding unit only
  the tiles a Move can end on, so its destinations are ordinary Move
  targets. A destination reached by a slide is outlined in the pale ice of
  a Glide tile and draws an **arrow** from the tile the unit steps from,
  across the ice, to the tile it stops on (once per slide, at full weight
  on the focused destination); the dock's legend reads "Slide: it stops
  where the ice ends". The path is the command's own. A unit that does not
  slide (the Sabretooth, a walker, a flyer) has plain Moves.
- **The slip.** A ground unit of another faction is offered the ice tile
  next to it as an ordinary Move; it takes the same pale outline and the
  legend "Ice: your Move ends here". A Move that stops on ice the unit did
  not know of is announced ("Ice: the Move ended there").
- **An icebound ship** is no target of its owner's: the engine offers it
  no Move, Attack or Board. It wears the pack ice at its hull's foot and a
  pill with the crush it takes next ("−3", "Sinks"); its dock has the
  chips "Icebound" and "−3 HP" (whose turn, in the tooltip) and, for its
  owner, one disabled "Sail" button with the reason. Board's own reason
  for an icebound boarder is in section 3.4.

## 4. The aiming panel

While an ability is armed the dock shows its aiming panel in place of the
actions: the ability's icon and name, a `?` whose tooltip holds the
instruction, the ability's one toggle or confirmation where it has one
("Alone" and "Tunnel", "Cast Cold Snap"), Back and Cancel. It holds at most
five buttons whatever the number of targets, and none named after a
target. `data-board-targets` on the panel carries the number of targets
for tools; it is never read out.

## 5. Tests that hold the rule

- `tests/unit/target-highlight-render-v7.test.ts`: the vocabulary (one
  style per family, four shapes, the colour-blindness distances, the
  drawing of each mark) and the style of every family's targets on the UI
  fixtures, including a healer with Move, Attack and Help marks at once.
- `tests/integration/ruleset7-no-coordinates-dom.test.ts`: the generic
  guard. Its sweep selects every unit and aims every ability on every
  faction fixture and fails when an aiming panel holds more than its fixed
  controls, or when any dock button is named after a unit standing on a
  highlighted target.
- The faction DOM tests (`ruleset7-martian-dom`, `-ice-folk-dom`,
  `-dwarf-dom`, `-candy-dom`, `-dinosaur-dom`): arm, the targets of the
  right style, a board pick sends the offered command, Escape disarms, no
  list in the dock.
- `tests/integration/ruleset7-dinosaur-canvas.test.ts`: the keyboard path
  on the real board host (Tab through unarmed and armed targets, Enter).
- The browser smoke (`scripts/browser-smoke-v7.ts` and
  `scripts/browser-smoke-v7-candy.ts`) picks the Beam Down passenger, the
  Mind Control target, the Bolas target, the Sugar Toss target and the
  Re-bake tile on the board.
- `tests/unit/area-support-render-v7.test.ts` and
  `tests/integration/ruleset7-area-support-dom.test.ts` (section 2.1): on
  a scene per faction (`tests/fixtures/v7-area-support-ui.ts`), every heal
  recipient is marked with the public preview's amount, quiet at rest and
  prominent while the button is hovered or focused; a Rally is marked only
  then; no mark is a map target; the dock keeps one button and lists no
  recipient; a click on a marked unit selects it.
- `tests/unit/naval-presentation-render-v7.test.ts`,
  `tests/integration/ruleset7-naval-dom.test.ts` and
  `tests/integration/ruleset7-naval-canvas.test.ts` (section 3.4, scenes in
  `tests/fixtures/v7-naval-ui.ts`): Board with two prizes (one button, the
  exact "Take · N HP", a board pick sends the offered command, Escape and
  Cancel disarm, Tab and Enter on the real board host, the grey reasons),
  the Bow Ram preview with a shove and a blocked shove, the Submarine's
  markers, offering and reason, the torpedo preview, and the Harbours
  numbers. The naval browser smoke (`scripts/browser-naval-smoke-v7.ts`)
  arms Board, picks the prize on the board at desktop and phone widths,
  rams, and reads the Submerged chip.
- `tests/unit/frozen-sea-presentation-render-v7.test.ts`,
  `tests/integration/ruleset7-frozen-sea-dom.test.ts` and
  `tests/integration/ruleset7-naval-canvas.test.ts` (section 3.5, scenes in
  `tests/fixtures/v7-frozen-sea-ui.ts`): a line role's Freeze (one button,
  the exact "Ice N" label, the far tile, a board pick sends the offered
  command, Escape and Cancel disarm, Tab and Enter on the real board
  host, the reasons), the Witch's ring (quiet, prominent on focus, cast on
  press, Deep Water only with Pack Ice), the slide and its arrow, the
  Sabretooth's plain Moves, the slip, an icebound ship's chips, reason and
  crush, the melting stages and permanent ice. The guard test sweeps five
  frozen-sea scenes. The naval browser smoke mounts the fixture app in
  the CHIBI look, arms Freeze and picks its tile on the board at desktop
  and phone widths, casts the Witch's ring, slides a Sled across a bridge
  to the far shore, and reads an icebound ship's crush.
- `scripts/browser-board-targeting-review-v7.ts` (dev server only)
  captures every style on the faction fixtures, on Grass, Snow, a Forest,
  Mountains and the Undead ground, at desktop and phone widths, the area
  support marks at rest and with their button focused, and the Help
  legend (`--only=<name-prefix>` keeps a part of the captures):
  `npx tsx scripts/browser-board-targeting-review-v7.ts http://localhost:6173/ --output-dir=<new-dir>`.
- The faction reviews `scripts/browser-martian-review-v7.ts`,
  `scripts/browser-dwarf-review-v7.ts` and
  `scripts/browser-balance-ui-review-v7.ts` read an aimed ability's
  targets from the board (the aiming panel's `data-board-targets` and each
  target's cursor description, stepped with Tab) and pick on the board.
