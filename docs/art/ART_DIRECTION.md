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

## Class contracts

- [Units](classes/units.md)
- [Terrain tiles](classes/terrain-tiles.md)
- [Buildings and settlements](classes/buildings.md)
- [UI](classes/ui.md)
