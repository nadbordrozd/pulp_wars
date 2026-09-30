# Faction art layer

Every faction uses the same [chibi art direction](../CHIBI_ART_DIRECTION.md).
A faction adds one **faction fragment**: a short, faction-wide set of
instructions that gives it its own identity without breaking the shared rules.

The baseline faction is the Human faction, [`ORIGINAL`](ORIGINAL.md). The
user has named the Undead faction (epic `pulp_wars-vkq`); its fragment is
bead `pulp_wars-vkq.11` and must follow the rules below. The user approved
it on 2026-09-29: [`UNDEAD`](UNDEAD.md). The Goblin faction (epic
`pulp_wars-0ao`) has its fragment in bead `pulp_wars-0ao.10`:
[`GOBLIN`](GOBLIN.md), approved by the root on 2026-09-30.

## How the layers combine

The production pipeline builds every prompt from these parts, in order:

1. the general chibi style fragment (from the chibi direction);
2. the camera fragment;
3. the **faction fragment** (this folder);
4. the class fragment (unit, city, building, resource, terrain, icon);
5. the subject description, from `scripts/art/chibi/subjects/<FACTION_ID>.json`
   (for example "Fighter: sword and shield").

Negative prompts combine the same way. Each fragment is a checked-in text
file, so adding a faction changes only its fragment and its subject list.

**Layer 3 goes into every prompt of the faction:** units, cities and
buildings alike. Pixen draws the nouns it is given, whatever class the
prompt is for. So the faction fragment carries only what every piece
shares, and each piece's own shape lives in its subject line (layer 5).

## What goes where

| Content                                                           | Where                                                         |
| ----------------------------------------------------------------- | ------------------------------------------------------------- |
| era and setting, materials, surfaces, colours, small motifs       | faction fragment (layer 3)                                    |
| materials the faction never uses, forbidden eras and weapons      | faction negative fragment                                     |
| bodies: heads, faces, limbs, posture, clothing, weapons, mounts   | each unit's subject line (layer 5)                            |
| architecture: towers, roofs, walls, domes, what a city is made of | each settlement and building subject line (layer 5)           |
| "no figures" or "no buildings" exclusions for one class           | the recipe's `negativeAddendum` in the batch manifest         |
| silhouette language and roster notes, for people                  | the faction document (not sent to PixelLab; guides the lines) |

## The faction fragment must

- name only era, materials, surfaces, colours and small motifs, written as
  "Everything is made of …" (for example riveted gunmetal plates and ivory
  enamel; bleached bone and tattered cloth);
- say how each of its materials is shaded, with a colour that is neither
  red nor brown, for example "metal is shaded with darker blue-grey, never
  brown" or "bone is shaded with cool grey";
- keep its secondary palette to at most three colours, none of them red or
  red-brown and none of them a large area close to a player colour (Coral
  `#f06762`, Teal `#28b7a4`, Gold `#e2b63f`, Violet `#a277d2`): brass, gold
  or purple may be small trim only;
- stay short: 30–60 words.

Its negative fragment must list the materials the faction never uses and,
for any faction of metal, bone, leather or decay, the red-brown drift words
the dry run needed: `brown boots, brown leather, bronze, copper, rust, dark
brown shading, red-brown`.

## The faction fragment must not

- name a figure of any kind (soldiers, people, robots, skeletons, zombies,
  "tin soldiers", "bony warriors"): settlements turn into figures;
