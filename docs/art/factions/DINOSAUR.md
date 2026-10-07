# Faction fragment: DINOSAUR

**Status:** rewritten for the
[new visual direction](../VISUAL_DIRECTION_2026-10.md#19-dinosaur-production)
in bead `pulp_wars-3tq.13`. The user reviewed the
[study](../VISUAL_DIRECTION_2026-10.md#18-dinosaur-study) on 2026-10-02: "go
with F, pattern per species, keep accent like it is, do spotted fur on the
caveman." The first version of this document (approved 2026-10-01, bead
`pulp_wars-c87.6`) described dusty blue beasts under owner-coloured blankets,
frills and tunics in the key red; that art is still in the game as the
[Classic look](#the-classic-look).

The art pipeline reads the two `text` blocks under **Prompt fragment** and
**Negative fragment** below as layer 3 of every Dinosaur prompt, so edit
them here and nowhere else. Recipes that were already generated keep the
request stored in their record (see the
[pipeline](../CHIBI_PIPELINE.md#fragment-changes-and-historical-records)).

The roster and rules come from the revision-19 Dinosaur spec (the design
brief of bead `pulp_wars-c87.1`). Patrol Boat, Battleship and the embarked
transport reuse the Human art.

## Identity

A pulp "lost world": cheerful cavemen and their big friendly dinosaurs,
drawn as the same chunky board-game pieces as the other three factions.
Huge heads, goofy grins, round eyes. A toy box of dinosaurs, never a nature
documentary: nothing realistic, scaly-scary or gory. The faction theme is
few, big bodies: eggs that hatch on the board and beasts that grow as they
win.

The faction wears **fixed colours**: deep blue hide with a navy back, a warm
cream belly, jaws and claws, tawny spotted fur on the two cavemen, and
exactly one hot accent, a red-orange. Each species has a body pattern of its
own. No sprite has an owner area or a mask. The player is read from the
seat-shaped plate under a unit or an Egg, the pennant on a city and the
territory border.

## Prompt fragment

It names only a mood, materials, surfaces, colours and small motifs: no
figure and no place or building. The recipes of batch `direction-dinosaur`
are edits, which send only their instruction, except the fresh creations of
the [Stegosaurus](#ninth-unit-the-stegosaurus-beads-pulp_wars-w4917-and-pulp_wars-2yc34)
and its portrait (bead `pulp_wars-2yc.34`), the first requests sent with this
fragment.

```text
Faction: cheerful prehistoric lost-world storybook, playful and never scary.
Their fixed colours: deep blue hide shaded dark navy, with warm cream
bellies, jaws, teeth, claws and bone; tawny fur with big dark brown spots;
dark basalt stone; and exactly one hot accent colour, a bright red-orange,
only on feathers, crests, frill markings, body patterns and war paint.
```

## Negative fragment

Metal and wheels keep the stone-age era. Red cloth is excluded because the
classic sprites wore it and red is the Human faction's colour; green skin
belongs to the Goblins and purple to the Undead. The last terms are the
study's findings on patterns: thin lines and many small marks are noise at
the size the game is played, and a frill must not become a solid accent
area.

```text
metal, iron, steel, armour plates, sword, wheels, lava, fire, flames, red
cloth, red cape, red blanket, red feathers, green skin, green scales, lime
green, teal, purple, realistic reptile, scary, blood, gore, fine scales,
many small spots, thin stripes, solid orange frill, orange fur
```

## Palette

Measured on the accepted masters
([`palette.json`](../../../art/pixellab/reviews/chibi-batch-direction-dinosaur/palette.json)
and
[`readability.json`](../../../art/pixellab/reviews/chibi-batch-direction-dinosaur/readability.json)).

| Role            | Colours                                                         | Share                                   | Used for                                                                                   |
| --------------- | --------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------ |
| Hide, lit       | `#205794` (T-Rex); `#30608f`, `#2f5595`                         | 23% of the six dinosaurs                | heads, flanks, limbs                                                                       |
| Hide, shade     | `#164271` (Raptor)                                              | (counted with the hide)                 | the shaded side                                                                            |
| Navy            | `#050949`, `#042651`, `#12173b`, `#2c2f5c`                      | 27% of the six dinosaurs                | the back, the tail top and far legs; the Ankylosaurus's plates; both frills                |
| Cream           | `#eddba1`, `#f7dda3`, `#fdeea4`                                 | 8% of the six dinosaurs                 | belly, throat, lower jaw, teeth, claws, horns, spikes, bone clubs, the skull               |
| **Red-orange**  | lit `#fe7500`; `#f35600`, `#fb5000`; shade `#a82f00`            | 14% of the dinosaurs, 5% of the cavemen | crests, spines, stripes, blotches, frill rays and rims, the tail club, feathers, war paint |
| Tawny fur       | `#a2804b`, `#b48a5c` (Caveman); `#c2924b`, `#90723f` (Shaman)   | 23% of the two cavemen                  | the pelt and the robe                                                                      |
| Fur spots, trim | `#7c593b`, `#371800`                                            |                                         | bold solid dark brown spots on the fur                                                     |
| Caveman skin    | `#fee598`, shade `#e59f4a`                                      |                                         | a light golden tan                                                                         |
| Egg             | shell `#fff3cf`, shade `#f5cb7f`; speckles `#fd8a00`, `#cf6501` |                                         | the Egg and the Lay Egg and Hatch icons                                                    |

Rules:

- **Blue is the faction's tell.** A dinosaur is a deep blue body with a
  cream belly; the deep blue of the study's variant F still reads as blue at
  native size, where its slate read as near-black.
- **One accent, as PixelLab draws it.** The red-orange is kept as generated
  (the user: "keep accent like it is"): there is **no accent step** in the
  pipeline for this faction and no remap to amber. Its mean hue is 21° to
  29° on the eight units (`readability.json`); a test holds every sprite
  between 18° and 34°.
- **The accent is a pattern or a part, never a whole sprite.** It is 9% to
  23% of a dinosaur (the striped Raptor is the most) and 9% or less of a
  caveman. Neither frill is a solid orange disc.
- **Fur is duller and darker than skin.** The Caveman's pelt differs from
  his skin by 37 (CIE76; the study's spotted pelt differed by 3.5), and
  from the Gold plate by 36. "Ochre" and hex values came back as a saturated
  orange, which made the pelt an accent area; the accepted fur is that
  orange recoloured to "a dull sandy brown … not orange and not yellow".
- **No red, no green, no purple.** A few key-red pixels remain as a tongue,
  an eye or the Raptor's gums (under 2% of any sprite).

## A pattern per species

The user asked for one pattern per species, not one for the faction. Each is
bold enough to read at native size and at zoom 0.75 (fat solid marks; no
thin lines and no ring-shaped spots).

| Species      | Pattern                                                                                    | Accent share |
| ------------ | ------------------------------------------------------------------------------------------ | ------------ |
| Raptor       | orange tiger stripes, fat wedges from the spine, on the back and tail; a tall orange crest | 23%          |
| T-Rex        | an orange brow crest and back spines; fat orange stripes on the tail and behind the neck   | 9%           |
| Brontosaurus | big solid orange blotches along the neck, back, flank and tail                             | 16%          |
| Ankylosaurus | navy armour plates in bands under a cream spike rim; an orange tail club                   | 9%           |
| Spitter      | a navy frill with orange ray stripes and an orange rim, like a sun; the body is plain      | 12%          |
| Triceratops  | a navy frill with a thick orange rim and two solid orange eye-spots; the body is plain     | 14%          |
| Caveman      | a tawny pelt with bold dark brown spots, a tooth necklace, orange war paint on the cheeks  | 1%           |
| Shaman       | a tawny spotted robe, a cream beast-skull hood with three orange feathers, heavy war paint | 9%           |

The Triceratops has no navy bands on its body (the root's default): navy on
deep blue differs by 36 and reads as "a darker animal", as the study's
variant C showed, and the edit that asked for them drew none. Its frill
field is navy, not the hide's blue, so the deep blue face reads in front of
it. The two predators share stripes, as the root's default says; their
silhouettes and the Raptor's crest tell them apart.

## Silhouette language

This guides the subject lines; it is not sent to PixelLab.

- **One body plan per unit.** No two Dinosaur units share a posture, and
  none has a rider, so none can be taken for cavalry: the Raptor runs on two
  legs with a level tail, the Spitter stands upright under a round frill,
  the Ankylosaurus is a dome, the Triceratops a lowered wedge of horns, the
  T-Rex a head on legs, the Brontosaurus a neck.
- **Friendly heads.** Big round eyes with black pupils, a grin or a sleepy
  smile, chunky cream teeth. No slit pupils, no snarl, no drool.
- **Smooth skin.** No fur and no scale texture on a dinosaur; feathers only
  as the Raptor's crest and the Shaman's headdress.
- **Nothing worn by a dinosaur.** The blankets, capes, scarves, ponchos,
  collars and bands of the classic sprites are gone; teeth, horns and claws
  are the weapons.
- **Against the Humans:** no helmets, steel, shields or horses. **Against
  the Undead:** bone is a prop, never a body; the only skull is the Shaman's
  hood, with a bearded golden face under it. **Against the Goblins:** nothing
  green, no ears, no scrap iron; the Caveman's fur is lighter than Goblin
  leather (by 21) and spotted.
- **Settlements:** a bone-and-hide camp that grows under a giant rib-cage
  arch (see [Cities](#cities)); the neutral village stays shared.

## Roster

Batch
[`direction-dinosaur`](../../../scripts/art/chibi/batches/batch-direction-dinosaur.json).
Every unit is an `edit-image-pixen` chain on its accepted classic sprite, so
the canvas, the anchor and the footprint are unchanged. The subject lines
(keys `UNIT:DINOSAUR:<ROLE>/PRIMAL` and `PORTRAIT:DINOSAUR:<ROLE>/PRIMAL` in
[`subjects/DINOSAUR.json`](../../../scripts/art/chibi/subjects/DINOSAUR.json))
describe the result, for a fresh creation if one is ever needed; the keys
without `/PRIMAL` are the classic lines.

| Unit (role)                 | Canvas   | Accepted recipe                          | What it shows                                                                                                 |
| --------------------------- | -------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Caveman (`FIGHTER`)         | 56 x 80  | `caveman-pelt-edit-a`                    | golden skin, black hair and beard, a tawny spotted pelt, a tooth necklace, orange war paint, a bone club      |
| Raptor (`RAIDER`)           | 72 x 88  | `raptor-deep-stripes-b` (the study's F)  | deep blue, navy back, cream belly, an orange feather crest, orange tiger stripes on the back and tail         |
| Spitter (`MARKSMAN`)        | 56 x 80  | `spitter-hide-edit-a`                    | deep blue, cream belly, a navy frill with orange rays and rim, two cream crests                               |
| Ankylosaurus (`GUARD`)      | 56 x 80  | `ankylosaurus-hide-edit-b`               | a dome of navy plates with a cream spike rim, a deep blue head and legs, an orange tail club                  |
| Shaman (`CAPTAIN`)          | 56 x 80  | `shaman-skin-edit-a`                     | a cream beast-skull hood with three orange feathers, golden skin with war paint, a tawny spotted robe, a drum |
| Triceratops (`CATAPULT`)    | 72 x 88  | `triceratops-face-edit-a`                | deep blue face and body, a navy frill with an orange rim and two eye-spots, cream horns and beak              |
| T-Rex (`KNIGHT`)            | 72 x 88  | `t-rex-deep-stripes-a` (the study's F)   | deep blue, cream jaw and belly, orange brow and back spines, orange stripes on the tail                       |
| Brontosaurus (`JUGGERNAUT`) | 88 x 104 | `brontosaurus-spots-edit-a`, candidate 1 | deep blue, cream throat and belly, big orange blotches on the neck, back, flank and tail                      |
| Patrol Boat, Battleship     | Human    | (unchanged)                              | shared ships with the player-coloured sail                                                                    |

Each unit has a 48 x 48 portrait (`chibi-direction-portrait-dinosaur-<unit>`)
edited from its classic portrait. A body pattern does not fit a bust: the
portraits carry the hide, the crest, frill or feathers, and at most a few
marks on the neck.

### Egg

`UNIT:DINOSAUR:EGG` is one 48 x 48 sprite for every unit's Egg
(`chibi-direction-dinosaur-egg`, recipe `egg-primal-edit-a`): a warm cream
shell with bold orange speckles in a nest of straw and bone. The painted
band and the nest cloth, which carried the owner's colour, are gone. The
owner is shown by:

- the **plate** under the nest: the Egg stands on a plate about as wide
  as a large unit's (58 master px, `DIRECTION_EGG_PLATE_RADIUS_SHARE_V7`),
  in the seat's shape and colour, whose ends show on both sides of the nest
  (the nest fills the 48 px canvas, and the 31 px plate that the sprite's
  height would give it is hidden under it);
- the **ring of the countdown chip**, in the owner's colour, as before;
- the territory border of the city it was laid beside.

The countdown number is cream on a charcoal chip and is unchanged.

### Command icons

Lay Egg and Hatch show the new Egg (orange speckles; the hatchling's snout
is deep blue), and Stampede the new Triceratops (a navy head in a frill with
an orange rim): `chibi-direction-icon-action-{lay-egg,hatch,stampede}`. None
of the classic icons carried a player colour; these three are converted so
the interface shows the same Egg and hide as the board. War Drums (a rawhide
drum on a basalt frame) has neither and is unchanged.

## Cities

The camps keep their classic shapes, canvases and footprints: each is an
edit of the accepted classic city (the `settlement` class, as for the
Goblins). The red tent hides, awnings and banner flags are gone: the tents
are dull tawny hide with a few dark brown spots and small orange feathers on
their tips, and the banner cloth is removed. The owner's pennant is drawn in
code at a recorded anchor (`DIRECTION_FLAG_ANCHORS_V7`), with the seat
shape, gold for the capital.

| Level | Asset                             | Canvas   | What it shows                                                                    | Pennant                                    |
| ----- | --------------------------------- | -------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| 1     | `chibi-direction-dinosaur-city-1` | 88 x 96  | four tawny spotted tents round a bone totem with a horned skull                  | on a short pole over the totem's skull     |
| 2     | `chibi-direction-dinosaur-city-2` | 96 x 100 | five tawny tents, the skull totem, a tusk fence, two basalt standing stones      | at the top of the camp's own bare pole     |
| 3     | `chibi-direction-dinosaur-city-3` | 96 x 104 | the giant rib-cage and horned skull over tawny awnings and tents, a basalt tower | on a pole at the rib-cage's right shoulder |

The neutral village (`SITE:VILLAGE`) is the shared one.

## Growth display

"Big" (1 kill) and "Alpha" (3 kills) need no extra rasters, in the new look
as before. A marker is the cue that always reads, and a modest sprite scale
is flavour.

- **Marker (required, both art sets).** A vector rank chevron in the slot of
  the Veteran `◆` (right of the HP bar; grown dinosaurs never promote, so the
  slot is free): **one** upward chevron for Big, **two** stacked for Alpha.
  Cream `#efe6c8` with a 1 px black outline, 10 CSS px wide at zoom 1,
  scaled and clamped like the other status text. Shape carries the meaning,
  not colour, so it holds in high contrast and for every owner colour. The
  dock and tooltip say "Big" or "Alpha" in words.
- **Sprite scale (CHIBI only).** Draw the same master larger about its
  anchor, so the feet stay on the tile: Big x1.125, Alpha x1.25, capped so
  the drawn width never exceeds 96 CSS px at zoom 1 (the city side-overflow
  limit).

| Canvas           | Base     | Big                   | Alpha                 |
| ---------------- | -------- | --------------------- | --------------------- |
| standard 56 x 80 | 56 x 80  | 63 x 90 (x1.125)      | 70 x 100 (x1.25)      |
| large 72 x 88    | 72 x 88  | 81 x 99 (x1.125)      | 90 x 110 (x1.25)      |
| reward 88 x 104  | 88 x 104 | 96 x 113 (cap, x1.09) | 96 x 113 (cap, x1.09) |

- The Brontosaurus hits the cap at Big, which is why the marker, not the
  scale, is the rule. The scale multiplies with the garrison scale (0.75) on
  a settlement centre.
- Smoothing follows the garrison rule: off when the scaled sprite lands on
  whole device pixels, on otherwise. Never bake a second raster.
- Overlays (HP bar, markers) are drawn after the pieces and do not move, as
  for giants.
- On growing, the sprite pulses to x1.2 of its new size and settles over
  300 ms; reduced motion shows the new size and marker at once.

The patterns hold when scaled: the stripes, blotches and frill marks are
several pixels wide, so a sprite drawn at x1.125 or x1.25 with smoothing
keeps them. The study's suggestion of an Alpha-only raster with a second
mark was not taken up (see
[Decisions](#decisions)).

## Effects

All code-native, unowned, and limited to white, cream `#efe6c8`, light grey
`#aeb6c2`, basalt grey `#5b616c` and charcoal `#33363d`. No red, orange,
gold, green, cyan or purple, so no cue reads as a player colour; dust is
never tan. Reduced motion freezes each cue at its midpoint. **They are
unchanged in the new look:** none carried a player colour, and pale cream
and grey read against deep blue, navy and orange better than against the
classic red blankets.

| Cue            | Look                                                                                           | Animation                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Charge run     | round pale cream-grey dust puffs, one per lane tile, behind the charging unit                  | the sprite slides along the lane at about 90 ms a tile; each puff swells and fades over 250 ms    |
| Charge hit     | a small spiky cream star flash and two dust puffs on the target                                | the target slides one tile when pushed (120 ms), then the attacker steps into the vacated tile    |
| Egg laid       | the Egg sprite                                                                                 | pops in with one small bounce (150 ms)                                                            |
| Hatch          | a black zigzag crack across the shell, then six cream shell chips                              | the Egg wobbles twice (200 ms), cracks, the chips fly up and fade, the unit grows from x0.6 to x1 |
| Shaman's Hatch | two cream rings spreading from the Shaman's drum                                               | the rings reach the Egg, then the Hatch cue plays                                                 |
| Egg destroyed  | shell chips and one pale dust puff; no yolk, nothing wet                                       | the chips scatter and fade over 300 ms                                                            |
| War Drums      | cream concentric rings from the Shaman                                                         | the existing Rally cue                                                                            |
| Acid spit      | one pale cream blob with a charcoal outline; three small pale puffs on the target, never green | the blob arcs from the Spitter like the Bomb Chucker's bomb                                       |

The Charge!, Acid and Armoured previews are chips and outlines shared with
the other factions' previews and are unchanged.

**LEGACY and missing rasters.** A Dinosaur unit or portrait shown with Human
art wears the Dinosaur badge: a dusty-blue three-toed footprint on a
charcoal disc with a cream rim on the board (`drawDinosaurBadgeV7`). In the
interface the `dinosaur` glyph of `ui-icons-v7.ts` and the faction's chips
are amber ink on a pale fill ([interface style](../../ui/STYLE.md)). The Egg has no Human counterpart and
never wears it; in LEGACY the board and the dock draw a code-native Egg with
a band in the owner's colour.

## What is live

The default look of the CHIBI art set draws all of the above for a Dinosaur
player: units and Eggs on the board, the selection dock, portraits on the
Lay Egg cards, the Hatch card and the technology tree, the three command
icons, Help and the cities. A raster that fails to load falls back to the
classic asset of that piece. After this bead every land unit, portrait and
city of the four factions has fixed colours; only the shared ships keep an
owner-coloured sail.

Review evidence: `npm run art:chibi-dinosaur-direction-review` writes
[`art/pixellab/reviews/chibi-batch-direction-dinosaur/`](../../../art/pixellab/reviews/chibi-batch-direction-dinosaur/)
(see the [pipeline](../CHIBI_PIPELINE.md#review-evidence)).

### Open for the art queue since the Dinosaur pass

The Dinosaur pass (`pulp_wars-w49.15`, `7r53`,
[its record](../../product/RULESET_7_TUNING_DINOSAUR.md)) generated no
asset and added no stand-in raster. What it leaves for an art bead:

- **Pack Hunt** (the Caveman's +1 Attack against a unit next to one of
  its owner's dinosaurs) has no icon and no board marker. It is stated in
  words on the Caveman's card and the Help page, and it is in the attack
  preview's number. A small status icon in the family of the other
  ability icons (two Cavemen's clubs around a claw mark, say) would let
  the preview name it. Since the pass's correction a unit one of the
  player's dinosaurs attacked this turn is **hunted** until End Turn (a
  Caveman has Pack Hunt against it wherever it stands): the attack
  preview says "Pack Hunt +1", and the board has no marker for a hunted
  unit. A small mark on the unit (the same icon) is the art and UI work
  it would need.
- **Wallbreaker** now also unlocks the second tile of the Triceratops's
  run-up. Its technology icon is unchanged.
- **The Chopping Block** (the Dinosaur look of the Sawmill): the pass's
  [finding](../../product/RULESET_7_TUNING_DINOSAUR.md#43-the-chopping-block)
  is that the raster (`chopping-block-b`) reads as a Lumber Camp (its
  technology is displayed as "Timber" and the tree says "Build Chopping
  Block" since the correction; the raster is unchanged) (an axe
  in a stump, split logs), next to which it must stand; that its axe head
  is smooth grey and reads as metal; and that it is busier and more
  saturated than the redrawn shared buildings
  ([the buildings record](../FACTION_BUILDINGS.md)). A new raster should
  show the work a mill does and a Lumber Camp does not (stacked, squared
  timber; a chopping frame; a pile of planks), with a knapped stone
  blade.

### The Classic look

The developer option "Classic look (previous art)" and the LEGACY art set
are unchanged. The Classic look draws the first Dinosaur art (batches
`dinosaur`, `5-dinosaur`, `cities-dinosaur`): dusty blue beasts and
peach-skinned cavemen with blankets, capes, frills, tunics, tents and
banners in the owner's colour through a mask, and the Egg with a painted
band. Their records keep the prompt fragment they were generated with
(pale cream bone and rawhide, basalt, charcoal cord, "never brown", the key
colour `#d8262c` on something worn or painted). That fragment is no longer
the faction's: a new classic-style asset would need it restored in an
exploration run. `npm run art:chibi-dinosaur-review` still reviews those
batches, with the live piece beside each.

## Decisions

Approved on 2026-10-01 and still in force:

1. **One body plan per unit, no riders,** and friendly heads.
2. **The Ankylosaurus stays on the standard canvas** (56 x 80).
3. **Growth** reads through the chevron marker, with the sprite scale, as
   in [Growth display](#growth-display).
4. **The Egg's subject is `UNIT:DINOSAUR:EGG`:** one sprite for every unit's
   Egg.
5. **Effects** are code-native and unowned.

The user's, on 2026-10-02:

6. **Variant F:** deep blue hide, navy back, cream belly, jaws and claws.
7. **The accent stays as PixelLab draws it,** a red-orange; no amber remap.
8. **One pattern per species.**
9. **Spotted fur on the Caveman** (and the Shaman).
10. **Fixed faction colours:** no owner area and no mask anywhere.

Decided in bead `pulp_wars-3tq.13` (each is described in the
[production section](../VISUAL_DIRECTION_2026-10.md#19-dinosaur-production)):

11. **The patterns** of the table above; the Triceratops has no body bands.
12. **Both frills are navy** with orange marks, never orange discs.
13. **No accent step:** the hue is consistent enough as generated (21° to
    29°).
14. **Fur:** a dull tawny, reached by recolouring the orange that PixelLab
    draws for "ochre"; bold dark brown spots; a tooth necklace on the
    Caveman.
15. **Shaman:** heavy orange war paint and three orange feathers mark him
    as the leader; his robe is one step lighter than the Caveman's pelt.
16. **Egg:** cream with orange speckles in a straw and bone nest, on a
    plate as wide as a large unit's.
17. **Icons:** Lay Egg, Hatch and Stampede follow the new Egg and hide; War
    Drums is unchanged.
18. **Cities:** converted by edits of the classic camps (same canvases),
    with dull tawny tents, orange feather tips and a code-drawn pennant.
19. **Effects, previews and the growth display** are unchanged; no
    Alpha-only raster.

## Ninth unit: the Stegosaurus (beads `pulp_wars-w49.17` and `pulp_wars-2yc.34`)

Ruleset `7r55` gives every faction a ninth land unit ([what was
built](../../product/RULESET_7_NINTH_UNIT.md)). The Dinosaur one is the
**Stegosaurus** (engine role `CATAPULT`), the siege unit. It was drawn as the
Ankylosaurus under a steel disc lettered **S** until bead `pulp_wars-2yc.34`
gave it its own art.

- **Art slot.** `UNIT:DINOSAUR:SWORDSMAN` and `PORTRAIT:DINOSAUR:SWORDSMAN`,
  the ninth art slot of the faction (`unitArtRoleV7` in
  `src/assets/chibi-art-v7.ts`): `chibi-direction-dinosaur-stegosaurus`
  (72 x 88, `LARGE_UNIT`, default anchor: the siege role's canvas, the
  Triceratops's) and `chibi-direction-portrait-dinosaur-stegosaurus` (48 x 48,
  `icon` recipe class), fixed colours, no mask, no accent step. Recipes
  `stegosaurus-*` and `portrait-stegosaurus-*` in batch `direction-dinosaur`;
  9 PixelLab calls.
- **Sprite** (`stegosaurus-a-fins`, 66 x 63 px, feet on row 75): a level
  four-legged body in the roster's deep blue with a cream belly, a row of
  bright orange back fins, a round snout, and the tail swung up high with a fan
  of cream spikes. A fresh creation in the side view the quadrupeds use
  (`"view": "side", "direction": "east"`), the first use of this faction's
  fragment, then four edits.
- **Told apart at board size:** the Ankylosaurus is a low navy dome with an
  orange tail club; the Triceratops a navy frill with two orange eye-spots and
  horns; the Stegosaurus is the only one with a saw of orange fins along its
  back and a raised spiked tail.
- **Portrait** (`portrait-stegosaurus-a-blue`): the whole animal, small, like
  the Ankylosaurus's portrait, since the fins and the tail are what tell it
  apart; a fresh creation recoloured to the sprite's blue and orange.
- **No boulder.** The first description had a boulder flying off the tail. A
  projectile is not baked into a sprite (the board draws shots), so the read is
  the raised tail and its spikes.
- **The Egg** is the shared Egg sprite, as for every dinosaur: no Egg art was
  made. Big and Alpha are the board's growth marks.
- **Key colour.** 0.9% of the sprite lies in the owner key's band (the mouth);
  the roster's limit is 2%. The first accepted step (`stegosaurus-a-snout`) had
  2.25%, from an orange smear on the neck shaded in red.
- **Light.** `lighting-qa`: the sprite is lit from the left (faces +1.9); the
  portrait reads -5.8, where its dark head is at the right.
- **Rejected.** `stegosaurus-a`: a grey slate hide with brown spots, an orange
  smear on the neck and a nose horn; `-b`: the same grey with a spiky ruff and
  a horn, a Triceratops cousin; `-a-blue`: the horn stayed; `-a-snout`: the red
  on the neck; `-a-neck`: the edit paled the fins to peach. Portraits: slate
  blue with dark red fins (`-a`), a horned grey one (`-b`).
- **What worked:** "Change only one thing: erase the pointed cream horn …"
  removed the horn first time; a recolour that names the hide by hex value
  moved a grey slate to the roster's blue; an edit that erased the neck marks
  also paled the fins, and a second recolour with hex values for the fin and
  its shadow side (`#f47b20`, `#c9540f`) brought the orange back without red.
- LEGACY (`?art=legacy`) and the developer option "Classic look" have no
  Stegosaurus art: there it falls back like every faction subject, to the
  Human unit of the slot under the Dinosaur badge.

The Triceratops is the heavy line role now (`SWORDSMAN`); its rasters, prompts
and generation records stay under the art slot they were made for,
`UNIT:DINOSAUR:CATAPULT` and `PORTRAIT:DINOSAUR:CATAPULT`.
