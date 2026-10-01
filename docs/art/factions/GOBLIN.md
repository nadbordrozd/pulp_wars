# Faction fragment: GOBLIN

**Status:** approved by the root on 2026-09-30 (bead `pulp_wars-0ao.10`),
under the user's delegation of art judgement for epic `pulp_wars-0ao`.
Written from
[FACTION_TEMPLATE.md](FACTION_TEMPLATE.md) under the rules in the
[README](README.md) and the precedent of [UNDEAD.md](UNDEAD.md).

The file is named after the runtime faction id `GOBLIN`: the pipeline reads
layer 3 from `docs/art/factions/<faction>.md` for a batch manifest whose
`faction` is `GOBLIN`, so edit the two `text` blocks under **Prompt
fragment** and **Negative fragment** here and nowhere else. The sprite bead
(`pulp_wars-0ao.8`) copied the subject lines below into
`scripts/art/chibi/subjects/GOBLIN.json` unchanged; what the sample taught
went into recipe addenda and edits instead (see
[Sprite findings](#sprite-findings-bead-pulp_wars-0ao8)).

The roster and rules come from the
[revision-17 Goblin spec](../../product/RULESET_7_REVISION_17_GOBLINS.md)
(sections 2.3, 3, 6, 7 and 11.4). Patrol Boat and Battleship reuse the Human
art ([section 3](../../product/RULESET_7_REVISION_17_GOBLINS.md#3-goblin-roster)).

## Identity

Scrappy pulp goblins, big orcs and one enormous troll, drawn as the same
chunky board-game pieces as the Humans and Undead. They are loud, cheeky and
ramshackle: dented scrap, patched cloth, rickety home-made vehicles and a
deep love of things that go bang. Funny and rowdy, never grim, gory or
menacing. The faction theme is the horde: cheap Goblins, gang attacks and
explosions that hit friend and foe alike.

## Prompt fragment

58 words. It names only a mood, materials, surfaces, colours and small
motifs: no figure (not even "goblin", "orc" or "troll"), no skin, no bombs
and no place or building. Skin colours and bombs belong in the subject
lines, because layer 3 also reaches portraits and icons, and Pixen draws
every noun it is given.

```text
Faction: rowdy, ramshackle scrap-heap storybook, loud and silly, never grim.
Everything is made of dented riveted scrap iron plates, patched cloth and
soot-black leather straps, with bolts, small spikes, square stitched patches
and soot smudges as details; iron is shaded with darker blue-grey, leather
with charcoal grey, cloth with a deeper tone of its own colour, never brown.
```

## Negative fragment

Firearms and modern vehicle parts keep the era: Goblin bangs come only from
round bombs and rockets. Wood is excluded because every Goblin handle,
wheel, frame and club is iron or stone, and wood drifts brown. Skulls and
bones belong to the Undead. Glows and lime green sit close to the Teal and
Violet player colours or to the grass. It ends with the red-brown drift
words the dry run needed for a metal and leather faction; **rust** stays
here as a drift word even though the Goblins are scrappy (see
[Palette](#palette)).

```text
gun, rifle, pistol, musket, cannon, modern car, rubber tyres, chrome,
headlights, neon, glowing green, lime green, cyan glow, purple magic glow,
skull, bones, blood, gore, horror, wood, timber, planks, brown boots, brown
leather, brown cloth, tan, bronze, copper, rust, orange rust, dark brown
shading, red-brown, maroon
```

## Palette

- **Owner colour:** only the shared key colour `#d8262c`, on a patched
  garment that covers the torso and legs (tunic, smock, saddle blanket) plus
  a bandana, cap or cape, and on the two vehicles' big painted parts (the
  rocket and the buggy's body panels, like the Human Knight's barding).
  Never on skin: a red-skinned orc would stay under the 15% mask minimum.
  Every owner garment carries a few square patches with black cross
  stitches; the patches are the same red, so the owner area stays big and
  flat.
- **Scrappy without rust.** Rust is red-brown, which the
  [README](README.md#the-faction-fragment-must) forbids as a secondary
  colour and lists as a drift word. The scrap look comes from dents, rivets,
  bolts, mismatched plates, spikes and soot, never from orange-brown
  corrosion. Leather is soot-black or charcoal, never brown.
- **Secondary colours (three):**

| Colour                             | Approximate values                                                                                                                            | Used for                                                                     | Why it is safe                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Olive skin (one ramp, three tones) | goblin yellow-olive `#9aa83e` / `#6c7a2a`; orc grey-olive `#6f7a52` / `#4d5639`; troll stone grey-green `#8a9488` / `#5f685e`; moss `#56642c` | skin (tone by species), small moss patches on the Troll                      | The grass is `#8ab85c` with `#557f3c` shading. Goblin skin is yellower (hue about 66° against about 90°) and orc and troll skin much greyer, so heads never merge with the grass, and the black outline separates them. All are far from the blue-green Teal `#28b7a4` and darker and greener than Gold `#e2b63f`. Never lime. |
| Gunmetal scrap (one ramp)          | dark `#3a4250`, mid `#6d7684`, light `#aeb6c2`; charcoal `#33363d`                                                                            | iron plates, blades, shields, helmets, wheels, the wolf's fur, leather, soot | A desaturated blue-grey, off every player colour and clearly not red or brown. The dark end contrasts with grass by value.                                                                                                                                                                                                     |
| Cream and spark white (accents)    | cream `#efe6c8`, spark core `#fff8d0`                                                                                                         | tusks, teeth, eyes, horns, fuses, the fuse spark                             | Pale and nearly unsaturated, far lighter than Gold and Coral. Fuse sparks stay small and pale yellow-white, never orange, so they cannot read as a Coral or Gold owner.                                                                                                                                                        |

Black is the shared outline, the pupils and the round bombs; it does not
count as a secondary colour. Nothing is red, red-brown, orange or brown.

## Silhouette language

This guides the subject lines; it is not sent to PixelLab.

- **Species by shape.** Goblins are hunched and slight, with long pointed
  ears sticking straight out sideways (wider than the head: the faction's
  signature at zoom 0.75), a long pointy nose and a jagged grin. Orcs are
  broad and heavy, fill the whole canvas width, and have small ears, a heavy
  jaw and two tusks jutting up from an underbite. The Troll is a giant
  hunched lump with very long arms, a huge drooping nose and moss.
- **"Small" is posture, not pixels.** Goblins still fill 90–110% of the
  tile height, as the [chibi direction](../CHIBI_ART_DIRECTION.md#3-geometry-and-resolution)
  requires: they read small through the hunch, the thin limbs and the
  oversized ears and head, and beside the broad orcs. Every goblin line asks
  for the head and ears to fill the whole width.
- **Against the Humans:** no crested or great helms, no tower shields, no
  bows, no horses, no banners. **Against the Undead:** no bone, no skulls, no
  pale blue glows, no torn zigzag hems (Goblin hems are straight with square
  patches), and the heads are green, not ivory or blue-grey.
- **Iron and stone, never wood.** Blades are chunky and jagged, shields are
  round dented plates, wheels are spiked iron, the Troll's club is stone.
- **Bombs belong to the Bomb Chucker** (and the Kaboom icon): no other unit
  carries a bomb, so the one raised bomb stays its tell. The Goblin's own
  Kaboom needs no prop.
- **Settlements:** shared with the Humans (see
  [Cities and villages](#cities-and-villages)).
- **Portraits (bead `pulp_wars-0ao.8`, batch `5-goblin`):** each
  `PORTRAIT:GOBLIN:<ROLE>` line in `scripts/art/chibi/subjects/GOBLIN.json`
  repeats its unit's head, owner garment and signature item as a
  head-and-shoulders bust (the Rocket Cart and Scrap Buggy whole). The dock,
  training buttons and technology cards use them.
- **Command icons (bead `pulp_wars-0ao.14`, batch `5-goblin`):** item
  sprites in the same vocabulary: Kaboom! (`ICON:ACTION:KABOOM`) a round
  black bomb with a lit cream fuse and a pale spark; WAAAGH!
  (`ICON:ACTION:GOBLIN:RALLY`, the Goblin Rally) the Warboss's grey tin
  megaphone. LEGACY keeps the code-drawn Kaboom! bomb and the Rally art.

## Subject lines

Approved lines for `scripts/art/chibi/subjects/GOBLIN.json`, written like the
Human and Undead lines. Each unit line carries the full body language and
puts the owner colour on a garment (or a vehicle's painted parts) that
covers the torso and legs. In the JSON file each is keyed by the runtime
subject `UNIT:GOBLIN:<ROLE>`, which the renderer asks for first and replaces
with the Human sprite plus the Goblin badge while no raster is usable; the
manifest subject pattern in `scripts/art/chibi/batch-manifest.ts` accepts
`UNDEAD` and `GOBLIN` faction subjects. Canvases follow the
[asset inventory](../CHIBI_ASSET_INVENTORY.md).

**Goblin** (`FIGHTER`, standard unit 56 x 80):

```text
Subject: Goblin, a chunky cute scrappy little goblin with a huge round head
about half of the figure's height and a small hunched body leaning forward,
the head and ears filling the whole width of the image: yellow-olive green
skin shaded darker olive, two long pointed ears sticking straight out
sideways, a long pointy nose, big cream eyes with black pupils and a wide
jagged toothy grin, a small bright red bandana tied over the top of the head
with two short knot tails, a big bright red patched tunic with square
stitched patches covering the chest, belly and legs down to the knees, a
charcoal grey belt, an oversized jagged light grey iron dagger held up in
the right hand, bare olive green hands and big bare olive green feet; simple
shapes and very few details; clearly a sneaky little stabber, not a soldier
with a shield.
```

`negativeAddendum`: `shield, helmet, sword, bow, quiver, bomb`.

**Wolf Rider** (`RAIDER`, large unit 72 x 88):

```text
Subject: Wolf Rider, a chunky cute little goblin riding a big shaggy wolf,
wide and low, filling the whole width of the image: the wolf is dark
slate-grey with a pale grey belly, a big head with pointed ears, a long
snout with open jaws and small cream fangs, and four chunky dark slate-grey
legs and paws; a big bright red patched saddle blanket with square stitched
patches drapes over its back and hangs down both sides; the goblin rider has
yellow-olive green skin, long pointed ears sticking out sideways, a big grin,
a bright red bandana and a bright red patched tunic, and waves a short
jagged light grey iron spear; simple shapes and very few details; the wolf's
paws are the lowest thing in the image; clearly wolf cavalry, not a horse.
```

`negativeAddendum`: `horse, pony, hooves, saddle horn, bow, bomb`.

**Bomb Chucker** (`MARKSMAN`, standard unit 56 x 80):

```text
Subject: Bomb Chucker, a chunky cute little goblin bomb thrower with a huge
round head about half of the figure's height and a small hunched body, the
head and ears filling the whole width of the image: yellow-olive green skin
shaded darker olive, long pointed ears sticking out sideways, a big excited
grin, a bright red patched flying cap with big round dark iron goggles
pushed up on the forehead, a big bright red patched tunic with square
stitched patches covering the chest, belly and legs down to the knees, the
right arm raised high holding one big round black bomb above the head with a
short cream fuse and a small pale yellow-white spark, a bulging charcoal grey
satchel of round black bombs on the left hip, bare olive green feet; simple
shapes and very few details; clearly a bomb thrower, not an archer.
```

`negativeAddendum`: `bow, quiver, arrows, dagger, shield, flames, explosion`.

**Orc Brute** (`GUARD`, standard unit 56 x 80):

```text
Subject: Orc Brute, a chunky cute big broad orc with a huge round head about
half of the figure's height and a wide heavy body filling the whole width of
the image: grey-olive green skin shaded darker grey-olive, a heavy jaw with
two cream tusks jutting up from an underbite, a flat nose, small grumpy eyes
under a heavy brow, small pointed ears, a dented dark gunmetal iron pot
helmet with one short spike, a big bright red patched sleeveless tunic with
square stitched patches over the chest, belly and legs down to the knees, a
round dented dark gunmetal iron shield with a spiky boss on the left arm, a
huge chunky light grey iron cleaver raised in the right hand, charcoal grey
boots, wide braced stance; simple shapes and very few details; clearly a
big shield bruiser, not a spearman.
```

`negativeAddendum`: `spear, tower shield, bow, quiver, bomb`. If the sample
stays under the 15% owner minimum, paint the round shield's face bright red
before anything else: it stays round, so it still reads apart from the
Guard's tower shield.

**Orc Warboss** (`CAPTAIN`, standard unit 56 x 80):

```text
Subject: Orc Warboss, a chunky cute big bossy orc chief with a huge round
head about half of the figure's height and a broad stocky body filling the
whole width of the image: grey-olive green skin shaded darker grey-olive,
two cream tusks and a wide open shouting mouth, a dark gunmetal iron helmet
with two big curved cream horns, a huge bright red patched cape spread
behind the shoulders, a bright red patched tunic over the chest, belly and
legs down to the knees, spiky dark gunmetal shoulder plates, a big dented
light grey tin megaphone cone held to the mouth in the right hand, the left
fist raised, charcoal grey boots; simple shapes and very few details;
clearly a yelling war chief, not a standard bearer.
```

`negativeAddendum`: `banner, flag, pole, feather, shield, bow, quiver, bomb`.

**Rocket Cart** (`CATAPULT`, large unit 72 x 88):

```text
Subject: Rocket Cart, a chunky cute rickety two-wheeled iron cart, clearly
bigger than a soldier, filling the whole width of the image: a crooked frame
of dented dark gunmetal plates and bolts on two big spiked dark iron wheels,
carrying one huge fat bright red rocket tilted up at forty-five degrees and
pointing forward, with a light grey pointed nose cone, light grey tail fins
and a short cream fuse with a small pale yellow-white spark at its tail; a
tiny goblin with yellow-olive green skin, long pointed ears and a bright red
bandana crouches behind the cart covering its ears; simple shapes and very
few details; the wheels are the lowest thing in the image; clearly a rocket
launcher, not a catapult.
```

`negativeAddendum`: `catapult arm, bucket, rope, horse, flames, smoke
trail, explosion`.

**Scrap Buggy** (`KNIGHT`, large unit 72 x 88):

```text
Subject: Scrap Buggy, a chunky cute rickety spiky jalopy, wide and low,
filling the whole width of the image: a boxy body of bolted dented iron
panels painted bright red with square riveted patches, a big spiked light
grey iron ram on the front, four mismatched chunky dark iron wheels with
short spikes, a tall crooked dark gunmetal exhaust pipe at the back puffing
a big round charcoal grey soot cloud; a little goblin driver with
yellow-olive green skin, long pointed ears, a big grin, a bright red flying
cap and big round dark iron goggles grips a small steering wheel; simple
shapes and very few details; the wheels are the lowest thing in the image;
clearly a war buggy, not a horse or a cart.
```

`negativeAddendum`: `horse, lance, rocket, flames, fire, explosion`.

**Troll** (`JUGGERNAUT`, giant unit 88 x 104):

```text
Subject: Troll, a chunky cute giant mossy troll, a huge hulking hunched lump
much wider and taller than a normal soldier: a big round head sunk forward
between enormous shoulders, stone grey-green skin shaded darker grey-green
with a few dark olive moss patches and small moss tufts on the head and
shoulders, a huge drooping nose, tiny sleepy eyes and a goofy underbite with
two cream tusks, very long arms reaching down to the knees, a huge knobbly
light grey stone club resting on the right shoulder, a huge bright red
patched smock with square stitched patches over the barrel belly and down to
the knees, big bare grey-green feet, wide braced stance; simple shapes and
very few details; clearly a giant, not a normal soldier.
```

`negativeAddendum`: `armour, pauldrons, hammer, chains, manacles, bolts,
stitched skin, bomb`.

**Command icons** (`ICON`, 48 x 48, unowned; bead `pulp_wars-0ao.14`). The
bomb is a filled black ball with its fuse rising from the top, never a ring
with a diagonal stroke, so it cannot read as the ♂ symbol. The megaphone is
grey tin with its mouth to the right, unlike the Human Rally's brass horn
with a red ribbon.

```text
Subject: one big round glossy black iron bomb ball, black shaded with dark
charcoal grey and one small light grey shine spot, a short squat dark
gunmetal fuse cap with two rivets sitting straight up on top, a short cream
fuse cord rising straight up out of the cap and curling over to one side,
lit at its tip with a big pale yellow-white four-pointed spark star; nothing
else in the image.
```

`negativeAddendum`: `face, eyes, mouth, feet, arms, cannonball pile, fire,
flames, explosion, smoke cloud, orange, arrow`.

```text
Subject: one big dented light grey tin megaphone cone lying sideways, the
wide round mouth facing right and the narrow mouthpiece at the left,
riveted seams, a dark gunmetal rim around the mouth and a soot-black leather
handle strap underneath, with three short jagged cream shout lines bursting
out of the wide mouth; nothing else in the image.
```

`negativeAddendum`: `horn, bugle, trumpet, brass, gold, ribbon, bow, red,
hand, face, mouth, person`.

### Cities and villages

**Goblins share the Human settlement art**, as decided for the Undead: the
runtime keys city art by level, not by owner faction, and a city changes
owner on capture. There are no Goblin city or village subject lines. The
placeholder "city tint" of spec
[section 11.4](../../product/RULESET_7_REVISION_17_GOBLINS.md#114-placeholder-and-final-art)
is a code-side cue only: it must leave the owner-mask pixels untouched and
must not push any other pixel towards red or brown.

### Placeholders (bead `pulp_wars-0ao.4`)

The programmatic placeholders stand in for the rasters until the roster is
stable, so they should already carry the silhouette key of each unit:

- the chibi unit contract for the role's canvas, anchor and overflow (56 x
  80, 72 x 88 or 88 x 104), a one-pixel black outline, and an owner mask of
  20–40% of opaque pixels on the tunic, blanket, rocket or buggy panels,
  drawn in the key colour so the runtime recolours it through the mask;
- only the palette above: olive skin tones by species, gunmetal, cream;
- one readable shape per unit, as in the [roster notes](#roster-notes):
  sideways ear triangles on every goblin head, the diagonal rocket, the low
  wide buggy with a grey plume, the raised black bomb, the round shield, the
  horns and megaphone, the wolf body, the Troll's bulk and club.

A crude but correct silhouette beats a detailed one: the placeholders are
what balance and UI testers will learn the roster from.

They were drawn by a programmatic generator and registered with a
`placeholder` marker. The sprite bead (`pulp_wars-0ao.8`) replaced every
marked entry with PixelLab art and removed the generator, its PNGs and the
marker; the review evidence stays in
`art/pixellab/reviews/chibi-goblin-placeholders/`.

### Explosion effects

Explosions are unowned, so no effect uses the key red, and none uses
saturated orange, gold, green, cyan or purple: a blast must never read as a
player colour. Spec
[section 11.4](../../product/RULESET_7_REVISION_17_GOBLINS.md#114-placeholder-and-final-art)
allows a code-native explosion first; a raster, if one follows, is a
palette-mapped `effect` recipe like the Undead cues (see the
[pipeline](../CHIBI_PIPELINE.md#status-markers-and-effects)), without the
faction layer and on a checked-in `goblin-blast` palette of white, cream
`#efe6c8`, pale spark `#fff8d0`, light grey, soot grey and charcoal.

| Cue                    | Look                                                                                                                                            | Animation                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Kaboom and death blast | a cartoon "bang": a spiky white-and-cream star flash inside a ring of round soot-grey smoke puffs, with a few small dark iron scraps flying out | bursts on the exploding unit's tile and swells to cover the 3 × 3 area, then the puffs drift up and fade |
| Blast hit              | one small soot puff with two scraps                                                                                                             | pops over every hit unit, own units included, as the blast arrives                                       |
| Chain reaction         | the same burst on the next unit's tile                                                                                                          | one burst per wave, in wave order, with a short beat between waves                                       |
| Bomb splash            | a smaller burst on the target and a puff on each splashed unit                                                                                  | a round black bomb with a pale spark arcs from the Bomb Chucker first                                    |

Reduced motion freezes each burst at its midpoint, as for the Undead cues.
The class-effect negative fragment lists `explosion`, `fire`, `orange` and
`yellow`, so a raster subject describes the shapes above (flash, puffs,
scraps) rather than the word "explosion"; palette mapping then fixes the
colours. WAAAGH!, Plunder and Troll regeneration feedback belong to the UI
bead (`pulp_wars-0ao.5`) and may reuse existing cues.

## Roster notes

Canvas and class follow the mechanical role's subject in the
[asset inventory](../CHIBI_ASSET_INVENTORY.md). "Human" and "Undead" name
the same role's unit that the silhouette must read apart from.

| Role or building          | Canvas    | Owner colour on                          | Distinguishing silhouette                                                                                                                              |
| ------------------------- | --------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Goblin (`FIGHTER`)        | 56 x 80   | patched tunic to the knees, bandana      | hunched, sideways ears, jagged dagger raised, no shield or helmet (Human: crested helm, sword, shield; Undead: skull, sword, shield)                   |
| Wolf Rider (`RAIDER`)     | 72 x 88   | saddle blanket both sides, rider's tunic | small goblin on a dark grey wolf with open jaws, short spear (Human: hooded rider on a sandy pony; Undead: Ghoul alone on all fours)                   |
| Bomb Chucker (`MARKSMAN`) | 56 x 80   | patched tunic, flying cap                | one black bomb raised overhead with a spark, bomb satchel, goggles (Human: tall hood and longbow; Undead: floating Banshee)                            |
| Orc Brute (`GUARD`)       | 56 x 80   | sleeveless tunic to the knees            | broad orc, round spiked shield, big cleaver raised, spiked pot helmet (Human: tower shield and spear; Undead: Zombie with arms forward)                |
| Orc Warboss (`CAPTAIN`)   | 56 x 80   | big cape and tunic                       | horned helm, megaphone at the mouth, shoulder spikes, no banner (Human: feathered cap and square banner; Undead: robed Necromancer with a skull staff) |
| Rocket Cart (`CATAPULT`)  | 72 x 88   | the rocket's body, crew bandana          | two-wheeled cart with one fat rocket at 45°, tiny crew (Human: wooden catapult arm; Undead: robed Lich with an orb)                                    |
| Scrap Buggy (`KNIGHT`)    | 72 x 88   | painted body panels, driver's cap        | low wide four-wheeled jalopy, front ram, exhaust pipe with a soot cloud (Human: knight on a horse; Undead: Vampire with a bat-wing cape)               |
| Troll (`JUGGERNAUT`)      | 88 x 104  | smock over belly and knees               | giant hunched grey-green lump, long arms, drooping nose, moss, stone club on the shoulder (Human: armoured hammer brute; Undead: stitched Abomination) |
| Patrol Boat, Battleship   | Human art | Human art                                | reused unchanged (spec section 3)                                                                                                                      |
| City 1–3, village         | Human art | Human art                                | shared Human art                                                                                                                                       |

## Sprite findings (bead `pulp_wars-0ao.8`)

Batch `goblin` (`scripts/art/chibi/batches/batch-goblin.json`) holds the
eight units and batch `5-goblin` the eight portraits; every request, seed,
addendum, edit and verdict is in those manifests and their records. The
sample was the Goblin, the Bomb Chucker and the Troll (the three most
different silhouettes and sizes); the Orc Brute followed in the batch. What
the sample showed, and how the recipes answer it without changing the
approved lines above:

- **The faction fragment's "riveted scrap iron plates" invite armour.**
  Pixen put gunmetal pauldrons, arm plates or spiked shoulders on nearly
  every first candidate, which hid the tunic (owner area 5–17%) and made the
  figures busier than the Human and Undead sets. Recipe addenda say "no
  armour and no shoulder plates" (except the Warboss's small spiky plates
  and the Brute's pot helmet), and edits removed what remained.
- **"Patched" garments come back with dark olive or brown spots** that stay
  dark for every owner. Addenda and edits ask for plain flat red with
  same-red patches.
- **Brown still drifts in** on straps, belts, boots, spear shafts, the
  Rocket Cart's wheels and a Troll club handle, and once as tan skin.
  Single-focus edits ("make the brown belt charcoal grey; change nothing
  else") worked where broad ones did not, as for the Undead.
- **Crimson-purple shading** on the rocket and a portrait buggy fell outside
  the mask; a single-focus edit fixed the rocket, and two portraits (Orc
  Warboss, Scrap Buggy) carry a checked-in keyLike mask override that adds
  the deeper key shades.
- **The Rocket Cart's crew** (0ao.4 review): the accepted cart has one tiny
  crew in charcoal with only a red bandana, outlined apart from a plain red
  rocket, so the crew no longer merges with it.
- **The Orc Brute** stayed under the owner minimum with only its tunic, so
  it took this document's fallback: the round shield's face is red.
- **Anchors:** the Warboss's cape and the Scrap Buggy's rear wheel reached
  the HP bar and seat-badge strips; their anchors move 1 px and 4 px right.

Accepted owner areas: Goblin 36.1%, Wolf Rider 20.0%, Bomb Chucker 35.4%,
Orc Brute 18.4%, Orc Warboss 17.8%, Rocket Cart 19.2%, Scrap Buggy 20.3%,
Troll 32.0%; every mask passes QA. Review evidence: `npm run
art:chibi-goblin-review` writes `art/pixellab/reviews/chibi-batch-goblin/`
(the batch review, the faction comparison sheets for units and portraits,
and a Goblin match in CHIBI).

## Command icon findings (bead `pulp_wars-0ao.14`)

Batch `5-goblin` holds both icons; every request, seed, addendum, edit and
verdict is in its manifest and records (15 PixelLab calls). Pixen drew the
right objects at once but drifted off the palette:

- **The bomb** came back slate-violet with a belt, or spiked like a naval
  mine; an addendum asking for a plain jet-black ball still drew belts and
  spikes. A single-focus edit of the best shape (`icon-action-kaboom-a`)
  made the ball jet black and the spark pale cream-white:
  `icon-action-kaboom-a-edit`, candidate 0.
- **The megaphone's shout lines** came back orange-gold, red-orange (near
  Coral) or yellow. Edits that recoloured them turned the inside of the
  mouth tan and orange, or the lines into dark marks; a second edit of the
  clean grey megaphone drew pale cream lines (`icon-action-goblin-rally-b-edit-c`,
  candidate 0). New seeds with stronger addenda drew lavender or smaller
  megaphones with a red-brown rim.

Review evidence in `art/pixellab/reviews/chibi-goblin-command-icons/`:
`command-icons-{1x,x4}.png` show both icons beside the Human and Undead
command icons on the dock panel and a light page;
`goblin-{kaboom,waaagh}-dock-chibi-{desktop,phone}.png` are a real
Ruleset 7 DOM over the Goblin showcase fixture in CHIBI (the Kaboom! Goblin
and the Orc Warboss selected, 1440 x 900 and 390 x 844 at DPR 3), and
`docks-chibi-vs-legacy-desktop.png` compares the CHIBI docks with LEGACY.
The batch-5 interface review (`npm run art:chibi-batch-review -- --batch 5`)
also draws both icons in its sheets.

## Checks for the sprite bead

- [x] The prompt fragment names no figure and no building.
- [x] Every material has a non-red, non-brown shading colour.
- [x] Every unit line puts red on a garment or painted part covering torso
      and legs.
- [x] Feet, hands, handles, stocks and shields have non-brown colours.
- [x] No settlement lines: Goblins share the Human city and village art.
- [x] The sample (Goblin, Bomb Chucker, Troll) passes mask QA and reads
      apart from the Human and Undead sets at zoom 0.75.
- [x] The whole roster and its portraits pass mask QA, clear the HP bar and
      seat-badge strips (giants exempt) and replace every placeholder.
