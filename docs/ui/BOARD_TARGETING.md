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
  Tractor Beam, a Bolas or a Bomb Run aims at units the unit could also
  attack; a Tunnel, an Assemble, a Beam Down, a Re-bake or a Sugar Rush
  aims at tiles it could also move to. Each has one button that arms it.
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
  there. A Monument tile target, should one be planned, is a Place too.
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
and "+2 HP" cells (Wail, Kaboom!, Tend Wounded, Repair, Frosting, Raise
Dead, Devour, a Cold Snap's reach, the Beam Down pick-up range, a pull's
path, an eruption ring, a splash ring).

## 3. Audit of every dock action

Classes: **(a)** already picked on the board before this bead; **(b)** had
one button, portrait or chip per target in the dock, converted by this
bead; **(c)** not targetable (it acts on the selected thing itself, on an
area fixed by the rules, or it opens a screen).

### 3.1 Every unit

| Action                                                        | Class | How it is chosen now                                                  | Style  |
| ------------------------------------------------------------- | ----- | --------------------------------------------------------------------- | ------ |
| Move (also Embark: a Move onto a Port; Escape; Launch; Glide) | (a)   | Unarmed: a highlighted tile                                           | Move   |
| Attack (melee, ranged, ray, bombs, a Spider)                  | (a)   | Unarmed: a highlighted hostile unit, with its preview                 | Attack |
| Disembark, and the two-step landing                           | (a)   | Unarmed: a highlighted shore tile ("Land now", "Move 1, then land")   | Move   |
| Recover, Wait, Capture, Promote, Pillage, Disband             | (c)   | One button; acts on the unit or its own tile                          | none   |
| Build Field Defense (Fortify)                                 | (c)   | One button; the unit's own tile                                       | none   |
| Rally (Frenzy, WAAAGH!)                                       | (c)   | One button; every own unit in the fixed radius                        | none   |
| Tend Wounded (Repair, Frosting)                               | (c)   | One button; every own unit next to the healer, previewed on the board | none   |

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
| Dwarf    | Tunnel: passenger    | (b)   | A portrait button per Hammerer and "Alone"             | The badged Hammerers on the board; the dock shows who rides and one "Alone" toggle                           | Help                         |
| Dwarf    | Tunnel: destination  | (a)   | A tile on the board, chosen then confirmed             | Unchanged                                                                                                    | Move                         |
| Dwarf    | Bomb Run: target     | (b)   | A button per target, and board targets                 | The board targets only                                                                                       | Attack                       |
| Dwarf    | Bomb Run: landing    | (a)   | A tile on the board                                    | Unchanged                                                                                                    | Move                         |
| Dwarf    | Assemble             | (a)   | A tile on the board                                    | Unchanged                                                                                                    | Place                        |
| Dwarf    | Repair               | (c)   | The Engineer's Tend Wounded button                     | Unchanged                                                                                                    | none                         |
| Candy    | Sugar Rush           | (a)   | One button arms it; a tile or an attack on the board   | Unchanged                                                                                                    | Move, Attack                 |
| Candy    | Re-bake              | (b)   | A portrait button per Crumbs tile, and board targets   | The Crumbs tiles on the board only, each with the unit's ghost, price and HP                                 | Place                        |
| Candy    | Sugar Toss           | (b)   | A portrait button per healable unit, and board targets | The healable units are highlighted unarmed beside the Gunner's Moves and Attacks; the button narrows to them | Help                         |
| Candy    | Frosting             | (c)   | The Confectioner's Tend Wounded button                 | Unchanged                                                                                                    | none                         |

### 3.3 Cities, tiles, ships and curiosities

| Action                                                                                             | Class | How it is chosen                                                                                       |
| -------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------ |
| Train a unit; Land Grant; choose a city reward                                                     | (c)   | The selected city's cards; nothing on the map is targeted                                              |
| Train a ship                                                                                       | (c)   | The selected Port or Shipyard tile's cards; the ship appears on that tile                              |
| Harvest, Hunt, Fish, Gather Pearls; every Build; Clear, Replant, Cultivate, Blast, Road, Redevelop | (a)   | The tile is selected on the board first; its dock offers what that tile can do                         |
| Build a Monument                                                                                   | (a)   | The tile is selected on the board first; one button per earned achievement (which Monument, not where) |
| Research prompt                                                                                    | (c)   | Opens the technology screen                                                                            |
| Ships: Move, Attack, Disembark, Recover                                                            | (a)   | As for every unit                                                                                      |
| Fountain of Youth, Shrine, Sunken Wreck, Spider's lair                                             | (c)   | No action: a unit moves onto or next to it                                                             |
| Giant Spider                                                                                       | (a)   | An ordinary attack target                                                                              |

No action of class (b) remains. The tile actions are of class (a) by
selection: the player points at the tile before the dock offers anything,
so no highlight style is involved. The Monument buttons choose **which**
Monument stands on the selected tile, which is not a target on the map.

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
- `scripts/browser-board-targeting-review-v7.ts` (dev server only)
  captures every style on the faction fixtures, on Grass, Snow, a Forest,
  Mountains and the Undead ground, at desktop and phone widths, and the
  Help legend:
  `npx tsx scripts/browser-board-targeting-review-v7.ts http://localhost:6173/ --output-dir=<new-dir>`.
