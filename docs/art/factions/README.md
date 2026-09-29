# Faction art layer

Every faction uses the same [chibi art direction](../CHIBI_ART_DIRECTION.md).
A faction adds one **faction fragment**: a short, faction-wide set of
instructions that gives it its own identity without breaking the shared rules.

The user will name new factions later. Until then, the only faction is the
baseline Human faction, [`ORIGINAL`](ORIGINAL.md).

## How the layers combine

The production pipeline builds every prompt from these parts, in order:

1. the general chibi style fragment (from the chibi direction);
2. the camera fragment;
3. the **faction fragment** (this folder);
4. the class fragment (unit, city, building, resource, terrain, icon);
5. the subject description (for example "Fighter: sword and shield").

Negative prompts combine the same way. Each fragment is a checked-in text
file, so adding a faction changes only its fragment and its subject list.

## What a faction fragment may set

- era and setting (for example medieval storybook, clockwork, frontier);
- materials, textures and motifs (for example timber and tile roofs, brass
  gears, bones);
- a secondary palette of up to three neutral or accent colours, none of
  them red or red-brown;
- body and silhouette language (for example stocky humans, lanky skeletons,
  boxy robots);
- architecture style for cities and buildings;
- faction-specific props, and how each of its roles differs from the others.

## What a faction fragment must not change

- camera, outline, detail level, or the "nothing under it" rule;
- canvas sizes, anchors and overflow limits;
- the owner-colour key colour and its minimum area;
- the size hierarchy between classes.

If a faction needs one of these changed, raise it with the user as a change
to the chibi direction; don't work around it in the fragment.

## Adding a faction

1. The user names the faction and its units and buildings.
2. Write `docs/art/factions/<FACTION_ID>.md` from
   [FACTION_TEMPLATE.md](FACTION_TEMPLATE.md) and get user approval.
3. Create beads: one per generation batch, each followed by a user review,
   the same shape as the Human migration batches.
4. Run a small sample (Fighter-equivalent, ranged unit, city) and compare it
   side by side with the Human set at zoom 0.75 before batching.

The dry run bead `pulp_wars-tt3.1` tests this layer with a throwaway faction
before any real one is requested.
