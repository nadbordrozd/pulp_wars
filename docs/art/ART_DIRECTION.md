# Art Direction

This is the canonical shared art direction for Pulp Wars. The artistic direction
below faithfully reproduces the user-supplied root `art_direction.md`; the root
file remains unchanged for provenance. Technical class contracts live under
[`docs/art/classes/`](classes/) and may specialize, but never contradict, this
direction.

Ruleset-6 production inventory and class gates are frozen in the linked class
contracts. The source economy brief does not override this art direction. New
spatial-economy, Road, technology, Original-role, and Candy-role assets remain
production work until they pass the same reproducible PixelLab
generate-inspect-iterate workflow; a rules diagram or temporary code-native
fallback is not accepted production raster art.

The game should use a **chunky 2D illustrated strategy-game style**, not faux-3D or detailed pixel art.

## Active square-grid experiment

The current map presentation follows the
[square-grid experiment contract](SQUARE_GRID_EXPERIMENT.md): axis-aligned
128 x 128 CSS-pixel cells, full-footprint ground, upper-left lighting, and
upward-only overflow for genuinely tall map forms. The diamond measurements
later in this file remain historical acceptance provenance for unchanged unit
rasters; they do not override the active square footprint.

The visual target is somewhere between **board-game pieces, stickers, and simple cartoon sprites**. It should feel playful, readable, slightly ridiculous, and capable of supporting wildly different pulp factions such as pirates, robots, undead, cowboys, ninjas, dinosaurs, aliens, etc.

## Core principles

- Prioritize **readability at gameplay scale** over detail.
- Every unit should be identifiable primarily from its **silhouette**.
- Use exaggerated visual shorthand: oversized hats, guns, swords, helmets, claws, backpacks, staffs, etc.
- Characters should be cute/chunky rather than realistically proportioned.
- Use large heads, short bodies, broad poses, and oversized equipment.
- Avoid detailed textures, realistic anatomy, realistic lighting, or intricate costumes.
- The style should tolerate slight inconsistencies between generated assets rather than requiring perfect character-model consistency.
- Factions should be visually distinct through shape language, costume, and a small palette of characteristic colors.

## Rendering style

Use:

- clean 2D illustration
- strong dark outlines
- mostly flat colors
- simple 2–3 level cel shading
- minimal gradients
- minimal texture
- simple highlights
- no photorealism
- no painterly rendering
- no complex ambient lighting
- no pseudo-3D rendering
- no isometric 3D models

The sprite should look intentionally drawn rather than like a rendered 3D object.

## Camera and pose

All gameplay units must use a consistent **three-quarter strategy-game view**, looking slightly downward at the character.

Characters should normally face approximately **down-right / southeast**.

Pose should be:

- compact
- dynamic but readable
- centered
- feet clearly visible
- weapon/tool clearly visible
- no extreme foreshortening

Do not generate dramatic cinematic poses.

## Sprite composition

Every unit sprite should:

- use the same canvas dimensions
- occupy roughly the same visual footprint for units of the same size class
- have a transparent background
- contain no scenery
- contain no text
- contain no UI
- contain no baked-in selection circle
- contain no complex cast shadow

The game will add standardized shadows, selection markers, health indicators, faction-color markers, etc.

Small units should fit a common bounding box. Large/giant units may deliberately exceed it, but their scale should be systematic.

## Detail budget

Assume that units will usually be seen **small on screen**.

Therefore:

Good:

- giant pirate hat
- eyepatch
- huge cutlass
- robot antenna
- glowing skeleton eyes
- enormous cowboy hat
- obvious dinosaur jaws

Bad:

- detailed belt buckles
- tiny facial details
- intricate fabric patterns
- realistic weapon mechanisms
- subtle material differences that disappear when scaled down

If a detail is not visible at normal game zoom, omit it.

## Terrain

Terrain should be **simpler and quieter than the units**.

Use clean tile shapes, broad areas of color, and only a few large decorative elements.

Examples:

- forest = several chunky stylized trees
- mountain = one or two exaggerated peaks
- farm = simple rows/crop shapes
- ruins = a few immediately recognizable broken structures
- water = simple surface with minimal wave decoration

Avoid covering tiles in small procedural detail.

The board should remain readable even when many units are present.

## Buildings and settlements

Buildings should follow the same chunky illustrated style.

They should be:

- highly simplified
- exaggerated
- recognizable from silhouette
- visually associated with their faction or function

