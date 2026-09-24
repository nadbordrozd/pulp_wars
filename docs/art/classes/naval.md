# Naval Asset Contract

## Ruleset-7 revision-9 overlay

The approved
[revision-9 Human technology contract](../../product/RULESET_7_REVISION_9_HUMAN_TECHNOLOGY.md)
retains every accepted water, resource, Port, transport, Patrol Boat, and
Battleship source unchanged. It adds only the Shipyard source specified in the
[building contract](buildings.md#ruleset-7-revision-9-shipyard). Port is not a
suitable final Shipyard alias. All active/blockaded state, separate sea-trade
qualification, recovery, population, and dock discount presentation remains
code-native. No additional ship, transport, wake, route, trade, blockade,
recovery, or discount raster is approved for revision 9.

This contract specializes [Pulp Wars Art Direction](../ART_DIRECTION.md) for
the implemented [Ruleset 7 revision-6 water and naval expansion](../../product/RULESET_7_REVISION_6_WATER_NAVAL.md)
and the implemented current
[revision-7 networks and fortifications overlay](../../product/RULESET_7_REVISION_7_NETWORKS_FORTIFICATIONS.md).
It also follows the active square geometry in the
[terrain](terrain-tiles.md), [building](buildings.md), [unit](units.md), and
[UI](ui.md) class contracts. Those shared contracts remain authoritative where
this file does not give a naval-specific value.

Revision 6 requires real production raster art. Revision 7 replaces the Patrol
Boat and Battleship sources under their existing asset IDs. Those replacement
sprites are accepted production art and are integrated into revision-7
gameplay.
A solid-color tile, CSS shape,
emoji, borrowed image, temporary silhouette, or generic code fallback is not an
acceptable final asset. Generation uses checked-in programmatic PixelLab
scripts and manifests only. Do not generate assets from this document until the
asset implementation bead begins.

## 1. Required production inventory

| Exact asset ID                     | Subject            | Source canvas | Source anchor | Display scale | Background  |
| ---------------------------------- | ------------------ | ------------: | ------------: | ------------: | ----------- |
| `terrain-ruleset7-water-shallow`   | Shallow Water      |  256 x 256 px |   `(128,128)` |          0.50 | opaque      |
| `terrain-ruleset7-water-deep`      | Deep Water         |  256 x 256 px |   `(128,128)` |          0.50 | opaque      |
| `terrain-ruleset7-resource-fish`   | Fish resource      |  256 x 384 px |   `(128,256)` |          0.50 | transparent |
| `terrain-ruleset7-resource-pearls` | Pearls resource    |  256 x 384 px |   `(128,256)` |          0.50 | transparent |
| `building-ruleset7-port`           | Port improvement   |  384 x 384 px |   `(192,288)` |          0.30 | transparent |
| `unit-original-patrol-boat`        | Patrol Boat        |  384 x 384 px |   `(192,288)` |          0.24 | transparent |
| `unit-original-battleship`         | Battleship         |  384 x 384 px |   `(192,288)` |          0.27 | transparent |
| `unit-shared-embarked-transport`   | Embarked Transport |  384 x 384 px |   `(192,288)` |          0.24 | transparent |

These eight IDs are the complete initial naval raster inventory. There is one
source per subject; water and naval resources do not gain cosmetic variants in
revision 6. Purely cosmetic coordinate selection therefore cannot alter their
appearance or consume simulation PRNG.

The following runtime IDs are deterministic derivatives or aliases and do not
authorize additional PixelLab requests:

- `portrait-original-patrol-boat`, `portrait-original-battleship`, and
  `portrait-shared-embarked-transport` use framed crops of the corresponding
  accepted world sources;
- Shorecraft technology, Build Port, and Port identity use
  `building-ruleset7-port`;
- Navigation technology uses `terrain-ruleset7-water-deep`;
- Naval Engineering technology and Train Battleship use
  `unit-original-battleship`;
- Train Patrol Boat uses `unit-original-patrol-boat`;
- Embark and transport identity use `unit-shared-embarked-transport`;
- Harvest Fish and Gather Pearls use their exact resource sources.

If UI review shows that Deep Water cannot function as the Navigation card
symbol, the product contract permits one conditional transparent
`ui-tech-navigation-v7r6` at 128 x 128 px, displayed at 32 x 32 CSS px. Record
the failed readability evidence before adding it. No other dedicated tech,
action, economy, or portrait raster is approved.

## 2. Water terrain

Both water sources fill the complete 256 x 256 square with opaque straight-alpha
sRGB pixels and display as the board's exact 128 x 128 CSS cell at 1x. They use
the accepted square terrain camera, northwest light, broad flat/cel-shaded
forms, strong but restrained illustrated edges, and no upward or lateral
overflow.

Shallow Water is a quiet muted blue-green with a few broad low-contrast surface
curves. Deep Water is a darker, cooler blue with one simpler broad swell
language. Hue is not the only distinction: Deep Water has visibly larger,
longer wave spacing and a darker value band, while Shallow Water has shorter
light ripples. At native map scale and in grayscale, a player must distinguish
the two without mistaking either for selection, territory, movement range, or
fog.

Each source converges its outer 32 pixels to its own exact shared edge field so
same-type neighbors have no seam. Do not bake a coast, foam border, route,
current, beach, ownership color, resource, Port, grid line, or coordinate-stamped
motif into either source. The renderer derives a restrained 4 CSS-pixel
code-native boundary on the shallow side of every public Shallow/Deep edge and
a separate 3 CSS-pixel coast line on the water side of every public Water/Land
edge. Borders use value plus a repeated short-dash/wave shape, remain visible in
grayscale and common color-vision simulations, never cross fog, and do not enter
simulation state or hit testing.

Reject noisy bubbles, many tiny whitecaps, photorealistic reflections, gradients
that imply a fixed global direction, edge seams, obvious tiling stamps, high
contrast that competes with units/resources, or a pattern that disappears at
0.625x zoom. Review each source alone, enlarged, all four same-type edges, every
Shallow/Deep adjacency, every water/Grass/Forest/Mountain coast adjacency, 8 x
8 repetition, and mixed 11 x 11 and 25 x 25 maps.

## 3. Fish and Pearls

Resource sources use the established square-resource 256 x 384 transparent
canvas, anchor `(128,256)`, 0.5 display scale, and owning square
`x=0..255,y=128..383`. All alpha stays inside the owning square. Bottom contact
targets source `y=320`; preferred visible bounds are `x=60..196,y=176..320`,
with hard bounds `x=40..216,y=148..336`.

Fish is one compact group of three chunky silver-teal fish seen near the water
surface, with a readable fish silhouette rather than bubbles or a fishing
boat. Pearls is one open oversized shell holding two bright round pearls, with
the shell providing a shape cue so it does not read as Coins, population pips,
selection, or foam. Both use strong dark outlines and broad simple highlights.
They contain no text, price, action arrow, sparkle animation, net, hook, shadow,
terrain square, or Port.

Resources remain readable on both water terrains and when coexisting with a
Port. Map draw order is water, Port, resource, unit, then code-native status and
UI. The Port reserves the resource bounds above, and each resource stays low
enough to avoid a ship's primary silhouette. An explored resource is drawn even
before its use technology is researched. Fog omission follows the public view.

Review both resources at source, native 0.625x/1x/1.75x map zoom, enlarged,
grayscale, all owner overlays, selected/unselected, with and without Port, with
each ship/transport, beside Fruit/Game/Ore/Fertile Ground, under fog boundaries,
and in dense coast contact sheets. Reject any resource that reads as terrain
decoration, currency, a unit, a baked action state, or disappears on Deep Water.

## 4. Port

Port is a shared functional improvement, not a faction settlement. It is a
small chunky timber pier with one short warehouse or crane mass, a bold mooring
post, and a clear water opening. It faces southeast in the shared three-quarter
view. It must read as a place to embark and service ships, not as a city,
Battleship, generic hut, bridge, or full harbor scene.

The untrimmed 384 x 384 source uses anchor `(192,288)`, display scale 0.30,
preferred alpha bounds `x=52..332,y=82..320`, and hard bounds
`x=24..360,y=48..336`. No alpha crosses left, right, or bottom hard bounds.
Upward extension is permitted only for the crane/roof silhouette. Ground/water
contact centers within 10 source pixels horizontally and 8 vertically of the
anchor. The central/lower resource window corresponding to source
`x=90..294,y=170..330` remains sufficiently open that Fish or Pearls is
identifiable when drawn over the Port.

Reserve a contiguous 8–15% maskable faction-color patch such as one pennant or
warehouse panel; function must remain clear without the hue. Blockade, active
state, trade, recovery, population, ownership, route, recruitment availability,
and resource state are code-native overlays or UI facts. Do not bake a ship,
unit, owner flag emblem, Coin, fish, pearls, route line, selection, glow,
blockade mark, damage, text, or cast shadow into the Port.

Inspect source/native/enlarged; Shallow Water with every resource state; each
owner color; active, occupied, selected, blockaded, fog-edge, and negative-live-
population contexts; all eight adjacent land/water arrangements; one through
five Ports in a city; every ship centered on the same tile; and minimum/maximum
zoom at DPR 1/2. Reject resource occlusion, a silhouette that resembles a city,
unit occlusion, lateral/bottom spill, alpha halo, wrong camera, or a Port that
needs its state overlay to be identifiable.

## 5. Naval units and transport

All three sources are low-wide pieces with a southeast-facing bow, slight
downward camera, transparent background, clean RGB edges, no matte, and no
scenery. They use the same northwest key light, dark southeast planes, strong
charcoal-teal outline, flat fills, and two-to-three shade levels as accepted
Original units. Hull shape and equipment carry role identity at gameplay scale.

| Asset              | Preferred alpha bounds | Hard alpha bounds      | Target visible size at 1x | Required silhouette                                                                                             |
| ------------------ | ---------------------- | ---------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Patrol Boat        | `x=55..329,y=128..304` | `x=32..352,y=96..328`  | 66–78 x 38–50 CSS px      | lean small naval-gray motor patrol hull, enclosed wheelhouse, pointed bow, and one light deck gun               |
| Battleship         | `x=30..354,y=82..308`  | `x=16..368,y=54..330`  | 82–96 x 50–64 CSS px      | long broad armored naval-gray hull, distinct fore and aft heavy multi-barrel turrets, central bridge and funnel |
| Embarked Transport | `x=62..322,y=132..306` | `x=40..344,y=104..328` | 58–72 x 36–48 CSS px      | open simple transport hull, tied packs and empty passenger space; no role-specific weapon                       |

The keel/contact midpoint is within 10 source pixels horizontally and 8
vertically of `(192,288)`. Patrol Boat and Transport display at 0.24;
Battleship displays at 0.27. The complete silhouette stays inside one 128 x 128
cell at 1x except for permitted upper equipment, does not hide all of an
adjacent resource or Port identity, and remains materially smaller/quieter than
a settlement. Renderer sorting, logical occupancy, combat origin, selection,
health, and hit testing use the owning coordinate and metadata rather than
opaque bounds.

Each source has a contiguous 8–15% faction-color patch. The shared transport
uses neutral timber/canvas and the patch as ownership; it deliberately carries
no passenger face, Saboteur cue, Heavy armor, faction emblem, or capacity mark.
The passenger's accessible identity is supplied by UI text. Revision 7
supersedes the practical timber hull direction for Patrol Boat and Battleship:
both are chunky stylized steel warships with broad flat/cel-shaded planes, not
open wooden boats. Patrol Boat must read as the much smaller, faster motor craft
with a light single gun; it has no ballista, spear, sail, open dinghy hull, or
heavy turret. Battleship must read as a real armored capital ship with two
separate heavy turrets, one forward and one aft, each visibly multi-barrel; it
has no lone cannon, open boat interior, mast-driven silhouette, or timber hull.
The central superstructure stays low enough that both turrets read at native
scale. This warship language does not change the shared transport or establish
a new faction. A future faction may replace these sources only through its own
registered role mapping.

Do not bake wakes, water, shoreline, foam, cannon fire, projectile, range,
damage, veteran mark, health, owner flag emblem, selection, shadow, ZOC,
recovery, blockade, cargo count, or text into any unit. Wakes, cannon shot,
impact, movement path, landing target, recovery radius, and state marks are
code-native effects. The Battleship turrets are part of its resting silhouette;
muzzle flash and projectile are not.

### Revision-7 replacement gate

The revision-7 asset bead reuses the accepted Embarked Transport unchanged and
regenerates two subjects one at a time in this order:

1. `unit-original-patrol-boat` establishes the small motor-warship language and
   ordinary armed naval scale;
2. `unit-original-battleship` establishes the larger armored, multi-turret
   capital-ship exception.

Submit, receive, and review Patrol Boat before requesting Battleship. They are
not a batch. Each candidate is
inspected at source, enlarged, native display, 0.625x/1x/1.75x, DPR 1/2, on both
water types, all owner colors, over Port/Fish/Pearls, beside every other naval
piece and representative land units, selected/damaged/veteran/handled, in all
eight adjacent directions, and at a dense landing. Reject and regenerate before
continuing when silhouette, scale, camera, anchor, palette, edge quality,
transparency, overlap, or role reading fails. Review the unchanged transport
beside both replacements, but do not request or regenerate it.

## 6. PixelLab records and checked review

The checked-in recipe records for every source:

- exact asset ID, prompt, negative prompt, canvas, model/settings, and seed when
  supported;
- immutable reference IDs and hashes, requested output, source/output mapping,
  anchor, display scale, and deterministic processing;
- a job-specific request receipt under `art/pixellab/submissions/` saved before
  polling, with no credential or image payload;
- accepted provider output hash, final PNG hash, dimensions, alpha bounds,
  ground contact, and review disposition.

Credentials remain in environment variables and never enter source, prompts,
logs, receipts, manifests, evidence, or the tracker. Interrupted jobs use the
shared receipt-verified `resume-job` workflow. A successful provider response
is only a candidate and supplies no acceptance by itself.

Prompts cite the canonical chunky non-pixel 2D illustrated style, square-board
camera, northwest light, strong outline, broad flat/cel shading, restrained
detail, isolated subject, and the exact silhouette/function above. Negative
prompts reject pixel art, faux-3D, photorealism, painterly rendering, isometric
model renders, scenery, text, UI, baked shadows, extra subjects, excessive
foam/sparkles, cinematic lighting, gradients, and cropped or trimmed edges.

The asset package adds `npm run art:ruleset7-naval-review`. Its checked-in
review manifest and deterministic contact sheets verify exact inventory and
hashes; dimensions/anchors/scales/bounds; native and enlarged samples; water
seams/repetition/borders; resource/Port coexistence; retained historical
revision-6 three-unit provenance and receipts; revision-7 sequential
Patrol Boat/Battleship replacement evidence with the unchanged Transport
comparison; map hierarchy; fog/selection/ownership; UI reuse; supported
zoom/DPR; and an 11 x 11 dense coast plus 25 x 25 mixed fleet. It
fails on missing production bytes, placeholders, unregistered aliases,
credential material, stale evidence, or a conditional Navigation symbol without
its recorded failed-reuse evidence.

The asset worker runs this review plus the repository's ordinary asset gates.
The root reviews all eight accepted outputs at intended native size and enlarged
size before the art bead can close. Runtime registration belongs to the later
integration package; accepted art and manifests may land before gameplay wiring.
