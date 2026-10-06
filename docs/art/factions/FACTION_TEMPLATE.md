# Faction fragment: <FACTION_ID>

**Status:** draft; needs user approval before generation.

Copy this file to `docs/art/factions/<FACTION_ID>.md` and fill in every
section. Read the must and must-not rules in the [README](README.md) first:
they come from the faction-layer dry run. Keep it short: the fragment text
below goes into every prompt for this faction, for units, cities and
buildings alike.

## Identity

One or two sentences on who this faction is and how it should feel. This is
for people; it is not sent to PixelLab.

**Theme music:** a new faction also needs a theme prompt. Follow
[Adding a future faction](../../audio/THEME_MUSIC.md#adding-a-future-faction);
a unit test fails while a faction of the game has no entry in
`docs/audio/theme-prompts.json`.

## Prompt fragment

The exact text inserted as layer 3 of every prompt (see
[README](README.md#how-the-layers-combine)). Aim for 30–60 words. Name only
era, materials, surfaces, colours and small motifs, and say how each
material is shaded without red or brown. Name no figure (people, soldiers,
creatures, robots, skeletons) and no building or place (towns, towers,
huts): those belong in the subject lines. Put no "no …" exclusions here.

```text
Faction: <era or setting in a few words>. Everything is made of <material 1>
and <material 2>, with <small motif> and <small motif> as details; <material>
is shaded with darker <colour>, never brown.
```

## Negative fragment

Faction-specific exclusions added to every negative prompt: materials,
eras and weapons the faction never uses. For a faction of metal, bone,
leather or decay, keep the red-brown drift words. No figure or building
words: they also reach the other classes.

```text
<materials the faction never uses>, brown boots, brown leather, bronze,
copper, rust, dark brown shading, red-brown
```

## Palette

- Owner colour: the shared key colour only (see the chibi direction), on a
  garment or shell that covers the torso and legs (tunic, coat, robe,
  tabard, cloak, hood) plus a hat or crest, and on roofs, domes and banners.
- Secondary colours (at most three; never red or red-brown; no large area
  close to a player colour, so brass, gold or purple only as small trim): ...

## Silhouette language

How bodies, weapons and buildings differ from other factions so the faction
reads at zoom 0.75. This guides the subject lines; it is not sent to
PixelLab.

## Subject lines

Write one line per piece in `scripts/art/chibi/subjects/<FACTION_ID>.json`.
The Human lines in `ORIGINAL.json` are the model. Each unit line carries
the full body language; each settlement or building line carries the full
architecture.

```text
Subject: <Role>, a chunky cute <body> with a huge round head about half of
the figure's height and a tiny sturdy body: <head and face>, a big bright
red <garment covering torso and legs> and <red hat or crest>, an oversized
<signature weapon> in <non-brown colour>, <feet and hands in a non-brown
colour>; simple shapes and very few details.

Subject: a small level-1 town: <main building> with a bright red <roof or
dome> and a big red banner flag, and three chunky <houses> with <wall
colour> walls and solid bright red <roofs> pressed around its foot; wide and
chunky, filling the whole width of the image. Buildings only.
```

Settlement and building recipes add the faction's figure words to their
`negativeAddendum` in the batch manifest (for example `soldier, person,
character, <faction figure>`).

## Roster notes

One line per unit role and per building: what makes it unique within this
faction.

| Role or building | Distinguishing silhouette |
| ---------------- | ------------------------- |
| ...              | ...                       |

## Check before approval

- [ ] The prompt fragment names no figure and no building.
- [ ] Every material has a non-red, non-brown shading colour.
- [ ] Every unit line puts red on a garment or shell covering torso and legs.
- [ ] Feet, hands, handles, stocks and shields have non-brown colours.
- [ ] Every settlement line ends "Buildings only." and fills the width.
- [ ] The sample (Fighter-equivalent, ranged unit, City 1) passes mask QA and
      reads apart from the Human set at zoom 0.75.