- name a building or a place (towns, towers, keeps, huts, "architecture:
  …"): units grow buildings beside them;
- carry "no …" exclusions in its positive text, or figure and building words
  in its negative fragment: that negative also reaches the other classes;
- change camera, outline, detail level or the "nothing under it" rule;
- change canvas sizes, anchors, overflow limits, the owner key colour, its
  minimum area, or the size hierarchy between classes.

If a faction needs one of the shared rules changed, raise it with the user
as a change to the chibi direction; don't work around it in the fragment.

## Subject lines must

- give every unit its body language in full (head, face or no face, body
  shape, limbs, feet), because the fragment no longer does;
- put the owner colour on a **garment or shell that covers the torso and
  legs**: a tunic, coat, robe, tabard, cloak or hood, plus a hat or crest.
  A figure whose body is metal, bone or another material keeps that
  material's colour: "the whole body is red enamel" was ignored, and red
  cap-and-chest designs stayed at 10–13% owner area (the minimum is 15%,
  the target 20–40%);
- name a non-red, non-brown colour for feet, boots, gloves, belts, handles,
  bow and crossbow stocks and shields, as the Human lines do;
- give every settlement and building its architecture in full and end with
  "Buildings only.", with figure words in the recipe's `negativeAddendum`
  (for example `soldier, person, character, robot`), never in the subject.

## Adding a faction

1. The user names the faction and its units and buildings.
2. Write `docs/art/factions/<FACTION_ID>.md` from
   [FACTION_TEMPLATE.md](FACTION_TEMPLATE.md), and the matching
   `scripts/art/chibi/subjects/<FACTION_ID>.json` subject lines, and get user
   approval.
3. Create beads: one per generation batch, each followed by a user review,
   the same shape as the Human migration batches.
4. Run a small sample (Fighter-equivalent, ranged unit, City 1) and compare
   it side by side with the Human set at 1:1, x4 and zoom 0.75 before
   batching. Expect every text-to-image city to need the ground-removal edit,
   as the Human cities did.

## Dry run: TEST-CLOCKWORK (bead `pulp_wars-tt3.1`)

A throwaway wind-up tin-toy faction was run through the production layering
as an exploration (`npm run art:chibi -- … --exploration <dir>`, see the
[pipeline](../CHIBI_PIPELINE.md#exploration-runs)) at the batch-1 geometry,
with three versions of its fragment and the same seeds and subject lines.
Nothing was registered. Evidence is in
[`art/explorations/faction-layer-dry-run/`](../../../art/explorations/faction-layer-dry-run/);
`npm run art:chibi-faction-dry-run-review` rebuilds the sheets in its
`review/` folder: `comparison-1x.png` and `comparison-x4.png` (key colour,
mask, owners A and B beside the accepted Human pieces), `zoom-0.75.png` and
`zoom-0.75-dpr2.png`, `arms-x4.png` (every candidate) and `index.json`
(sizes, outline, plate and mask metrics). 14 PixelLab calls, $0.14.

| Fragment arm                                         | Result                                                                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| A: bodies and towns, written like the Human fragment | 2 of 2 cities turned the clock tower into a robot (eye, shoulder plates, red fists, a wind-up key)                 |
| B: materials plus one "Architecture: …" sentence     | 0 of 2 cities had figures, but the Marksman drew a clock tower beside itself                                       |
| C: materials and small motifs only (the rule above)  | no figures in the city and no buildings beside the units; the city's architecture came from its subject line alone |

Shared rules after the swap (arm C against the accepted Human pieces):

- **Camera and outline** held: three-quarter view facing south-east, a
  one-pixel black outline (dark edge share 0.82–0.99 against the Human
  0.74–0.93).
- **Nothing under it** held for units. Every text-to-image city in every arm
  (5 of 5) stood on a slab, exactly like the Human cities; one ground-removal
  edit fixed it.
- **Owner-mask QA** failed first time on all three pieces: brass and metal
  shaded into rust brown (5–10% red-brown material). The never-brown shading
  wording cleared it (City 1 passed at 29.9%), but both robots then covered
  only 10–13% in owner colour, below the 15% minimum, because their red was a
  cap, a chest plate or a thin cape on a metal body.
- **Size** held for canvases, anchors and the class hierarchy, but the
  pieces came out smaller: the tin-can Fighter is 80% of the tile height
  (Human 90%) and City 1 fills 70% of the tile width (Human 81%). Ask for
  "fills the whole width" and a big-head chibi body in every line.
- **Distinct at zoom 0.75:** clearly. Tin cans and domed drum towns read
  apart from helmeted humans and timber cottages at a glance; the weak point
  is owner colour on the Marksman.
