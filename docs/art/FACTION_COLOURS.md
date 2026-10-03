# Faction colours

**Status:** decided in bead `pulp_wars-b5f.4` (epic `pulp_wars-b5f`, playtest
round 5). The user (2026-10-03): "instead of choosing color per player and
this color is used on the border of the territory, the color should be
permanently assigned to a faction (necromancer will have violet etc)", and
"all the crudely drawn flags from cities can be removed now that they are
not needed to differentiate the players."

Every player plays a different faction
([RULESET_7_UNIQUE_FACTIONS.md](../product/RULESET_7_UNIQUE_FACTIONS.md)),
so a faction's colour names one player. Each faction has one permanent
owner colour, and the four seat colours (Coral, Teal, Gold, Violet) and the
setup's colour choice are gone. The code-drawn pennants on cities, Ports
and Shipyards are retired. See
[VISUAL_DIRECTION_2026-10.md, section 21](VISUAL_DIRECTION_2026-10.md#21-faction-colours-and-the-pennants-retired)
for what the board draws now.

## The palette

The single source is `FACTION_COLOURS_V7` in
[`src/render/canvas/faction-colours-v7.ts`](../../src/render/canvas/faction-colours-v7.ts).

| Faction  | Colour    | Name          | Why                                                                                                                                                  |
| -------- | --------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Human    | `#d01c3a` | crimson       | The Human heraldic cloth `#a8202c`, lifted (L\* 37 to 45) so it stands out of the border's dark casing.                                              |
| Undead   | `#a221ee` | violet        | The user's example, and exactly the Undead's own lit violet accent (eyes, flames, the Lich's orb).                                                   |
| Goblin   | `#fdd20f` | hazard yellow | The Goblins' hazard stripes `#fbc208` on everything that explodes. Their olive skin is a green that would vanish on Grass.                           |
| Dinosaur | `#fe7500` | red-orange    | Exactly the Dinosaurs' lit red-orange of crests, spines and war paint. Their other hue, the blue hide, is the Ice Folk's.                            |
| Martian  | `#e83aae` | magenta       | The Martian hot magenta of ray emitters and running lights (lit `#f30a96`), a touch lighter so it reads on Deep Water.                               |
| Ice Folk | `#10b8ff` | ice blue      | The Ice Folk ice accent `#37b1fa`, more saturated, so it holds on its own Snow (69 apart) and on Shallow Water.                                      |
| Dwarf    | `#2db885` | signal green  | The gauge lamp on every Dwarf machine, moved from its yellow-green (`#2bd94a`) toward jade. Copper, the Dwarf metal, is 20 from the Dinosaur orange. |

Considered and rejected:

- **Dwarf copper** (`#de6f2a`): 20 from the Dinosaur orange in CIE76 and
  under 10 under both colour vision deficiencies. One of the two had to
  leave orange; the bead offered the Dwarves the lamp's signal green.
- **The lamp's own green** (`#2bc45a`): 30 from Grass with normal vision
  but **2** under deuteranopia, and 14 from the Dinosaur orange under
  protanopia. The jade keeps 25 from Grass under both.
- **Human gold:** gold and the Goblin hazard yellow would be one colour.
- **Goblin toxic green:** on Grass, the same failure as the lamp green.

## Measurements

CIE76 (ΔE\*ab) in CIE L\*a\*b\* (D65). Colour vision deficiencies are
simulated with Machado, Oliveira and Fernandes (2009) at severity 1 on
linear RGB. The checks are pinned in
[`tests/unit/faction-colours-render-v7.test.ts`](../../tests/unit/faction-colours-render-v7.test.ts).

**Pairs.** The weakest pairs of the 21:

| Vision       | Weakest pair              | Next                                                          |
| ------------ | ------------------------- | ------------------------------------------------------------- |
| Normal       | Human/Dinosaur **49.1**   | Goblin/Dinosaur 53.5, Undead/Martian 54.0, Human/Martian 56.3 |
| Deuteranopia | Goblin/Dinosaur **20.6**  | Martian/Dwarf 28.2, Human/Dwarf 30.3, Undead/Ice Folk 31.6    |
| Protanopia   | Martian/Ice Folk **26.6** | Goblin/Dinosaur 33.4, Human/Dwarf 35.2, Dinosaur/Dwarf 41.7   |

For comparison, the four seat colours had a weakest pair of 61.0 (normal),
30.6 (deuteranopia) and **21.6** (protanopia, Coral/Teal): seven colours
cannot be as far apart as four, but under protanopia the seven are further
apart than the four were. Under deuteranopia the Goblin yellow and the
Dinosaur orange are told apart by lightness (L\* 86 against 65).

**Against the ground.** The mean colours of the CHIBI tiles under the
border: Grass `(137, 183, 91)`, Snow (the Ice Folk overlay's 42% wash of
`#f5f8fc` on Grass), Shallow Water `(143, 211, 220)`, Deep Water
`(66, 119, 165)` and the rocky Mountain ground `(162, 170, 182)`. CIE76
with normal vision, then the lower of the two deficiencies:

| Faction  | L\* | Grass     | Snow      | Shallow  | Deep      | Mountain |
| -------- | --: | --------- | --------- | -------- | --------- | -------- |
| Human    |  45 | 101 / 19  | 93 / 35   | 102 / 53 | 93 / 46   | 81 / 41  |
| Undead   |  46 | 162 / 114 | 143 / 100 | 122 / 68 | 94 / 42   | 107 / 70 |
| Goblin   |  86 | 55 / 38   | 65 / 58   | 98 / 92  | 121 / 116 | 93 / 91  |
| Dinosaur |  65 | 85 / 19   | 85 / 44   | 108 / 75 | 116 / 90  | 93 / 70  |
| Martian  |  55 | 125 / 55  | 107 / 43  | 98 / 20  | 79 / 10   | 78 / 13  |
| Ice Folk |  71 | 89 / 87   | 69 / 65   | 36 / 32  | 29 / 27   | 41 / 33  |
| Dwarf    |  67 | 31 / 25   | 34 / 12   | 42 / 29  | 67 / 48   | 53 / 20  |

Every colour is at least 29 from every ground with normal vision. The
border is a 3.5 px line (zoom 1) inside a 6.5 px near-black casing
(`#1d2a28` at 55%), so a line also reads by lightness against the casing:
every colour has L\* 45 or more. The low simulated numbers are carried by
that casing: the Martian magenta on Deep Water (10) is a light line in a
dark rim on a mid blue, and the Dwarf green is never on Snow (Snow lies in
Ice Folk territory, and a border is drawn on its owner's side).

## Where the colour is drawn

| Look                                      | What carries the faction colour                                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Default (live) look of the CHIBI art set  | the territory border (solid), the Egg's countdown ring, and the interface (leaderboard swatch and row edge, art in owner areas) |
| Classic look (Settings > Developer tools) | as before, but in the faction colour: unit and building owner masks, the numbered seat badge, the dashed border                 |
| LEGACY art set (`?art=legacy`)            | the seat badge, the dashed border and the code-drawn owner details, in the faction colour                                       |

The Classic look and LEGACY use the faction colour too: one colour per
player in every look is the simplest consistent rule, and the faction is
unique per player. Their owner recolour reads (see the captures): Dwarf
units in jade, Goblins in hazard yellow, and so on.

## Engine and saves

The colour is derived in the client from the player's faction
(`factionColourV7`, `playerFactionColourV7`); nothing new is stored. The
engine still carries a seat `color` per player and `setup.humanColor`
(validated, distinct per seat, part of saves, replays and the release
corpus). The client never shows it. The setup form no longer offers it and
always sends `CORAL`, its old default; saves made with another choice load
and show the same faction colours. Removing the field is a stored-shape
change (an identity bump, every fixture and the release corpus), left for
a later engine bead.

## Weak spots

- **Mirror matches** (headless and test only, `allowDuplicateFactions`)
  show both players in one colour. The browser never launches or resumes
  one.
- **The Dwarf green on Grass** is the closest pair to the ground (31, and
  25 under a deficiency); the casing and its jade hue keep it a clear line
  in the captures.
- **Human crimson and Dinosaur orange** are the closest faction pair with
  normal vision (49): clear at a glance, but the nearest.

## Evidence

`npm run art:faction-colours-review -- --out DIR` captures the setup form,
two Showcases with four factions each (all seven between them) at desktop
and phone widths and zoom steps 1 and 0.75, their leaderboards, Showcase a
in the Classic look and in LEGACY, and the seven factions' territories side
by side over Mountain, Grass, Snow, Shallow and Deep Water
([`scripts/art/faction-colours/scene.ts`](../../scripts/art/faction-colours/scene.ts))
in all three looks.