Do not attempt realistic architecture.

A pirate settlement might have sails, wooden towers and a huge skull flag. A robot settlement might have antennae, pipes and geometric structures.

## Faction design

Each faction should have a strong visual gimmick.

Examples:

**Pirates**

- triangular hats
- coats
- wooden weapons/structures
- sails
- skull motifs
- exaggerated cannons

**Robots**

- boxy bodies
- antennas
- glowing simple face displays
- large mechanical joints
- clean geometric silhouettes

**Undead**

- skulls
- bones
- ragged cloaks
- oversized graveyard imagery
- green/purple magical accents

The goal is that a player should be able to recognize a faction **without reading any labels**.

## Tone

Aim for:

**charming + pulpy + silly + adventurous**

Not:

**dark + gritty + realistic + epic-serious**

Violence should read like toy soldiers or cartoon combat rather than gore.

The game world does not need stylistic realism. Pirates, robots, cowboys and dinosaurs can coexist. The common illustration style is what makes them feel like part of the same game.

## Consistency rule

When generating new assets, preserve this visual system more aggressively than individual reference-image details.

In particular, always preserve:

1. camera angle
2. sprite scale
3. outline thickness
4. body proportions
5. shading complexity
6. level of detail
7. transparent background
8. faction visual language

A technically attractive sprite that violates these rules is worse than a simpler sprite that matches the rest of the game.

## Map-scale hierarchy

The nominal ground diamond is 128 x 74 CSS pixels at 1x camera zoom. Ordinary
units are pieces **on** that diamond, not terrain-sized masses: their untrimmed
256 x 296 canvases display at `0.25` source scale, and their visible alpha should
occupy 28–44% of tile width, 66–80% of tile height, and no more than 45% of one
diamond's alpha-weighted area. A standard silhouette is rejected above 48%
tile width, 84% tile height, or 8% alpha-weighted coverage of either immediately
rear/above adjacent tile. Accepted Mountains and Forests remain materially wider
or taller than ordinary units.

Breacher/siege and Juggernaut/giant are bounded exceptions, never permission to
fill the tile. Siege uses `0.24` on 384 x 384 and may occupy 50–61% of tile width,
with hard caps of 66% width, 104% tile height, 58% diamond area, and 12%
rear-tile coverage. Giant uses `0.25` on 384 x 448 and targets 58–66% tile width,
with hard caps of 72% width, 135% tile height, and 18% rear-tile coverage. Giants
are always generated and accepted individually.

Rear-tile coverage is measured deterministically from source alpha: place the
source contact anchor at the owning tile center, apply display scale and any
documented cosmetic offset, sum `alpha / 255 * scale²` for source-pixel centers
inside each immediately adjacent projected diamond, then divide by diamond area
`128 * 74 / 2`. Logical NORTH and WEST project 37 CSS pixels above the owning
center and are the two rear/above neighbors. Zoom and DPR scale both reference
diamond and sprite uniformly, so the ratio is invariant.

## Production workflow

Production raster art is generated with PixelLab only through checked-in,
programmatic scripts. Do not use a PixelLab MCP connector or a manual-only
workflow. Credentials remain in environment variables and never appear in
source, prompts, logs, manifests, or Beads.

Every script or manifest records prompt, negative prompt, requested dimensions,
model and settings, seed when supported, source-to-output mapping, and any
deterministic post-processing. Generate a small initial sample for an asset
class and inspect every result at native display scale and enlarged pixel scale.
Check the class rules plus silhouette, readability, composition, palette,
lighting, transparency, edge quality, consistency, and exact dimensions. Tile
review also checks every adjacency and map-level repetition.

A successful generation request is not acceptance. Reject, adjust the recipe,
and regenerate anything ugly, unclear, inconsistent, technically wrong, or
outside this direction. Batch only after at least three representative assets
in that class pass individual review and the recipe is stable. Review batches
as contact sheets, then inspect suspected failures individually. The
orchestrator separately reviews accepted outputs before their task closes.

For both Original and Candy units, “sample” means exactly three representative
assets reviewed one at a time before any later batch. Later batches are small,
coherent role families of at most three assets; never request or accept a whole
roster in one generation batch. Giant units remain one-asset gates even after a
faction's standard and siege recipes have stabilized.

## Class contracts

- [Units](classes/units.md)
- [Terrain tiles](classes/terrain-tiles.md)
- [Buildings and settlements](classes/buildings.md)
- [UI](classes/ui.md)
