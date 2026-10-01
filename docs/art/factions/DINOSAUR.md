# Faction fragment: DINOSAUR

**Status:** approved by the root on 2026-10-01 (bead `pulp_wars-c87.6`),
under the user's delegation of art judgement for epic `pulp_wars-c87` (see
[Decisions](#decisions-approved-2026-10-01)). Written from
[FACTION_TEMPLATE.md](FACTION_TEMPLATE.md) under the rules in the
[README](README.md) and the precedent of [UNDEAD.md](UNDEAD.md) and
[GOBLIN.md](GOBLIN.md). Nothing has been generated yet.

The file is named after the runtime faction id `DINOSAUR`: the pipeline reads
layer 3 from `docs/art/factions/<faction>.md` for a batch manifest whose
`faction` is `DINOSAUR`, so edit the two `text` blocks under **Prompt
fragment** and **Negative fragment** here and nowhere else. The sprite bead
(`pulp_wars-c87.7`) copies the approved subject lines below into
`scripts/art/chibi/subjects/DINOSAUR.json`; it may still tune a line there
when the sample shows it needs it, within the rules of this document.

The roster and rules come from the root design brief in the notes of bead
`pulp_wars-c87.1`, which becomes the revision-19 Dinosaur spec. Patrol Boat,
Battleship and the embarked transport reuse the Human art.

## Identity

A pulp "lost world": cheerful cavemen and their big friendly dinosaurs, drawn
as the same chunky board-game pieces as the other three factions. Bone,
rawhide and black volcanic stone; huge heads, goofy grins, round eyes. A toy
box of dinosaurs, never a nature documentary: nothing realistic, scaly-scary
or gory. The faction theme is few, big bodies: eggs that hatch on the board
and beasts that grow as they win.

## Prompt fragment

55 words. It names only a mood, materials, surfaces, colours and small
motifs: no figure (not "dinosaur", "caveman" or "egg"), no skin or hide
colour, no fur and no place (no cave, camp or volcano). Dinosaur skin, fur
and eggs belong in the subject lines, because layer 3 also reaches cities,
portraits and icons, and Pixen draws every noun it is given: "fur" here
would make furry dinosaurs, and "scales" scaly tents.

```text
Faction: cheerful prehistoric lost-world storybook, playful and never scary.
Everything is made of chunky pale cream bone, pale cream rawhide and dark
basalt stone, lashed with charcoal grey cord, with knotted lashings, small
cream teeth and chipped flint edges as details; bone and rawhide are shaded
with cool grey, stone with darker blue-grey, never brown.
```

## Negative fragment

Metal, wheels and wood keep the stone-age era: every handle, pole, frame and
club is bone or stone, and wood drifts brown. Green skin vanishes on the
grass and belongs to the Goblins; lava, fire and orange sit on the key red,
Coral and Gold. Realism and gore words keep the tone friendly. `skull` and
`bones` are **not** excluded, unlike in the Goblin fragment: bone is this
faction's material. It ends with the red-brown drift words for a bone and
leather faction, plus the brown words hide and fur invite.

```text
metal, iron, steel, armour plates, sword, wheels, wood, timber, planks, logs,
straw, bricks, lava, fire, flames, orange glow, green skin, green scales,
lime green, teal, purple, realistic reptile, scary, blood, gore, brown fur,
brown hide, brown leather, tan, leopard spots, bronze, copper, rust, dark
brown shading, red-brown, maroon
```

## Palette

- **Owner colour:** only the shared key colour `#d8262c`, always on
  something **worn or painted**, never on a whole skin: blankets strapped
  over a back, cloth bands and collars, feather crests, a howdah banner, the
  cavemen's tunics and robes, and the two **frills** (Spitter, Triceratops),
  which are the faction's painted shields. A red-skinned dinosaur would stay
  under the 15% mask minimum, as red-plated robots and red orcs did. Every
  owner area is asked for as "plain bright red", flat and without pattern:
  patterned garments came back with dark spots that no owner recolours.
- **Hide and leather are pale, not brown.** Rawhide is pale cream, the same
  ramp as bone; cords, straps, hair and fur are charcoal grey. There is no
  tan, no brown and no "natural leather" anywhere. This is the allowed
  neutral: cream for surfaces, charcoal for lines.
- **Secondary colours (three):**

| Colour                            | Approximate values                                                                                                               | Used for                                                                            | Why it is safe                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dusty blue hide (one ramp)        | small beasts `#5b82b8` / `#3c5c8e`; big beasts `#4a6ea4` / `#2f4a78`; Brontosaurus `#7f9cc4` / `#56739c`; navy stripes `#2b3f66` | all dinosaur skin, egg speckles                                                     | Hue about 215°, in the widest gap between the player colours (Teal 172°, Violet 268°) and opposite the warm ones. It is far from grass `#8ab85c` and Goblin olive (66–90°), and clearly more saturated than Undead slate `#7f8ca0` and Goblin gunmetal `#6d7684`. It is mid-dark, so all four bright owner colours stand out on it. Nothing else on land is blue; the black outline separates it from water. |
| Bone and rawhide cream (one ramp) | `#efe6c8`, shaded cool grey `#a6abb5`                                                                                            | bellies, teeth, claws, horns, spikes, clubs, eggshell, tents, drums, the skull hood | Pale and nearly unsaturated, far lighter than Gold and Coral, as for Goblin cream and Undead ivory. Shaded cool grey so it never drifts to tan or Gold.                                                                                                                                                                                                                                                      |
| Basalt charcoal (one ramp)        | dark `#33363d`, mid `#5b616c`, light `#8e96a3`                                                                                   | volcanic stone, flint, cords and straps, cavemen's hair and beards                  | A neutral blue-grey, off every player colour and clearly not red or brown; small or dark areas only.                                                                                                                                                                                                                                                                                                         |

Light peach skin on the two cavemen is a small accent (face, arms, feet),
like the Human faces; it is not a faction colour. Black is the shared
outline and pupils.

**Why blue, and not the alternatives.** Green lizards vanish on the grass
and read as Goblins. Warm tan or sand is the brown drift itself and
disappears under a Gold owner's blanket. Ochre with stripes sits on Gold
`#e2b63f`. Purple-grey sits on Violet `#a277d2`. Plain slate is already the
Undead skin and the Goblin wolf. A clear dusty blue is the one free hue, and
gives the faction a tell at zoom 0.75 as green heads do for the Goblins:
**blue beasts with cream bellies**. The sample review must check a Teal and
a Violet owner at zoom 0.75; if blue skin reads as ownership there, deepen
it towards navy before trying another hue.

**Volcanic and jungle hints** come from materials, not colours: black basalt
stone for the volcanic side, feather crests and striped hides for the
jungle. No lava (red, orange) and no green fronds (grass, a fourth colour).

## Silhouette language

This guides the subject lines; it is not sent to PixelLab.

- **One body plan per unit.** No two Dinosaur units share a posture, and
  none has a rider, so none can be taken for cavalry: the Raptor runs on two
  legs with a level tail, the Spitter stands upright under a round frill,
  the Ankylosaurus is a dome, the Triceratops a lowered wedge of horns, the
  T-Rex a head on legs, the Brontosaurus a neck.
- **Friendly heads.** Big round eyes with black pupils, a grin or a sleepy
  smile, chunky cream teeth. No slit pupils, no snarl, no drool.
- **Smooth skin.** No fur and no scale texture; feathers only as the red
  crest. A few navy stripes on the Raptor's tail are the only skin pattern.
- **Teeth and claws are the weapons.** The unit class fragment asks for "one
  oversized signature weapon or tool"; every dinosaur recipe carries the
  `promptAddendum` `Its teeth, horns and claws are its only weapons; it holds
nothing and carries no rider.`
- **Against the Humans:** no helmets, steel, shields, horses or banners on
  poles in the hand. **Against the Undead:** bone is a prop, never a body;
  the only skull is the Shaman's hood, with a bearded peach face under it.
  **Against the Goblins:** nothing green, no ears, no scrap iron, no bombs.
- **"Small" is posture.** The Ankylosaurus shares the Guard's standard
  canvas; it fills the width and reaches a soldier's shoulders, with its
  tail club raised to head height (see [Decisions](#decisions-approved-2026-10-01)).
- **Settlements:** a bone-and-hide camp that grows under a giant rib-cage
  arch (see [Cities](#cities)); the neutral village stays shared.

## Subject lines

Approved lines for `scripts/art/chibi/subjects/DINOSAUR.json`, written like the Human,
Undead and Goblin lines. Units are keyed `UNIT:DINOSAUR:<ROLE>`, which the
renderer should ask for first and replace with the Human sprite plus a
faction badge while no raster is usable. Canvases follow the
[asset inventory](../CHIBI_ASSET_INVENTORY.md): standard 56 x 80, large
72 x 88, reward 88 x 104.

Lessons from [GOBLIN.md](GOBLIN.md#sprite-findings-bead-pulp_wars-0ao8)
applied up front: every owner area is "plain bright red"; every strap, cord
and handle has a named charcoal or cream colour; each line ends with a
"clearly …, not …" clause; low owner area has a named fix per unit; brown
that still appears is removed with a single-focus edit ("recolour the brown
… charcoal grey; change nothing else"), never a broad one.

**Caveman** (`FIGHTER`, standard unit 56 x 80):

```text
Subject: Caveman, a chunky cute friendly caveman with a huge round head about
half of the figure's height and a tiny sturdy body: light peach skin, a big
wild mane of charcoal black hair, a bushy charcoal black beard, thick
eyebrows and a big goofy grin, a bright red headband, a big plain bright red
fur tunic over one shoulder covering the chest, belly and legs down to the
knees, a charcoal grey cord belt with one cream tooth, a huge chunky cream
bone club with two round knobs raised in the right hand, bare peach arms and
big bare peach feet; simple shapes and very few details; clearly a caveman
with a giant bone, not a soldier.
```

`negativeAddendum`: `shield, helmet, sword, spear, bow, quiver, wooden club,
stone club, armour`. Low owner area: lengthen the tunic to the shins.

**Raptor** (`RAIDER`, large unit 72 x 88):

```text
Subject: Raptor, a chunky cute lean running raptor dinosaur, wide and low,
filling the whole width of the image: a big long-snouted head with big round
friendly eyes and a toothy grin of small cream teeth, a slim body leaning
forward on two strong hind legs, each foot with one big raised cream sickle
claw, two small clawed arms tucked at the chest, and a long stiff tail held
straight out behind; smooth dusty blue skin shaded darker navy blue, a few
dark navy stripes on the tail and a pale cream belly and throat; a tall
crest of bright red feathers from the top of the head down the back of the
neck, and a big plain bright red blanket strapped over its back with a
charcoal grey cord, hanging down both sides to the knees; simple shapes and
very few details; the feet are the lowest thing in the image; clearly a fast
two-legged runner, not a horse or a wolf.
```

`negativeAddendum`: `rider, saddle, reins, horse, wolf, wings, fur, sword,
spear`. Low owner area: add a fan of red feathers at the tail tip.

**Spitter** (`MARKSMAN`, standard unit 56 x 80):

```text
Subject: Spitter, a chunky cute small upright spitting dinosaur with a huge
round head about half of the figure's height and a short sturdy body on two
legs, the head and frill filling the whole width of the image: a wide round
neck frill spread open like a fan all round the head, the frill plain flat
bright red with a thin cream rim, dusty blue skin shaded darker navy blue
with a pale cream belly, two small cream crests on top of the head, big
round eyes, puffed cheeks and a pursed mouth spitting one small pale cream
blob forward, small clawed arms, a plain bright red cloth poncho over the
chest, belly and back down to the knees, a short tail, cream claws on the
feet; simple shapes and very few details; clearly a frilled spitter, not an
archer.
```

`negativeAddendum`: `bow, quiver, arrows, green spit, slime, umbrella, wings,
rider, sword`. If the red frill spreads onto the head, a single-focus edit
recolours the head dusty blue.

**Ankylosaurus** (`GUARD`, standard unit 56 x 80):

```text
Subject: Ankylosaurus, a chunky cute armoured dinosaur, a low round dome on
four short stubby legs, as tall as a soldier's shoulders and filling the
whole width of the image: a big blunt head held low at the front with big
round sleepy eyes, a small smile and two short cream cheek horns, a high
round domed back of dusty blue bony plates shaded darker navy blue with a
rim of chunky cream spikes all round its edge, a thick tail raised high
behind it ending in a huge round cream bone club, a pale cream belly; a big
plain bright red blanket lies over the middle of the dome between the spikes
and hangs down both sides to the ground, tied with a charcoal grey cord;
simple shapes and very few details; the feet are the lowest thing in the
image; clearly a living armoured dome with a tail club, not a turtle and not
a shield soldier.
```

`negativeAddendum`: `turtle, tortoise, shield, spear, rider, green shell,
wheels`. Low owner area: paint the tail club's ball plain bright red.

**Shaman** (`CAPTAIN`, standard unit 56 x 80). A whole skull mask would read
as the Undead Skeleton at zoom 0.75, so the skull is a hood above a bearded
face, and the drum (the War Drums ability) is the signature item:

```text
Subject: Shaman, a chunky cute old cave shaman with a huge round head about
half of the figure's height and a tiny sturdy body: light peach skin, a bushy
charcoal black beard and big friendly eyes, wearing the top half of a big
cream long-snouted beast skull as a hood, its toothy upper jaw sticking
forward over his brow like a cap peak, three tall bright red feathers
standing up behind the skull, a long plain bright red robe from the
shoulders down to the feet, a big round drum of pale cream rawhide on a dark
basalt grey frame hanging at his belly, a chunky cream bone drumstick raised
high in the right hand, a cream tooth necklace, bare peach feet; simple
shapes and very few details; clearly a drummer in a beast-skull hood, not a
skeleton and not a standard bearer.
```

`negativeAddendum`: `banner, flag, staff, megaphone, skeleton body, bone
arms, shield, sword, wooden drum, war bonnet`.

**Triceratops** (`CATAPULT`, large unit 72 x 88):

```text
Subject: Triceratops, a chunky cute stocky horned dinosaur on four thick
legs, clearly bigger than a soldier, filling the whole width of the image: a
huge head lowered to charge, about half of its whole length, with two long
cream brow horns pointing forward, one short cream nose horn and a cream
beak, small determined friendly eyes, and a big round bony neck frill
standing up behind the head, the frill plain flat bright red with a rim of
small cream studs; a heavy barrel body with dusty blue skin shaded darker
navy blue and a pale cream belly, a short thick tail; a plain bright red
blanket strapped over its back with a charcoal grey cord, hanging down both
sides; simple shapes and very few details; the feet are the lowest thing in
the image; clearly a charging three-horned beast, not a catapult and not a
rhinoceros.
```

`negativeAddendum`: `rider, howdah, catapult, wheels, rhinoceros, wings,
spikes on the back`.

**T-Rex** (`KNIGHT`, large unit 72 x 88):

```text
Subject: T-Rex, a chunky cute big tyrannosaur standing upright on two thick
legs, clearly bigger than a soldier: an enormous boxy head about half of its
whole height with huge open jaws, a row of big chunky cream teeth, big round
friendly eyes and a goofy grin, two tiny arms with two claws each held at
the chest, a fat body and a thick tail resting behind; dusty blue skin
shaded darker navy blue with a pale cream lower jaw and belly; a wide plain
bright red cloth collar round the neck, a big plain bright red blanket
strapped over the back and hips with a charcoal grey cord, hanging down both
sides to the knees, and two plain bright red cloth bands round the tail; big
three-toed feet with cream claws; simple shapes and very few details; the
feet are the lowest thing in the image; clearly a giant-jawed tyrant lizard
with tiny arms, not a dragon and not a knight.
```

`negativeAddendum`: `rider, saddle, wings, dragon, horns, back spikes,
frill, sword, lance, horse`. Low owner area: widen the collar into a bib
over the chest.

**Brontosaurus** (`JUGGERNAUT`, reward unit 88 x 104):

```text
Subject: Brontosaurus, a chunky cute giant long-necked dinosaur, much wider
and taller than a normal soldier: a huge round barrel body on four thick
pillar legs, a very long thick neck rising straight up to the top of the
image with a small round head, big sleepy friendly eyes and a gentle smile,
a long tail curling round its side; pale dusty blue skin shaded darker slate
blue with a pale cream belly and throat; three broad plain bright red cloth
bands round the neck, a huge plain bright red blanket draped over the back,
hanging down both flanks to the knees, and on top of it a small howdah of
cream bones and pale cream rawhide carrying one big bright red banner flag;
simple shapes and very few details; the feet are the lowest thing in the
image; clearly a gentle long-necked giant, not a dragon and not an elephant.
```

`negativeAddendum`: `rider, person, elephant, trunk, wings, dragon, tower,
wooden howdah`. The head must reach the top 8 px of the canvas, so the neck
stands well above the tile.

### Egg

One sprite for every Egg, whatever will hatch: the dock and tooltip name the
unit inside and the turns left. It is owned and masked like a unit and
bottom-centred on its tile, but small: **48 x 48**, about 60% of the tile
width, so it never looks like a unit. Its subject is `UNIT:DINOSAUR:EGG`, unless the engine spec (bead `pulp_wars-c87.1`) names the Egg differently,
with the `icon` recipe class (an item sprite, owned and masked, as for the
Rocket Cart portrait): the unit class would give it a face and feet.

```text
Subject: one big chunky egg standing upright in a small round nest: a pale
cream eggshell with a few big dusty blue speckles and one broad plain bright
red painted band round its middle, sitting in a low nest ring of pale cream
bones lined with a plain bright red cloth whose folds hang over the rim all
round; nothing else in the image.
```

`negativeAddendum`: `face, eyes, crack, hatching, baby, bird, chicken, straw,
twigs, brown nest, grass, feet`. Until the raster exists, and always in
LEGACY, the Egg is code-drawn: a cream ellipse with three blue-grey speckles,
an owner-colour band and a black outline.

### Portraits

`PORTRAIT:DINOSAUR:<ROLE>`, 48 x 48, owned and masked, the portrait class.
Each repeats its unit's head, owner item and tell. A bust hides the blanket,
so each line names what is red in the bust. Goblin portraits came back
pointing the opposite way to the map piece and no wording turned them: accept
either direction, but the same one for all eight.

```text
Subject: Caveman portrait, head and shoulders of a chunky cute friendly
caveman: a huge round head with light peach skin, a big wild mane of
charcoal black hair, a bushy charcoal black beard and a big goofy grin, a
bright red headband, a plain bright red fur tunic over one shoulder, and a
huge chunky cream bone club raised beside the head.

Subject: Raptor portrait, head and neck of a chunky cute raptor dinosaur: a
big long-snouted dusty blue head with a pale cream throat, big round
friendly eyes and a toothy grin of small cream teeth, a tall crest of bright
red feathers along the top of the head and neck, a plain bright red cloth
collar at the base of the neck, and one big cream sickle claw raised beside
the jaw; no rider.

Subject: Spitter portrait, head and neck of a chunky cute frilled spitting
dinosaur: a round dusty blue head with two small cream crests, big round
eyes, puffed cheeks and a pursed mouth, framed by a wide round neck frill
spread open like a fan, the frill plain flat bright red with a thin cream
rim, a pale cream throat.

Subject: Ankylosaurus portrait, a chunky cute armoured dinosaur shown whole
and small: a big blunt dusty blue head with sleepy eyes and two cream cheek
horns, a round dome of dusty blue plates rimmed with chunky cream spikes, a
plain bright red blanket over the middle of the dome, and a huge round cream
tail club raised behind.

Subject: Shaman portrait, head and shoulders of a chunky cute old cave
shaman: light peach skin, a bushy charcoal black beard and big friendly
eyes under the top half of a big cream long-snouted beast skull worn as a
hood, three tall bright red feathers behind it, plain bright red robe
shoulders and a cream bone drumstick raised beside the head.

Subject: Triceratops portrait, the head of a chunky cute horned dinosaur
seen from the front-right: two long cream brow horns, one short cream nose
horn, a cream beak and small friendly eyes on a dusty blue face, with a big
round neck frill standing up behind it, the frill plain flat bright red with
a rim of small cream studs.

Subject: T-Rex portrait, the head of a chunky cute big tyrannosaur: an
enormous boxy dusty blue head with huge open jaws, a row of big chunky cream
teeth, a pale cream lower jaw, big round friendly eyes and a goofy grin, a
wide plain bright red cloth collar round the neck and one tiny two-clawed
arm waving below.

Subject: Brontosaurus portrait, the head and long neck of a chunky cute
gentle long-necked dinosaur: a small round pale dusty blue head with big
sleepy eyes and a gentle smile on top of a thick neck rising from the bottom
of the image, a pale cream throat, and three broad plain bright red cloth
bands round the neck.
```

Dinosaur portraits add `negativeAddendum`: `rider, person, wings, fur`.

### Command icons

`ICON`, 48 x 48, unowned item sprites, so none uses red. Goblin shout lines
drifted to orange and gold: every line asks for pale cream marks and each
recipe adds `orange, gold, yellow, red, brown, hand, person` to its
`negativeAddendum`. Expect a single-focus recolour edit.

| Command   | Subject                      | Used by                                 |
| --------- | ---------------------------- | --------------------------------------- |
| Lay Egg   | `ICON:ACTION:LAY_EGG`        | city: lay an Egg                        |
| Hatch     | `ICON:ACTION:HATCH`          | Shaman                                  |
| Stampede  | `ICON:ACTION:STAMPEDE`       | Triceratops                             |
| War Drums | `ICON:ACTION:DINOSAUR:RALLY` | Shaman (the Dinosaur Rally, as WAAAGH!) |

```text
Subject: one big chunky pale cream egg with a few big dusty blue speckles,
standing upright in a low round nest ring of pale cream bones; nothing else
in the image.

Subject: one big chunky pale cream egg with dusty blue speckles splitting
open along a bold black zigzag crack, the top of the shell lifting like a
lid, a small round dusty blue baby snout with two big round eyes peeking
out, and three small cream shell chips flying off; nothing else in the image.

Subject: the lowered head of a charging horned beast seen from the side,
facing right: two long cream brow horns and one short cream nose horn
pointing right, a dusty blue face and a round dusty blue neck frill with a
cream rim, and three round pale cream dust puffs trailing behind on the
left; nothing else in the image.

Subject: one big round drum, a pale cream rawhide drumhead on a dark basalt
grey frame lashed with charcoal grey cord, with two chunky cream bone
drumsticks crossed above it and three short jagged pale cream beat lines
bursting upward; nothing else in the image.
```

The Shaman's Tend Wounded keeps the shared icon. Pounce, Rampage, Acid,
Armoured and Push are passive or already have a glyph: no new icon. The
Nesting unlock can show the Lay Egg icon.

### Cities

The Dinosaurs have their own city set, like the other factions:
`CITY:DINOSAUR:1..3` on the Human canvases (88 x 96, 96 x 100, 96 x 104),
the default bottom-centre anchor, the same overflow and an owner mask each,
resolved by the city owner's faction with the Human `CITY:<level>` as the
fallback. The neutral village stays shared.

- **Look:** cone tents of hide stretched over crossed tusks, a bone totem
  with a banner, standing stones of black basalt, and at level 3 one giant
  rib-cage arching over the whole camp. No wood, no bricks, no fire.
- **Owner colour** on tent hides, awnings and banners, each "one plain flat
  solid bright red surface with no pattern": tile and patch patterns
  speckled the Undead and Goblin masks.
- **No castle words.** "Fortress", "keep", "wall" and "watchtower" drew a
  grey stone castle with 9–13% owner area for the Goblins, so "stronghold"
  is not in the lines: the level 3 camp is big through the rib arch and the
  count of tents.
- **No volcano with lava.** Lava is red and orange and would enter the
  mask. The volcanic hint is the basalt; City 3 may add one small dark
  basalt cone with a pale grey smoke plume at the back if a sample holds it.
- **Expect a slab** under every text-to-image camp, and one ground-removal
  edit each.

```text
Subject: a small level-1 bone-and-hide camp: one tall totem pole of stacked
cream bones topped with a small horned beast skull and a big plain bright
red banner flag, and three chunky cone tents of plain flat solid bright red
hide stretched over crossed cream tusks pressed around its foot, and one
small dark basalt standing stone; wide and chunky, filling the whole width
of the image. Buildings only.

Subject: a medium level-2 bone-and-hide camp, with no castle: five chunky
cone tents of plain flat solid bright red hide over crossed cream tusks in
two sizes, one tall totem pole of stacked cream bones with a horned beast
skull and a big plain bright red banner flag, a dark basalt rock with a
round cave mouth hung with a plain bright red hide curtain, and a low fence
of curved cream tusks along the front with an open gap; wide and chunky,
filling the whole width of the image. Buildings only.

Subject: a large level-3 bone-and-hide camp, the biggest settlement, with no
castle: one giant cream rib-cage arching high over the whole camp like a
row of huge curved ribs, a huge horned cream beast skull over the open front
gate, big plain flat solid bright red hide awnings stretched between the
ribs, eight chunky cone tents of plain bright red hide in different sizes
underneath, two tall bone totem poles with big plain bright red banner
flags, and a ring of dark basalt standing stones; wide and chunky, filling
the whole image. Buildings only.
```

City recipes add `negativeAddendum`: `caveman, person, character, dinosaur,
animal, skeleton, castle, keep, battlements, brick, wooden hut, campfire,
lava`.

## Growth display

"Big" (1 kill) and "Alpha" (3 kills) need no extra rasters. Use a marker as
the cue that always reads, and a modest sprite scale as flavour.

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
- Overlays (HP bar, seat badge, markers) are drawn after the pieces and do
  not move, as for giants.
- On growing, the sprite pulses to x1.2 of its new size and settles over
  300 ms; reduced motion shows the new size and marker at once.

## Effects

All code-native first, unowned, and limited to white, cream `#efe6c8`, light
grey `#aeb6c2`, basalt grey `#5b616c` and charcoal `#33363d`. No red, orange,
gold, green, cyan or purple, so no cue reads as a player colour; dust is
never tan. Reduced motion freezes each cue at its midpoint.

| Cue            | Look                                                                                           | Animation                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Stampede run   | round pale cream-grey dust puffs, one per lane tile, behind the Triceratops                    | the sprite slides along the lane at about 90 ms a tile; each puff swells and fades over 250 ms    |
| Stampede hit   | a small spiky cream star flash and two dust puffs on the target                                | the target slides one tile when pushed (120 ms), then the Triceratops steps into the vacated tile |
| Egg laid       | the Egg sprite                                                                                 | pops in with one small bounce (150 ms)                                                            |
| Hatch          | a black zigzag crack across the shell, then six cream shell chips                              | the Egg wobbles twice (200 ms), cracks, the chips fly up and fade, the unit grows from x0.6 to x1 |
| Shaman's Hatch | two cream rings spreading from the Shaman's drum                                               | the rings reach the Egg, then the Hatch cue plays                                                 |
| Egg destroyed  | shell chips and one pale dust puff; no yolk, nothing wet                                       | the chips scatter and fade over 300 ms                                                            |
| War Drums      | cream concentric rings from the Shaman                                                         | the existing Rally cue                                                                            |
| Acid spit      | one pale cream blob with a charcoal outline; three small pale puffs on the target, never green | the blob arcs from the Spitter like the Bomb Chucker's bomb                                       |

A raster, if one follows, is a palette-mapped `effect` recipe without the
faction layer (see the
[pipeline](../CHIBI_PIPELINE.md#status-markers-and-effects)) on a checked-in
`dinosaur-dust` palette of the five colours above. The class-effect negative
fragment lists `fire` and `explosion`, so subjects describe puffs, chips and
rings.

## Roster notes

"Human", "Undead" and "Goblin" name the same role's unit that the silhouette
must read apart from.

| Role or building            | Canvas    | Owner colour on                                | Distinguishing silhouette                                                                                                                                |
| --------------------------- | --------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Caveman (`FIGHTER`)         | 56 x 80   | one-shoulder fur tunic to the knees, headband  | wild hair and beard, giant bone club raised, bare limbs, no shield (Human: helm, sword, shield; Undead: skull and shield; Goblin: sideways ears, dagger) |
| Raptor (`RAIDER`)           | 72 x 88   | back blanket both sides, feather crest         | riderless two-legged runner, sickle claws, long level tail (Human: rider on a pony; Undead: Ghoul on all fours; Goblin: wolf with a rider)               |
| Spitter (`MARKSMAN`)        | 56 x 80   | painted round frill, poncho                    | round fan frill behind the head, puffed cheeks, spit blob (Human: hood and longbow; Undead: floating Banshee; Goblin: raised bomb)                       |
| Ankylosaurus (`GUARD`)      | 56 x 80   | blanket over the dome to the ground            | low spiked dome, tail club raised to head height (Human: tower shield and spear; Undead: Zombie with arms out; Goblin: orc with a round shield)          |
| Shaman (`CAPTAIN`)          | 56 x 80   | long robe, three feathers                      | beast-skull hood with a jutting jaw, round drum, drumstick up (Human: banner; Undead: skull staff; Goblin: megaphone and horns)                          |
| Triceratops (`CATAPULT`)    | 72 x 88   | painted frill, back blanket                    | lowered head, three horns forward, round frill upright (Human: catapult arm; Undead: robed Lich; Goblin: rocket at 45°)                                  |
| T-Rex (`KNIGHT`)            | 72 x 88   | collar, blanket over back and hips, tail bands | upright, huge boxy jaws, tiny arms, thick tail (Human: knight on a horse; Undead: caped Vampire; Goblin: low buggy)                                      |
| Brontosaurus (`JUGGERNAUT`) | 88 x 104  | neck bands, back blanket, howdah banner        | long neck to the top of the canvas, barrel body, howdah (Human: hammer brute; Undead: stitched Abomination; Goblin: hunched Troll)                       |
| Egg                         | 48 x 48   | painted band, nest cloth                       | speckled egg in a bone nest, clearly smaller than any unit                                                                                               |
| Patrol Boat, Battleship     | Human art | Human art                                      | reused unchanged                                                                                                                                         |
| City 1–3                    | as Human  | tent hides, awnings, banners                   | bone-and-hide camp, totem, basalt stones, rib-cage arch at level 3 (Human: stone town; Undead: necropolis; Goblin: scrap camp)                           |
| Village                     | Human art | none (unowned)                                 | shared Human art                                                                                                                                         |

## Decisions (approved 2026-10-01)

The root approved this document and decided its open points:

- **Painted frills are allowed.** The Spitter's and Triceratops's frills are
  owner-colour paint: skin, but never the whole skin, and the only large
  flat area a standing Spitter has. Each also wears cloth.
- **The Ankylosaurus may move to the large canvas** (72 x 88) if the sample
  reads too small beside the Caveman: a low quadruped cannot fill 90% of the
  tile height as the chibi direction asks of standard units. The sprite bead
  then updates the [asset inventory](../CHIBI_ASSET_INVENTORY.md); it does
  not stretch the body.
- **Growth** reads through the chevron marker, with the optional sprite
  scale, as in [Growth display](#growth-display).
- **The Egg's subject key is `UNIT:DINOSAUR:EGG`** unless the engine spec
  (bead `pulp_wars-c87.1`) names the Egg differently; the sprite bead
  follows the spec.

Notes for the sprite bead (`pulp_wars-c87.7`):

- **Pipeline support.** `SUBJECT_PATTERN` in
  `scripts/art/chibi/batch-manifest.ts` accepts only `UNDEAD` and `GOBLIN`
  faction subjects today; the bead adds `DINOSAUR` for units, portraits,
  cities and the Rally icon, and the Egg's subject and recipe class.
- **Sample:** Caveman, Raptor and Brontosaurus (three body plans and three
  canvases), then City 1; compare with the other three factions at 1:1, x4
  and zoom 0.75 under all four owner colours.
- **Jungle and volcano** are only hinted (see [Palette](#palette)): green
  fronds and lava both break the colour rules.

## Checks for the sprite bead

- [x] The prompt fragment names no figure and no building.
- [x] Every material has a non-red, non-brown shading colour.
- [x] Every unit line puts red on something worn or painted that covers
      20–40%, never on the whole skin.
- [x] Feet, hands, cords, frames and clubs have non-brown colours.
- [x] Every city line ends "Buildings only." and fills the width, with
      figure words in the recipe's `negativeAddendum`.
- [ ] The sample (Caveman, Raptor, Brontosaurus, City 1) passes mask QA and
      reads apart from the other three factions at zoom 0.75.
